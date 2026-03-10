-- ============================================
-- BillPro - Expense Tracking
-- ============================================

-- Expense categories table
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name_en VARCHAR(255) NOT NULL,
    name_ur VARCHAR(255) DEFAULT '',
    color VARCHAR(7) DEFAULT '#6b7280',
    icon VARCHAR(50) DEFAULT 'receipt',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    description_en VARCHAR(500) NOT NULL,
    description_ur VARCHAR(500) DEFAULT '',
    amount NUMERIC(12, 2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(20) DEFAULT 'cash'
        CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'online')),
    reference_number VARCHAR(100) DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own expense categories"
    ON expense_categories FOR ALL
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own expenses"
    ON expenses FOR ALL
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_expense_categories_business ON expense_categories(business_id);
CREATE INDEX idx_expenses_business ON expenses(business_id);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);

-- Trigger for updated_at
CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
