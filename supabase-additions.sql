-- 1. Add Coordinate Columns to Profiles and Jobs
alter table public.profiles 
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists resume_url text;

alter table public.jobs 
  add column if not exists latitude numeric,
  add column if not exists longitude numeric;

-- 2. Create Storage Buckets for Avatars and Resumes
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) 
values ('resumes', 'resumes', true)
on conflict (id) do nothing;

-- 3. Setup Storage Access Policies
create policy "Public Access Avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "Authenticated Upload Avatars" on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "Authenticated Update Avatars" on storage.objects for update using (bucket_id = 'avatars' and auth.uid() = owner);
create policy "Authenticated Delete Avatars" on storage.objects for delete using (bucket_id = 'avatars' and auth.uid() = owner);

create policy "Public Access Resumes" on storage.objects for select using (bucket_id = 'resumes');
create policy "Authenticated Upload Resumes" on storage.objects for insert with check (bucket_id = 'resumes' and auth.role() = 'authenticated');
create policy "Authenticated Delete Resumes" on storage.objects for delete using (bucket_id = 'resumes' and auth.uid() = owner);

-- 4. PostgreSQL function to merge a phone-created account and Google OAuth account
create or replace function public.merge_user_accounts(old_id uuid, new_id uuid)
returns void as $$
begin
  -- 1. Delete the new empty profile created by the trigger for the Google signup
  delete from public.profiles where id = new_id;
  
  -- 2. Update the old profile row ID to the new Google user ID
  update public.profiles set id = new_id where id = old_id;
  
  -- 3. Update all referenced tables to point to the new Google user ID
  update public.jobs set contractor_id = new_id where contractor_id = old_id;
  update public.applications set worker_id = new_id where worker_id = old_id;
  update public.messages set sender_id = new_id where sender_id = old_id;
  update public.messages set receiver_id = new_id where receiver_id = old_id;
  
  -- 4. Delete the old auth user to clean up auth.users
  delete from auth.users where id = old_id;
end;
$$ language plpgsql security definer;

-- 5. Create Notifications Table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  body text not null,
  type text not null check (type in ('job', 'accept', 'payment', 'chat')),
  unread boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) on Notifications
alter table public.notifications enable row level security;

-- Setup basic Policies for Notifications
create policy "Users can view their own notifications" 
  on public.notifications for select using (auth.uid() = user_id);

create policy "Users can update their own notifications" 
  on public.notifications for update using (auth.uid() = user_id);

create policy "Authenticated users can insert notifications" 
  on public.notifications for insert with check (auth.role() = 'authenticated');

-- 6. Enable Real-Time replication for Messages and Notifications
-- Note: If these table names are already in the publication, postgres will throw an error.
-- You can run these individually in the Supabase SQL Editor:
-- alter publication supabase_realtime add table public.messages;
-- alter publication supabase_realtime add table public.notifications;

-- 7. Add missing INSERT policy for public.profiles (needed for upsert during registration/update)
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);

