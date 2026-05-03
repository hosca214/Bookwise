-- Bookwise Database Schema
-- Run this in the Supabase SQL editor before anything else

create extension if not exists "uuid-ossp";

create table profiles (
  id uuid references auth.users primary key,
  practice_name text,
  industry text check (industry in ('coach','trainer','bodyworker')),
  vibe text default 'ethereal-sage',
  daily_pulse_time time default '17:00',
  google_drive_folder_id text,
  tax_rate numeric default 0.25,
  profit_pct numeric default 10,
  tax_pct numeric default 25,
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);

create table services (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  price numeric not null,
  duration_minutes int,
  is_active boolean default true
);

create table transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  date date not null,
  amount numeric not null,
  type text check (type in ('income','expense')),
  category_key text not null,
  notes text,
  is_personal boolean default false,
  source text default 'manual',
  external_id text,
  receipt_url text,
  receipt_filename text,
  pulse_matched boolean default false,
  ai_suggested_category text,
  ai_suggestion_reason text,
  created_at timestamptz default now()
);

create table daily_pulse (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  date date not null,
  sessions_given int default 0,
  hours_worked numeric default 0,
  miles_driven numeric default 0,
  unique(user_id, date)
);

create table buckets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  month date not null,
  profit_target numeric default 0,
  profit_funded numeric default 0,
  tax_target numeric default 0,
  tax_funded numeric default 0,
  ops_target numeric default 0,
  ops_funded numeric default 0,
  unique(user_id, month)
);

create table waitlist (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  created_at timestamptz default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table services enable row level security;
alter table transactions enable row level security;
alter table daily_pulse enable row level security;
alter table buckets enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own services" on services for all using (auth.uid() = user_id);
create policy "own transactions" on transactions for all using (auth.uid() = user_id);
create policy "own pulse" on daily_pulse for all using (auth.uid() = user_id);
create policy "own buckets" on buckets for all using (auth.uid() = user_id);

-- Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
