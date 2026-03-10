-- Activity log for tracking team actions
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,  -- 'created', 'updated', 'deleted', 'status_changed'
  entity_type TEXT NOT NULL,  -- 'invoice', 'customer', 'payment', 'expense', 'product', 'recurring'
  entity_id UUID,
  entity_label TEXT NOT NULL DEFAULT '',  -- e.g. "INV-001", "Customer Name"
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_business ON activity_log(business_id);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
  ON activity_log FOR SELECT
  USING (business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert activity"
  ON activity_log FOR INSERT
  WITH CHECK (business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));
