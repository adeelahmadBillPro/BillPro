-- ============================================
-- BillPro Database Schema
-- PKR Invoice & Billing System
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- BUSINESSES
-- ============================================
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name_en VARCHAR(255) NOT NULL,
    name_ur VARCHAR(255) DEFAULT '',
    address_en TEXT DEFAULT '',
    address_ur TEXT DEFAULT '',
    phone VARCHAR(20) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    ntn_number VARCHAR(50) DEFAULT '',
    logo_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CUSTOMERS
-- ============================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name_en VARCHAR(255) NOT NULL,
    name_ur VARCHAR(255) DEFAULT '',
    phone VARCHAR(20) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    address_en TEXT DEFAULT '',
    address_ur TEXT DEFAULT '',
    city_en VARCHAR(100) DEFAULT '',
    city_ur VARCHAR(100) DEFAULT '',
    balance NUMERIC(12, 2) DEFAULT 0, -- PKR balance
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVOICES
-- ============================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    subtotal NUMERIC(12, 2) DEFAULT 0,
    tax_percentage NUMERIC(5, 2) DEFAULT 0,
    tax_amount NUMERIC(12, 2) DEFAULT 0,
    discount NUMERIC(12, 2) DEFAULT 0,
    total NUMERIC(12, 2) DEFAULT 0, -- All amounts in PKR
    notes_en TEXT DEFAULT '',
    notes_ur TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, invoice_number)
);

-- ============================================
-- INVOICE ITEMS
-- ============================================
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description_en VARCHAR(500) NOT NULL,
    description_ur VARCHAR(500) DEFAULT '',
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0, -- PKR
    total NUMERIC(12, 2) NOT NULL DEFAULT 0, -- PKR
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYMENTS
-- ============================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL, -- PKR
    payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'online')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_number VARCHAR(100) DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Business policies: users can only access their own businesses
CREATE POLICY "Users can manage own businesses"
    ON businesses FOR ALL
    USING (auth.uid() = user_id);

-- Customer policies: users can access customers of their businesses
CREATE POLICY "Users can manage own customers"
    ON customers FOR ALL
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- Invoice policies
CREATE POLICY "Users can manage own invoices"
    ON invoices FOR ALL
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- Invoice items policies
CREATE POLICY "Users can manage own invoice items"
    ON invoice_items FOR ALL
    USING (invoice_id IN (
        SELECT i.id FROM invoices i
        JOIN businesses b ON i.business_id = b.id
        WHERE b.user_id = auth.uid()
    ));

-- Payment policies
CREATE POLICY "Users can manage own payments"
    ON payments FOR ALL
    USING (invoice_id IN (
        SELECT i.id FROM invoices i
        JOIN businesses b ON i.business_id = b.id
        WHERE b.user_id = auth.uid()
    ));

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_businesses_user_id ON businesses(user_id);
CREATE INDEX idx_customers_business_id ON customers(business_id);
CREATE INDEX idx_invoices_business_id ON invoices(business_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
