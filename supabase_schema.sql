-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ACCOUNTS TABLE
create table accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  bank text not null,
  balance numeric not null default 0,
  color text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table accounts enable row level security;

create policy "Users can view their own accounts" on accounts
  for select using (auth.uid() = user_id);

create policy "Users can insert their own accounts" on accounts
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own accounts" on accounts
  for update using (auth.uid() = user_id);

create policy "Users can delete their own accounts" on accounts
  for delete using (auth.uid() = user_id);


-- CREDIT CARDS TABLE
create table credit_cards (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  bank text not null,
  "limit" numeric not null default 0,
  due_day integer not null,
  closing_day integer not null,
  color text,
  history jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table credit_cards enable row level security;

create policy "Users can view their own cards" on credit_cards
  for select using (auth.uid() = user_id);

create policy "Users can insert their own cards" on credit_cards
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own cards" on credit_cards
  for update using (auth.uid() = user_id);

create policy "Users can delete their own cards" on credit_cards
  for delete using (auth.uid() = user_id);


-- TRANSACTIONS TABLE
create table transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  description text not null,
  amount numeric not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  date timestamp with time zone not null,
  account_id uuid references accounts(id) on delete set null,
  card_id uuid references credit_cards(id) on delete set null,
  invoice_date text, -- YYYY-MM
  is_invoice_payment boolean default false,
  is_recurring boolean default false,
  installments jsonb, -- { current, total, id }
  debt_id uuid, -- references debts(id) but circular dependency if created before, so uuid is fine or alter table later.
  recurrence text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table transactions enable row level security;

create policy "Users can view their own transactions" on transactions
  for select using (auth.uid() = user_id);

create policy "Users can insert their own transactions" on transactions
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own transactions" on transactions
  for update using (auth.uid() = user_id);

create policy "Users can delete their own transactions" on transactions
  for delete using (auth.uid() = user_id);


-- SAVINGS GOALS TABLE
create table savings_goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  target_amount numeric not null,
  current_amount numeric not null default 0,
  deadline timestamp with time zone,
  color text,
  icon text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table savings_goals enable row level security;

create policy "Users can view their own goals" on savings_goals
  for select using (auth.uid() = user_id);

create policy "Users can insert their own goals" on savings_goals
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own goals" on savings_goals
  for update using (auth.uid() = user_id);

create policy "Users can delete their own goals" on savings_goals
  for delete using (auth.uid() = user_id);


-- DEBTS TABLE
create table debts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  total_amount numeric not null,
  remaining_amount numeric not null,
  interest_rate numeric default 0,
  due_day integer,
  installments_left integer,
  monthly_payment numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table debts enable row level security;

create policy "Users can view their own debts" on debts
  for select using (auth.uid() = user_id);

create policy "Users can insert their own debts" on debts
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own debts" on debts
  for update using (auth.uid() = user_id);

create policy "Users can delete their own debts" on debts
  for delete using (auth.uid() = user_id);
