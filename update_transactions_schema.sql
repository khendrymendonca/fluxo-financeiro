-- Add savings_goal_id to transactions table
alter table transactions add column savings_goal_id uuid references savings_goals(id) on delete set null;
