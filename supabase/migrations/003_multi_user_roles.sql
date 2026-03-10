-- ============================================
-- Phase 4: Multi-user Roles
-- Business members + invite system
-- ============================================

-- Role enum type
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'accountant', 'viewer');

-- ============================================
-- BUSINESS MEMBERS
-- ============================================
CREATE TABLE business_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'viewer',
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, user_id)
);

-- ============================================
-- BUSINESS INVITES
-- ============================================
CREATE TABLE business_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'viewer',
    token VARCHAR(64) NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    accepted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_business_members_user_id ON business_members(user_id);
CREATE INDEX idx_business_members_business_id ON business_members(business_id);
CREATE INDEX idx_business_invites_token ON business_invites(token);
CREATE INDEX idx_business_invites_email ON business_invites(email);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER business_members_updated_at
    BEFORE UPDATE ON business_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- MIGRATE EXISTING OWNERS
-- Insert current business owners into business_members
-- ============================================
INSERT INTO business_members (business_id, user_id, role)
SELECT id, user_id, 'owner'::user_role
FROM businesses
ON CONFLICT DO NOTHING;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get all business IDs the current user belongs to
CREATE OR REPLACE FUNCTION user_business_ids()
RETURNS SETOF UUID AS $$
    SELECT business_id FROM business_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user has one of the given roles for a business
CREATE OR REPLACE FUNCTION user_has_role(biz_id UUID, allowed_roles user_role[])
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM business_members
        WHERE business_id = biz_id
          AND user_id = auth.uid()
          AND role = ANY(allowed_roles)
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- ENABLE RLS ON NEW TABLES
-- ============================================
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_invites ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS: BUSINESS MEMBERS
-- ============================================

-- Members can view their own business's members
CREATE POLICY "Members can view business members"
    ON business_members FOR SELECT
    USING (business_id IN (SELECT user_business_ids()));

-- Only owner/admin can insert (invite) members
CREATE POLICY "Owner/admin can add members"
    ON business_members FOR INSERT
    WITH CHECK (user_has_role(business_id, ARRAY['owner', 'admin']::user_role[]));

-- Only owner/admin can update roles
CREATE POLICY "Owner/admin can update members"
    ON business_members FOR UPDATE
    USING (user_has_role(business_id, ARRAY['owner', 'admin']::user_role[]));

