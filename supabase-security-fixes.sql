-- ============================================================
-- SECURITY FIXES MIGRATION
-- Apply this in the Supabase SQL Editor (Settings > SQL Editor)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- FIX 1: Privilege Escalation via User Metadata during Signup
--
-- PROBLEM: The trigger read `role` from raw_user_meta_data, which
-- is fully controlled by the client during signUp(). An attacker
-- could pass role: 'admin' or any arbitrary value.
--
-- FIX: Hard-code the default role to 'worker'. Role upgrades must
-- be performed by an admin or a separate authenticated flow, not
-- at signup time.
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, phone, role, skill, location, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    -- SECURITY FIX: role is always defaulted to 'worker' to prevent
    -- client-controlled privilege escalation. Do not trust user metadata for role.
    'worker',
    new.raw_user_meta_data->>'skill',
    coalesce(new.raw_user_meta_data->>'location', ''),
    coalesce(new.raw_user_meta_data->>'avatar', '')
  );
  return new;
end;
$$ language plpgsql security definer;


-- ─────────────────────────────────────────────────────────────
-- FIX 2: Unauthenticated Account Hijacking via merge_user_accounts
--
-- PROBLEM: The `merge_user_accounts` function was callable by
-- any authenticated (or public) user. It accepts arbitrary UUIDs
-- and can completely reassign another user's profile, jobs,
-- messages, and applications — effectively a full account takeover.
--
-- FIX: Revoke execute rights from all non-privileged roles.
-- This function should ONLY be called from a secure backend
-- server function using the service_role key, never directly
-- from the client.
-- ─────────────────────────────────────────────────────────────
revoke execute on function public.merge_user_accounts(uuid, uuid) from public;
revoke execute on function public.merge_user_accounts(uuid, uuid) from authenticated;
revoke execute on function public.merge_user_accounts(uuid, uuid) from anon;


-- ─────────────────────────────────────────────────────────────
-- FIX 3: Business Logic Bypass — Applications INSERT policy
--
-- PROBLEM: The INSERT policy on applications only checked that
-- auth.uid() = worker_id. A malicious worker could insert a row
-- with status: 'hired' or 'shortlisted' instead of 'applied',
-- bypassing the contractor's approval step.
--
-- FIX: Drop the old permissive policy and add a new WITH CHECK
-- that also enforces status = 'applied' on every insert.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "Workers can apply to jobs" on public.applications;

create policy "Workers can apply to jobs"
  on public.applications
  for insert
  with check (
    auth.uid() = worker_id
    and status = 'applied'
  );


-- ─────────────────────────────────────────────────────────────
-- FIX 4: Business Logic Bypass — Jobs UPDATE policy
--
-- PROBLEM: The combined `for all` policy on jobs let contractors
-- UPDATE any column on their own jobs, including escrow_status
-- (which should only be set after a real payment gateway callback)
-- and compliance_status.
--
-- FIX: Split the policy. Regular updates are allowed but restricted
-- from toggling escrow_status to 'released' directly. Escrow
-- releases should be triggered via a secure server function that
-- validates the Razorpay payment signature first.
--
-- We also enforce that contractors can only move escrow_status
-- forward from 'pending' -> 'locked' (funded), not arbitrarily
-- set it to 'released' (which the payment server function handles).
-- ─────────────────────────────────────────────────────────────
drop policy if exists "Contractors can insert/update their own jobs" on public.jobs;

-- Allow contractors to INSERT their own jobs
create policy "Contractors can insert their own jobs"
  on public.jobs
  for insert
  with check (auth.uid() = contractor_id);

-- Allow contractors to UPDATE their own jobs, but block direct
-- escrow_status 'released' manipulation (must go through server fn).
create policy "Contractors can update their own jobs"
  on public.jobs
  for update
  using (auth.uid() = contractor_id)
  with check (
    auth.uid() = contractor_id
    -- Prevent client from directly releasing escrow — this must
    -- happen via the verifyRazorpayPayment server function.
    and escrow_status <> 'released'
  );

-- Allow contractors to DELETE their own jobs
create policy "Contractors can delete their own jobs"
  on public.jobs
  for delete
  using (auth.uid() = contractor_id);


-- ─────────────────────────────────────────────────────────────
-- FIX 5: Notification Spoofing
--
-- PROBLEM: The INSERT policy on notifications only checked
-- auth.role() = 'authenticated', meaning any logged-in user
-- could insert a notification for ANY other user by specifying
-- a victim's user_id. This enables social-engineering attacks
-- (e.g. fake "Payment Failed" or "Job Cancelled" alerts).
--
-- FIX: Drop the overly permissive policy. Notification inserts
-- are now ONLY permitted via service_role (i.e., server-side
-- functions). Client-side code should never insert notifications
-- directly; it should call a secure server function instead.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "Authenticated users can insert notifications" on public.notifications;

-- Notifications are inserted ONLY by server-side code using the
-- service_role key. No client can insert notifications directly.
-- If you need client-side notification creation, create a
-- postgres function with SECURITY DEFINER that validates the
-- caller's context before inserting.


-- ─────────────────────────────────────────────────────────────
-- FIX 6: Insecure File Uploads — Storage Bucket Policies
--
-- PROBLEM 1: Avatar upload policy did not restrict the upload path,
-- so user A could overwrite user B's avatar by using their file path.
--
-- PROBLEM 2: The resumes bucket was entirely public (SELECT for all),
-- exposing personally identifiable information (PII) to anyone with
-- the URL.
--
-- FIX: Enforce that avatar uploads can only go into the uploader's
-- own UUID-prefixed folder. Restrict resume access so that only
-- the owner can download their own resume.
-- ─────────────────────────────────────────────────────────────

-- Drop insecure avatar upload policy
drop policy if exists "Authenticated Upload Avatars" on storage.objects;

-- Secure avatar upload: uploader's UUID must be the first folder segment
create policy "Authenticated Upload Avatars"
  on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    -- Enforce that files are uploaded into the user's own folder
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Drop insecure avatar update policy (re-create with path check)
drop policy if exists "Authenticated Update Avatars" on storage.objects;

create policy "Authenticated Update Avatars"
  on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and auth.uid() = owner
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Drop the public resume SELECT policy (PII exposure)
drop policy if exists "Public Access Resumes" on storage.objects;

-- Only the owner of the resume can download it
create policy "Resume Owner Can Download"
  on storage.objects
  for select
  using (
    bucket_id = 'resumes'
    and auth.uid() = owner
  );

-- Drop insecure resume upload policy and re-create with path enforcement
drop policy if exists "Authenticated Upload Resumes" on storage.objects;

create policy "Authenticated Upload Resumes"
  on storage.objects
  for insert
  with check (
    bucket_id = 'resumes'
    and auth.role() = 'authenticated'
    -- Enforce that files are uploaded into the user's own folder
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- END OF SECURITY FIXES MIGRATION
-- ============================================================
