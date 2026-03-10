-- Add stock tracking to products (NULL = unlimited/not tracked)
ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT NULL;

-- Add product reference to invoice items for stock deduction
ALTER TABLE invoice_items ADD COLUMN product_id UUID REFERENCES products(id);

-- Add portal token for customer self-service portal
ALTER TABLE customers ADD COLUMN portal_token TEXT UNIQUE;
