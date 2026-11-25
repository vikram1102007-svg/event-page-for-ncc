# Deployment & Setup Guide

## 1. Set Up Supabase (Free Tier)
1. Create a free project at [supabase.com](https://supabase.com).
2. In **SQL Editor -> New Query**, run `supabase/schema.sql` to create all tables (`profiles`, `events`, `teams`, `team_members`, `registrations`, `payments`, `attendance`, `certificates`, `announcements`, `schedule_items`), RPCs, and Row Level Security policies.
3. In **SQL Editor -> New Query**, run `supabase/seed.sql` to create the two sample events (**Firing — ₹400** and **Drill — ₹400**), sample schedule, and announcements.
4. In **Authentication -> URL Configuration**, set your deployed **Site URL** and add `https://<your-domain>/*` and `http://localhost:8000/*` under **Redirect URLs**.

## 2. Assign the First Admin Account
1. Open `login.html` and create an account for the organizer/admin.
2. Confirm the email if email verification is enabled in Supabase.
3. Run in Supabase **SQL Editor**:
```sql
update public.profiles
set role = 'admin'
where email = 'your-admin-email@college.edu';
```
4. Once one admin exists, that admin can also assign roles from **Admin Dashboard -> Settings**.

## 3. Configure Frontend Environment Variables
- Never expose your Supabase `service_role` key in frontend code.
- Local setup: update `scripts/config.js` (copied from `scripts/config.example.js`) with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and your college/NCC unit details.
- Hosting setup (Embarko, Netlify, Vercel, Cloudflare Pages): configure `SUPABASE_URL` and `SUPABASE_ANON_KEY` as environment variables and set build command to `npm run build` with publish directory `.`.

## 4. Payment Mode Note
- The system starts in clearly labelled **Demo Payment Mode**. Participants can submit a simulated demo payment reference (`DEMO-...`), while payment status remains `Pending` until verified by an authorized admin (`Paid` / `Failed` / `Refunded`).
- Real payment gateway integration (such as Razorpay) requires server-side order creation and backend webhook/signature verification with gateway secrets stored only on the backend.
