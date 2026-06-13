-- 1. Create Profiles Table (extends Supabase Auth Users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text,
  phone text,
  role text not null check (role in ('worker', 'contractor')),
  skill text,
  location text,
  avatar text,
  jobs_done integer default 0,
  rating numeric(3,2) default 5.0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Jobs Table
create table public.jobs (
  id uuid default gen_random_uuid() primary key,
  contractor_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text not null,
  skill text not null,
  distance_km numeric default 1.0,
  pay_per_day numeric not null,
  duration_days integer not null,
  workers_needed integer not null,
  location text not null,
  status text default 'open' check (status in ('open', 'active', 'completed')),
  escrow_status text default 'pending' check (escrow_status in ('pending', 'locked', 'released')),
  attendance_status text default 'pending_clockin' check (attendance_status in ('pending_clockin', 'clocked_in', 'clocked_out', 'no_show')),
  geofence_radius_meters integer default 100,
  qr_code_data text,
  compliance_status text default 'compliant',
  standby_workers_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Applications Table
create table public.applications (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  worker_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'applied' check (status in ('applied', 'shortlisted', 'hired', 'declined')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (job_id, worker_id)
);

-- 4. Create Messages Table
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  message_text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Create Trigger: Automatically create public profile on User Signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, phone, role, skill, location, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'role', 'worker'),
    new.raw_user_meta_data->>'skill',
    coalesce(new.raw_user_meta_data->>'location', ''),
    coalesce(new.raw_user_meta_data->>'avatar', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.messages enable row level security;

-- Setup basic Policies
create policy "Profiles are viewable by anyone" on public.profiles for select using (true);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

create policy "Jobs are viewable by anyone" on public.jobs for select using (true);
create policy "Contractors can insert/update their own jobs" on public.jobs for all using (auth.uid() = contractor_id);

create policy "Applications are viewable by involved users" on public.applications for select using (
  auth.uid() = worker_id or auth.uid() in (select contractor_id from public.jobs where id = job_id)
);
create policy "Workers can apply to jobs" on public.applications for insert with check (auth.uid() = worker_id);
create policy "Contractors can update application statuses" on public.applications for update using (
  auth.uid() in (select contractor_id from public.jobs where id = job_id)
);

create policy "Messages are viewable by sender or receiver" on public.messages for select using (
  auth.uid() = sender_id or auth.uid() = receiver_id
);
create policy "Users can send messages" on public.messages for insert with check (auth.uid() = sender_id);
