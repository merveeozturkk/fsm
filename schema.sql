-- ==========================================
-- SERVISJET MULTI-TENANT VERİTABANI ŞEMASI
-- ==========================================

-- 1. Şirketler (Her servis işletmesi için izole kayıt)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_code TEXT UNIQUE NOT NULL,
    phone TEXT,
    subscription_tier TEXT DEFAULT 'trial', -- 'trial', 'standard', 'pro', 'yearly'
    subscription_status TEXT DEFAULT 'active', -- 'active', 'expired', 'canceled'
    trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '14 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Profiller / Kullanıcılar (Patron & Teknisyenler)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT CHECK (role IN ('owner', 'technician')) NOT NULL,
    vehicle_plate TEXT,
    push_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Müşteriler
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    district TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. İş Emirleri / Servis Çağrıları
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    technician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    job_code TEXT NOT NULL,
    device_type TEXT NOT NULL,
    brand_model TEXT,
    fault_description TEXT NOT NULL,
    status TEXT CHECK (status IN ('assigned', 'in_transit', 'in_progress', 'completed')) DEFAULT 'assigned',
    labor_cost NUMERIC DEFAULT 0,
    parts_cost NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    payment_method TEXT CHECK (payment_method IN ('nakit', 'havale', 'pos', 'garanti')),
    notes TEXT,
    photo_old_part TEXT,
    photo_new_part TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Fiyat & Yedek Parça Kataloğu
CREATE TABLE IF NOT EXISTS price_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Kombi', 'Klima', 'Beyaz Eşya', 'Genel'
    price NUMERIC NOT NULL,
    cost_price NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Mobil Kolaylık Kolonları (Tek Tabloda Hızlı Senkronizasyon)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_code TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS technician_name TEXT;

-- Şirket Abonelik Kolonları
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'trial';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '14 days');
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- GPS Lokasyon Doğrulama Kolonları
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS verified_location_lat NUMERIC;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS verified_location_lng NUMERIC;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS verified_address TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMP WITH TIME ZONE;
