
-- development_plans
CREATE TABLE development_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES team_members(id) ON DELETE CASCADE,
  created_by_member boolean DEFAULT true,
  status text DEFAULT 'draft',
  proposed_at timestamptz,
  approved_at timestamptz,
  leader_comment text,
  period_label text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE development_plans ENABLE ROW LEVEL SECURITY;

-- development_items
CREATE TABLE development_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES development_plans(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  status text DEFAULT 'pending',
  due_date date,
  completed_at timestamptz,
  leader_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE development_items ENABLE ROW LEVEL SECURITY;

-- RLS for development_plans

-- Liderado SELECT
CREATE POLICY "Linked member can view own plans"
ON development_plans FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM team_members tm
  WHERE tm.id = development_plans.member_id
  AND tm.linked_user_id = auth.uid()
));

-- Liderado INSERT
CREATE POLICY "Linked member can create own plans"
ON development_plans FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM team_members tm
  WHERE tm.id = development_plans.member_id
  AND tm.linked_user_id = auth.uid()
));

-- Liderado UPDATE
CREATE POLICY "Linked member can update own plans"
ON development_plans FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM team_members tm
  WHERE tm.id = development_plans.member_id
  AND tm.linked_user_id = auth.uid()
));

-- Leader SELECT
CREATE POLICY "Leader can view member plans"
ON development_plans FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN workspaces w ON w.id = t.workspace_id
  WHERE tm.id = development_plans.member_id
  AND w.owner_id = effective_user_id()
  AND w.is_active = true
));

-- Leader UPDATE (approve/comment only, no INSERT)
CREATE POLICY "Leader can update member plans"
ON development_plans FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN workspaces w ON w.id = t.workspace_id
  WHERE tm.id = development_plans.member_id
  AND w.owner_id = effective_user_id()
  AND w.is_active = true
));

-- RLS for development_items

-- Liderado SELECT
CREATE POLICY "Linked member can view own items"
ON development_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM development_plans dp
  JOIN team_members tm ON tm.id = dp.member_id
  WHERE dp.id = development_items.plan_id
  AND tm.linked_user_id = auth.uid()
));

-- Liderado INSERT
CREATE POLICY "Linked member can create own items"
ON development_items FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM development_plans dp
  JOIN team_members tm ON tm.id = dp.member_id
  WHERE dp.id = development_items.plan_id
  AND tm.linked_user_id = auth.uid()
));

-- Liderado UPDATE
CREATE POLICY "Linked member can update own items"
ON development_items FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM development_plans dp
  JOIN team_members tm ON tm.id = dp.member_id
  WHERE dp.id = development_items.plan_id
  AND tm.linked_user_id = auth.uid()
));

-- Leader SELECT
CREATE POLICY "Leader can view member items"
ON development_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM development_plans dp
  JOIN team_members tm ON tm.id = dp.member_id
  JOIN teams t ON t.id = tm.team_id
  JOIN workspaces w ON w.id = t.workspace_id
  WHERE dp.id = development_items.plan_id
  AND w.owner_id = effective_user_id()
  AND w.is_active = true
));

-- Leader UPDATE
CREATE POLICY "Leader can update member items"
ON development_items FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM development_plans dp
  JOIN team_members tm ON tm.id = dp.member_id
  JOIN teams t ON t.id = tm.team_id
  JOIN workspaces w ON w.id = t.workspace_id
  WHERE dp.id = development_items.plan_id
  AND w.owner_id = effective_user_id()
  AND w.is_active = true
));
