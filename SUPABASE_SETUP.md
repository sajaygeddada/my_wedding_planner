# Wedding Planner — Supabase Setup Guide

## Step 1: Create a Supabase Project
1. Go to https://supabase.com → Sign Up (free)
2. Click "New Project"
3. Give it a name like "wedding-planner"
4. Choose a region close to you (Singapore is good for India)
5. Set a strong database password (save it!)
6. Click "Create new project" — wait ~2 mins

## Step 2: Create the Tables
Go to your project → SQL Editor → paste and run this:

```sql
-- Settings table (stores wedding details + budget)
create table settings (
  id integer primary key,
  bride text,
  groom text,
  date text,
  venue text,
  budget numeric default 0,
  created_at timestamp with time zone default now()
);

-- Tasks table
create table tasks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  priority text default 'medium',
  due_date date,
  notes text,
  done boolean default false,
  created_at timestamp with time zone default now()
);

-- Guests table
create table guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  section text default 'family',
  phone text,
  side text default 'bride',
  invited text default 'no',
  rsvp text default 'pending',
  plus integer default 0,
  note text,
  created_at timestamp with time zone default now()
);

-- Expenses table
create table expenses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric not null,
  category text,
  status text default 'paid',
  date date,
  created_at timestamp with time zone default now()
);

-- Notes table
create table notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  color text default 'cream',
  created_at timestamp with time zone default now()
);

-- Allow public read/write (for your personal use — no auth needed)
alter table settings enable row level security;
alter table tasks enable row level security;
alter table guests enable row level security;
alter table expenses enable row level security;
alter table notes enable row level security;

create policy "Allow all" on settings for all using (true) with check (true);
create policy "Allow all" on tasks for all using (true) with check (true);
create policy "Allow all" on guests for all using (true) with check (true);
create policy "Allow all" on expenses for all using (true) with check (true);
create policy "Allow all" on notes for all using (true) with check (true);
```

Click "Run" ✓

## Step 3: Get Your API Keys
1. Go to Project Settings (gear icon) → API
2. Copy:
   - **Project URL** (looks like https://xyzabc.supabase.co)
   - **anon / public** key (long string starting with eyJ...)

## Step 4: Paste Keys into app.js
Open `app.js` and replace lines 7-8:

```javascript
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

## Step 5: Deploy on Netlify
1. Go to https://netlify.com → "Sites"
2. Drag your `wedding-planner` folder onto the page
3. Done! Your site is live at a URL like https://your-wedding.netlify.app

## Step 6: Open from Any Device
Just go to your Netlify URL on your phone, tablet, laptop — data is always synced!

---

## That's it! 🎉
Your data now lives in Supabase (free tier = 500MB, unlimited for your needs).
Every change you make — on any device — syncs instantly.
