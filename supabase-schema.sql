-- ==============================================================================
-- STYLESENSE AI - SUPABASE DATABASE SCHEMA & ROW LEVEL SECURITY (RLS) POLICIES
-- Project ID: lvuzdklnwpkzfcusjuts
-- ==============================================================================
-- How to apply this in your Supabase Dashboard:
-- 1. Open your Supabase project: https://supabase.com/dashboard/project/lvuzdklnwpkzfcusjuts
-- 2. In the left navigation, click "SQL Editor"
-- 3. Click "New Query"
-- 4. Copy and paste the entire SQL script below
-- 5. Click "Run" (or Ctrl + Enter)
-- ==============================================================================

-- 1. Create the 'profiles' table linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  phone TEXT,
  preferred_style TEXT DEFAULT 'Minimal',
  palette TEXT DEFAULT 'Neutrals',
  address TEXT DEFAULT '402, Lotus Residency, 12th Main, Indiranagar, Bengaluru - 560038',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Grant table permissions to authenticated and service roles
GRANT ALL ON TABLE public.profiles TO postgres;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO anon;

-- 3. Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Row Level Security Policies: Ensure users can ONLY access & modify their own record
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 5. Auto-confirm Trigger: Auto-confirms any user email directly without sending verification emails
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS trigger AS $$
BEGIN
  NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.auto_confirm_new_user();

-- Auto-confirm any existing unconfirmed users
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email_confirmed_at IS NULL;

-- 6. Automatic Trigger: Creates a profile row in public.profiles when a new user registers in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, preferred_style, address)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'preferred_style', 'Minimal'),
    COALESCE(NEW.raw_user_meta_data->>'address', '402, Lotus Residency, 12th Main, Indiranagar, Bengaluru - 560038')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.profiles.phone),
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. Orders table for authenticated order history linked to user ID
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  items JSONB NOT NULL,
  total NUMERIC NOT NULL,
  status TEXT DEFAULT 'Confirmed & Processing',
  shipping_address TEXT,
  recipient_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT ALL ON TABLE public.orders TO postgres;
GRANT ALL ON TABLE public.orders TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.orders TO authenticated;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
CREATE POLICY "Users can insert own orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 8. Service Bookings table for fashion care appointments linked to user ID
CREATE TABLE IF NOT EXISTS public.service_bookings (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_name TEXT NOT NULL,
  category TEXT NOT NULL,
  booking_date DATE NOT NULL,
  status TEXT DEFAULT 'Confirmed Pickup',
  cost TEXT,
  notes TEXT,
  pickup_address TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT ALL ON TABLE public.service_bookings TO postgres;
GRANT ALL ON TABLE public.service_bookings TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.service_bookings TO authenticated;

ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own service bookings" ON public.service_bookings;
CREATE POLICY "Users can view own service bookings"
  ON public.service_bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own service bookings" ON public.service_bookings;
CREATE POLICY "Users can insert own service bookings"
  ON public.service_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
