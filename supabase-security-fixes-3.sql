-- ============================================================
-- SECURITY FIXES MIGRATION - PART 3
-- Apply this in the Supabase SQL Editor (Settings > SQL Editor)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- FIX 1: Notification Spoofing (TC-NOTIF-01)
--
-- PROBLEM: The INSERT policy on public.notifications was dropped,
-- meaning clients can no longer insert notifications directly.
--
-- FIX: Create a SECURITY DEFINER function `insert_notification`
-- that verifies the sender (auth.uid()) is authorized to notify
-- the target user (p_user_id) based on application or chat
-- relationships.
-- ─────────────────────────────────────────────────────────────

create or replace function public.insert_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_type text
)
returns public.notifications as $$
declare
  v_caller uuid;
  v_notif public.notifications;
begin
  -- Get current authenticated user
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'Unauthorized';
  end if;

  -- Validate caller's relationship with target user
  if v_caller <> p_user_id then
    if not (
      -- Caller is worker, target is contractor for a job where caller applied
      exists (
        select 1 from public.applications a
        join public.jobs j on a.job_id = j.id
        where a.worker_id = v_caller and j.contractor_id = p_user_id
      )
      or
      -- Caller is contractor, target is worker who applied to caller's job
      exists (
        select 1 from public.applications a
        join public.jobs j on a.job_id = j.id
        where j.contractor_id = v_caller and a.worker_id = p_user_id
      )
      or
      -- Caller and target have an existing message exchange
      exists (
        select 1 from public.messages m
        where (m.sender_id = v_caller and m.receiver_id = p_user_id)
           or (m.sender_id = p_user_id and m.receiver_id = v_caller)
      )
    ) then
      raise exception 'Unauthorized: No active relationship with recipient %', p_user_id;
    end if;
  end if;

  -- Insert the notification
  insert into public.notifications (user_id, title, body, type, unread)
  values (p_user_id, p_title, p_body, p_type, true)
  returning * into v_notif;

  return v_notif;
end;
$$ language plpgsql security definer;

-- Grant execute access to authenticated users
grant execute on function public.insert_notification(uuid, text, text, text) to authenticated;


-- ─────────────────────────────────────────────────────────────
-- FIX 2: Sensitive Data Exposure on Profiles (TC-DATA-02)
--
-- PROBLEM: Anyone (including anonymous public users) could view
-- all columns of the `profiles` table.
--
-- FIX: Revoke global select from anon, and grant select on a
-- restricted set of safe columns only. Authenticated users and
-- service roles retain full access.
-- ─────────────────────────────────────────────────────────────

-- First, make sure the policy allows select (using true is fine as long as grants restrict columns)
drop policy if exists "Profiles are viewable by anyone" on public.profiles;
create policy "Profiles are viewable by anyone" on public.profiles for select using (true);

-- Revoke all select privileges from anon and public roles
revoke select on public.profiles from anon;
revoke select on public.profiles from public;

-- Grant select only on safe columns for anonymous/public users
grant select (id, name, role, avatar, skill, rating, jobs_done) on public.profiles to anon;

-- Explicitly grant full select to authenticated users and service_role
grant select on public.profiles to authenticated;
grant select on public.profiles to service_role;


-- ─────────────────────────────────────────────────────────────
-- FIX 3: File Type / Extension Validation (TC-FILE-01)
--
-- PROBLEM: The storage policy checked MIME types but didn't verify
-- file extensions. An attacker could upload an HTML file with
-- a forged image/jpeg MIME type to execute client-side XSS.
--
-- FIX: Re-create the INSERT/UPDATE policies to check the file extension.
-- ─────────────────────────────────────────────────────────────

-- Avatars RLS: Check both MIME type and image extension (.jpg, .jpeg, .png, .gif, .webp)
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
    and (
      right(lower(name), 4) in ('.jpg', '.png', '.gif') or
      right(lower(name), 5) in ('.jpeg', '.webp')
    )
  );

create policy "Authenticated Update Avatars"
  on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and auth.uid() = owner
    and (storage.foldername(name))[1] = auth.uid()::text
    and (metadata->>'mimetype' like 'image/%')
    and (
      right(lower(name), 4) in ('.jpg', '.png', '.gif') or
      right(lower(name), 5) in ('.jpeg', '.webp')
    )
  );

-- Resumes RLS: Check both MIME type and document extension (.pdf, .doc, .docx)
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
    and (
      right(lower(name), 4) in ('.pdf', '.doc') or
      right(lower(name), 5) = '.docx'
    )
  );

-- ============================================================
-- END OF SECURITY FIXES MIGRATION - PART 3
-- ============================================================
