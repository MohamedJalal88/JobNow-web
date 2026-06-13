-- ============================================================
-- SECURITY FIXES MIGRATION - PART 2
-- Apply this in the Supabase SQL Editor (Settings > SQL Editor)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- FIX 1: Privilege Escalation via Mass Assignment (IDOR)
--
-- PROBLEM: The RLS UPDATE policy on `public.profiles` allows users
-- to update their own profile row but fails to restrict the columns.
-- This allows malicious users to change their `role` to 'contractor'
-- or fraudulently inflate `rating` and `jobs_done`.
--
-- FIX: Create a BEFORE UPDATE database trigger that silently
-- preserves the existing values of protected columns, completely
-- blocking any unauthorized changes from the client.
-- ─────────────────────────────────────────────────────────────

create or replace function public.protect_profile_columns()
returns trigger as $$
begin
  -- Prevent role modification
  if old.role is distinct from new.role then
    new.role = old.role;
  end if;
  
  -- Prevent rating modification
  if old.rating is distinct from new.rating then
    new.rating = old.rating;
  end if;
  
  -- Prevent jobs_done modification
  if old.jobs_done is distinct from new.jobs_done then
    new.jobs_done = old.jobs_done;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists enforce_profile_protection on public.profiles;

create trigger enforce_profile_protection
before update on public.profiles
for each row
execute function public.protect_profile_columns();


-- ─────────────────────────────────────────────────────────────
-- FIX 2: Unrestricted File Uploads to Storage
--
-- PROBLEM: Storage bucket policies enforced the path, but did not
-- restrict the file type. Attackers could upload malware (.exe) or
-- XSS payloads (.html) to the `avatars` and `resumes` buckets.
--
-- FIX: Recreate the INSERT/UPDATE policies to explicitly check
-- the `mimetype` stored in the object metadata.
-- ─────────────────────────────────────────────────────────────

-- Avatars: Only allow standard image formats
drop policy if exists "Authenticated Upload Avatars" on storage.objects;
drop policy if exists "Authenticated Update Avatars" on storage.objects;

create policy "Authenticated Upload Avatars"
  on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (metadata->>'mimetype' like 'image/%')
  );

create policy "Authenticated Update Avatars"
  on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and auth.uid() = owner
    and (storage.foldername(name))[1] = auth.uid()::text
    and (metadata->>'mimetype' like 'image/%')
  );

-- Resumes: Only allow PDFs and Documents
drop policy if exists "Authenticated Upload Resumes" on storage.objects;

create policy "Authenticated Upload Resumes"
  on storage.objects
  for insert
  with check (
    bucket_id = 'resumes'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      metadata->>'mimetype' = 'application/pdf' or
      metadata->>'mimetype' like 'application/msword' or
      metadata->>'mimetype' like 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  );


-- ─────────────────────────────────────────────────────────────
-- FIX 3: Broken Access Control on Direct Messaging
--
-- PROBLEM: The INSERT policy for `public.messages` solely checked
-- if `auth.uid() = sender_id`. Any user could message any other
-- user, enabling platform-wide spam and harassment.
--
-- FIX: Ensure a user can only send messages if there is a
-- corresponding `applications` relationship, or an existing
-- communication thread.
-- ─────────────────────────────────────────────────────────────

drop policy if exists "Users can send messages" on public.messages;

create policy "Users can send messages"
  on public.messages
  for insert
  with check (
    auth.uid() = sender_id
    and (
      -- Sender is worker, receiver is contractor for a job where worker applied
      exists (
        select 1 from public.applications a
        join public.jobs j on a.job_id = j.id
        where a.worker_id = sender_id and j.contractor_id = receiver_id
      )
      or
      -- Sender is contractor, receiver is worker who applied to sender's job
      exists (
        select 1 from public.applications a
        join public.jobs j on a.job_id = j.id
        where j.contractor_id = sender_id and a.worker_id = receiver_id
      )
      or 
      -- Allow replying to existing threads (if receiver has previously sent them a message)
      exists (
        select 1 from public.messages m 
        where m.sender_id = receiver_id and m.receiver_id = sender_id
      )
    )
  );

-- ============================================================
-- END OF SECURITY FIXES MIGRATION
-- ============================================================
