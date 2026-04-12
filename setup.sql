-- ============================================================
-- Voice Biomarker Disease Tracker — Supabase Schema
-- Run this in the Supabase SQL Editor to create all tables.
-- Safe to re-run: drops and recreates tables.
-- ============================================================

-- Drop old tables if they exist (order matters for foreign keys)
DROP TABLE IF EXISTS voice_records CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================================
-- 1. PROFILES TABLE — linked to Supabase auth.users
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
    id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email       TEXT,
    full_name   TEXT,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Auto-create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. VOICE RECORDS TABLE — stores every analysis result
-- ============================================================
CREATE TABLE IF NOT EXISTS voice_records (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

    -- ML result fields
    status          TEXT NOT NULL,             -- "Stable" / "Slight Change" / "High Risk"
    deviation_score FLOAT NOT NULL,            -- overall z-score
    health_score    INT,                       -- 0-100 inverted score for UI
    observations    JSONB DEFAULT '[]'::jsonb, -- list of clinical observation strings
    summary         TEXT,                      -- one-line overall assessment
    medical_note    TEXT,                      -- safety disclaimer
    explanation     JSONB DEFAULT '[]'::jsonb, -- top features: [{name, z_score}]

    -- Audio reference
    audio_url       TEXT,                      -- Public URL to Supabase Storage file
    audio_filename  TEXT,                      -- Original uploaded filename

    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user + time range queries
CREATE INDEX IF NOT EXISTS idx_voice_records_user_created
    ON voice_records (user_id, created_at DESC);

-- ============================================================
-- 3. ROW LEVEL SECURITY — users can only access their own data
-- ============================================================

-- Profiles: users can read/update only their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Voice Records: users can only CRUD their own records
ALTER TABLE voice_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own records"
    ON voice_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records"
    ON voice_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own records"
    ON voice_records FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- Storage Bucket (create manually in Supabase Dashboard)
-- Name: voice-recordings
-- Public: Yes
-- ============================================================