-- Only owner/admin can remove members (owner can't be removed via this)
CREATE POLICY "Owner/admin can remove members"
    ON business_members FOR DELETE
    USING (user_has_role(business_id, ARRAY['owner', 'admin']::user_role[])
           AND role != 'owner');

-- ============================================
-- RLS: BUSINESS INVITES
-- ============================================

-- Members can see invites for their business
CREATE POLICY "Members can view invites"
    ON business_invites FOR SELECT
    USING (business_id IN (SELECT user_business_ids()));

-- Owner/admin can create invites
CREATE POLICY "Owner/admin can create invites"
    ON business_invites FOR INSERT
    WITH CHECK (user_has_role(business_id, ARRAY['owner', 'admin']::user_role[]));

-- Owner/admin can delete invites
CREATE POLICY "Owner/admin can delete invites"
    ON business_invites FOR DELETE
    USING (user_has_role(business_id, ARRAY['owner', 'admin']::user_role[]));

-- Anyone can update invites (for accepting via token)
CREATE POLICY "Anyone can accept invites"
    ON business_invites FOR UPDATE
    USING (true);

-- ============================================
-- REWRITE EXISTING RLS POLICIES
-- Use business_members instead of businesses.user_id
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can manage own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can manage own customers" ON customers;
DROP POLICY IF EXISTS "Users can manage own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can manage own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can manage own payments" ON payments;

-- Drop expense policies from migration 002
DROP POLICY IF EXISTS "Users can manage own expense categories" ON expense_categories;
DROP POLICY IF EXISTS "Users can manage own expenses" ON expenses;

-- === BUSINESSES ===
-- Owner can still see their own business (for backward compat)
-- Members can see businesses they belong to
CREATE POLICY "Members can view businesses"
    ON businesses FOR SELECT
    USING (id IN (SELECT user_business_ids()) OR user_id = auth.uid());

CREATE POLICY "Owner can update business"
    ON businesses FOR UPDATE
    USING (user_has_role(id, ARRAY['owner', 'admin']::user_role[]));

CREATE POLICY "Users can create businesses"
    ON businesses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete business"
    ON businesses FOR DELETE
    USING (auth.uid() = user_id);

-- === CUSTOMERS ===
CREATE POLICY "Members can view customers"
    ON customers FOR SELECT
    USING (business_id IN (SELECT user_business_ids()));

CREATE POLICY "Members can create customers"
    ON customers FOR INSERT
    WITH CHECK (user_has_role(business_id, ARRAY['owner', 'admin', 'accountant']::user_role[]));

CREATE POLICY "Members can update customers"
    ON customers FOR UPDATE
    USING (user_has_role(business_id, ARRAY['owner', 'admin', 'accountant']::user_role[]));

CREATE POLICY "Owner/admin can delete customers"
    ON customers FOR DELETE
    USING (user_has_role(business_id, ARRAY['owner', 'admin']::user_role[]));

-- === INVOICES ===
CREATE POLICY "Members can view invoices"
    ON invoices FOR SELECT
    USING (business_id IN (SELECT user_business_ids()));

CREATE POLICY "Members can create invoices"
    ON invoices FOR INSERT
    WITH CHECK (user_has_role(business_id, ARRAY['owner', 'admin', 'accountant']::user_role[]));

CREATE POLICY "Members can update invoices"
    ON invoices FOR UPDATE
    USING (user_has_role(business_id, ARRAY['owner', 'admin', 'accountant']::user_role[]));

CREATE POLICY "Owner/admin can delete invoices"
    ON invoices FOR DELETE
    USING (user_has_role(business_id, ARRAY['owner', 'admin']::user_role[]));

-- === INVOICE ITEMS ===
CREATE POLICY "Members can view invoice items"
    ON invoice_items FOR SELECT
    USING (invoice_id IN (
        SELECT id FROM invoices WHERE business_id IN (SELECT user_business_ids())
    ));

CREATE POLICY "Members can create invoice items"
    ON invoice_items FOR INSERT
    WITH CHECK (invoice_id IN (
        SELECT id FROM invoices
        WHERE user_has_role(business_id, ARRAY['owner', 'admin', 'accountant']::user_role[])
    ));

CREATE POLICY "Members can update invoice items"
    ON invoice_items FOR UPDATE
    USING (invoice_id IN (
        SELECT id FROM invoices
        WHERE user_has_role(business_id, ARRAY['owner', 'admin', 'accountant']::user_role[])
    ));

CREATE POLICY "Owner/admin can delete invoice items"
    ON invoice_items FOR DELETE
    USING (invoice_id IN (
        SELECT id FROM invoices
        WHERE user_has_role(business_id, ARRAY['owner', 'admin']::user_role[])
    ));

-- === PAYMENTS ===
CREATE POLICY "Members can view payments"
    ON payments FOR SELECT
    USING (invoice_id IN (
        SELECT id FROM invoices WHERE business_id IN (SELECT user_business_ids())
    ));

CREATE POLICY "Members can create payments"
    ON payments FOR INSERT
    WITH CHECK (invoice_id IN (
        SELECT id FROM invoices
        WHERE user_has_role(business_id, ARRAY['owner', 'admin', 'accountant']::user_role[])
    ));

CREATE POLICY "Members can update payments"
    ON payments FOR UPDATE
    USING (invoice_id IN (
        SELECT id FROM invoices
        WHERE user_has_role(business_id, ARRAY['owner', 'admin', 'accountant']::user_role[])
    ));

CREATE POLICY "Owner/admin can delete payments"
    ON payments FOR DELETE
    USING (invoice_id IN (
        SELECT id FROM invoices
        WHERE user_has_role(business_id, ARRAY['owner', 'admin']::user_role[])
    ));

-- === EXPENSE CATEGORIES ===
CREATE POLICY "Members can view expense categories"
    ON expense_categories FOR SELECT
    USING (business_id IN (SELECT user_business_ids()));

CREATE POLICY "Members can create expense categories"
    ON expense_categories FOR INSERT
    WITH CHECK (user_has_role(business_id, ARRAY['owner', 'admin', 'accountant']::user_role[]));

CREATE POLICY "Members can update expense categories"
    ON expense_categories FOR UPDATE
    USING (user_has_role(business_id, ARRAY['owner', 'admin', 'accountant']::user_role[]));

CREATE POLICY "Owner/admin can delete expense categories"
    ON expense_categories FOR DELETE
    USING (user_has_role(business_id, ARRAY['owner', 'admin']::user_role[]));

-- === EXPENSES ===
CREATE POLICY "Members can view expenses"
    ON expenses FOR SELECT
    USING (business_id IN (SELECT user_business_ids()));

CREATE POLICY "Members can create expenses"
    ON expenses FOR INSERT
    WITH CHECK (user_has_role(business_id, ARRAY['owner', 'admin', 'accountant']::user_role[]));

CREATE POLICY "Members can update expenses"
    ON expenses FOR UPDATE
    USING (user_has_role(business_id, ARRAY['owner', 'admin', 'accountant']::user_role[]));

CREATE POLICY "Owner/admin can delete expenses"
    ON expenses FOR DELETE
    USING (user_has_role(business_id, ARRAY['owner', 'admin']::user_role[]));
