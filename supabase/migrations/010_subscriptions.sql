-- ============================================
-- 010: Subscription System & Super Admin
-- ============================================

-- Super Admins table (platform-level admins)
CREATE TABLE IF NOT EXISTS super_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ur TEXT DEFAULT '',
  description TEXT DEFAULT '',
  description_ur TEXT DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'PKR',
  interval TEXT NOT NULL DEFAULT 'monthly', -- monthly, yearly
  max_users INT DEFAULT 3,
  max_invoices_per_month INT DEFAULT 100,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Business Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'trialing',
    -- trialing, active, past_due, cancelled, expired
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  activated_by UUID REFERENCES auth.users(id), -- super admin who activated
  payment_method TEXT, -- manual, jazzcash, easypaisa, stripe
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id)
);

-- Helper: check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM super_admins WHERE user_id = auth.uid()
  );
$$;

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Super Admins: only super admins can read
CREATE POLICY "Super admins can view super_admins"
  ON super_admins FOR SELECT TO authenticated
  USING (is_super_admin());

-- Subscription Plans: everyone can read active plans, super admin can manage
CREATE POLICY "Anyone can view active plans"
  ON subscription_plans FOR SELECT TO authenticated
  USING (is_active = true OR is_super_admin());

CREATE POLICY "Super admin can insert plans"
  ON subscription_plans FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admin can update plans"
  ON subscription_plans FOR UPDATE TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admin can delete plans"
  ON subscription_plans FOR DELETE TO authenticated
  USING (is_super_admin());

-- Subscriptions: business owner can view own, super admin can manage all
CREATE POLICY "Business members can view own subscription"
  ON subscriptions FOR SELECT TO authenticated
  USING (
    business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid())
    OR is_super_admin()
  );

CREATE POLICY "Super admin can insert subscriptions"
  ON subscriptions FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));

CREATE POLICY "Super admin can update subscriptions"
  ON subscriptions FOR UPDATE TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admin can delete subscriptions"
  ON subscriptions FOR DELETE TO authenticated
  USING (is_super_admin());

-- Super admin can view ALL businesses (add policy to businesses table)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'businesses' AND policyname = 'Super admin can view all businesses'
  ) THEN
    CREATE POLICY "Super admin can view all businesses"
      ON businesses FOR SELECT TO authenticated
      USING (is_super_admin());
  END IF;
END $$;

-- Super admin can view ALL business_members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'business_members' AND policyname = 'Super admin can view all members'
  ) THEN
    CREATE POLICY "Super admin can view all members"
      ON business_members FOR SELECT TO authenticated
      USING (is_super_admin());
  END IF;
END $$;

-- ============================================
-- Seed default plans
-- ============================================
INSERT INTO subscription_plans (name, name_ur, description, description_ur, price, interval, max_users, max_invoices_per_month, features, sort_order) VALUES
  ('Free Trial', 'مفت آزمائش', '14-day free trial with all features', '14 دن کی مفت آزمائش تمام خصوصیات کے ساتھ', 0, 'monthly', 1, 50, '["All features", "1 user", "50 invoices/month"]', 0),
  ('Basic', 'بنیادی', 'For small businesses', 'چھوٹے کاروبار کے لیے', 2000, 'monthly', 3, 100, '["All features", "3 users", "100 invoices/month", "Email support"]', 1),
  ('Pro', 'پرو', 'For growing businesses', 'بڑھتے ہوئے کاروبار کے لیے', 5000, 'monthly', 10, 500, '["All features", "10 users", "500 invoices/month", "Priority support", "Custom branding"]', 2),
  ('Enterprise', 'انٹرپرائز', 'Unlimited everything', 'لامحدود سب کچھ', 15000, 'monthly', 999, 999999, '["All features", "Unlimited users", "Unlimited invoices", "Dedicated support", "Custom branding", "API access"]', 3)
ON CONFLICT DO NOTHING;
