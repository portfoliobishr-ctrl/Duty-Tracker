-- ==============================================================================
-- STUDENT DUTY & PRAYER ROTATION SYSTEM - SUPABASE DATABASE SCHEMA
-- Modules: Dual-Schedule Cooking + Asr-Only Dual-Pool Alphabetical Imam Rotation
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. GROUPS TABLE (8 Groups: 1-5 Regular Teams, 6-8 College Teams)
CREATE TABLE IF NOT EXISTS public.groups (
    id INTEGER PRIMARY KEY CHECK (id >= 1 AND id <= 8),
    name VARCHAR(50) NOT NULL,
    is_holiday_only BOOLEAN DEFAULT false NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. STUDENTS TABLE (16 Students total, 2 per group)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    group_id INTEGER REFERENCES public.groups(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT   
);

-- 3. SYSTEM SETTINGS TABLE (Default holidays: 0 = Sun)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id INTEGER PRIMARY KEY,
    default_holidays INTEGER[] DEFAULT ARRAY[0] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. COOKING DUTIES TABLE (Unified 1 row per date with dual meal status)
CREATE TABLE IF NOT EXISTS public.cooking_duties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    duty_date DATE UNIQUE NOT NULL,
    group_id INTEGER REFERENCES public.groups(id) ON DELETE SET NULL,
    is_holiday BOOLEAN DEFAULT false NOT NULL,
    is_no_duty BOOLEAN DEFAULT false NOT NULL,
    breakfast_completed BOOLEAN DEFAULT false NOT NULL,
    breakfast_completed_at TIMESTAMPTZ,
    lunch_completed BOOLEAN DEFAULT false NOT NULL,
    lunch_completed_at TIMESTAMPTZ,
    active_student_ids UUID[] DEFAULT NULL,
    is_temporary_swap BOOLEAN DEFAULT false NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. PRAYER SLOTS TABLE (Single Prayer Scope: Asr Only)
CREATE TABLE IF NOT EXISTS public.prayer_slots (
    id INTEGER PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL CHECK (name IN ('Asr')),
    display_order INTEGER NOT NULL UNIQUE
);

-- 6. IMAM ROUNDS TABLE (Dual Pools: 'regular' for 10 students, 'college' for 6 students)
CREATE TABLE IF NOT EXISTS public.imam_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_number SERIAL UNIQUE,
    pool VARCHAR(20) DEFAULT 'regular' NOT NULL CHECK (pool IN ('regular', 'college')),
    status VARCHAR(20) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'completed')),
    started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. IMAM LOGS TABLE (Asr prayer audit trail)
CREATE TABLE IF NOT EXISTS public.imam_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES public.imam_rounds(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    prayer_name VARCHAR(20) DEFAULT 'Asr' NOT NULL CHECK (prayer_name = 'Asr'),
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('completed', 'replaced', 'external_imam', 'none', 'led', 'absent_replaced')),
    replacement_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_students_group ON public.students(group_id);
CREATE INDEX IF NOT EXISTS idx_cooking_duties_date ON public.cooking_duties(duty_date);
CREATE INDEX IF NOT EXISTS idx_cooking_duties_group ON public.cooking_duties(group_id);
CREATE INDEX IF NOT EXISTS idx_imam_rounds_pool ON public.imam_rounds(pool);
CREATE INDEX IF NOT EXISTS idx_imam_logs_round ON public.imam_logs(round_id);
CREATE INDEX IF NOT EXISTS idx_imam_logs_student ON public.imam_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_imam_logs_date ON public.imam_logs(date);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooking_duties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imam_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imam_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all duty data
CREATE POLICY "Allow public read on groups" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Allow public read on students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Allow public read on system_settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Allow public read on cooking_duties" ON public.cooking_duties FOR SELECT USING (true);
CREATE POLICY "Allow public read on prayer_slots" ON public.prayer_slots FOR SELECT USING (true);
CREATE POLICY "Allow public read on imam_rounds" ON public.imam_rounds FOR SELECT USING (true);
CREATE POLICY "Allow public read on imam_logs" ON public.imam_logs FOR SELECT USING (true);

-- Allow public upsert/write
CREATE POLICY "Allow write on groups" ON public.groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow write on cooking_duties" ON public.cooking_duties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow write on imam_logs" ON public.imam_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow write on imam_rounds" ON public.imam_rounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow write on students" ON public.students FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- INITIAL SEED DATA
-- ==============================================================================

-- 1. Insert 8 Groups (1-5 Regular, 6-8 College Holiday Teams)
INSERT INTO public.groups (id, name, is_holiday_only, description) VALUES
(1, 'Group 1', false, 'Regular Cooking Team 1'),
(2, 'Group 2', false, 'Regular Cooking Team 2'),
(3, 'Group 3', false, 'Regular Cooking Team 3'),
(4, 'Group 4', false, 'Regular Cooking Team 4'),
(5, 'Group 5', false, 'Regular Cooking Team 5'),
(6, 'Group 6', true, 'College Team (Holidays/Weekends Only)'),
(7, 'Group 7', true, 'College Team (Holidays/Weekends Only)'),
(8, 'Group 8', true, 'College Team (Holidays/Weekends Only)')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name, 
    is_holiday_only = EXCLUDED.is_holiday_only, 
    description = EXCLUDED.description;

-- 2. Insert System Settings
INSERT INTO public.system_settings (id, default_holidays) VALUES
(1, ARRAY[0])
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Asr Prayer Slot
INSERT INTO public.prayer_slots (id, name, display_order) VALUES
(1, 'Asr', 1)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, display_order = EXCLUDED.display_order;

-- 4. Insert 16 Students (2 per group)
INSERT INTO public.students (id, name, group_id, is_active) VALUES
('11111111-0000-0000-0000-000000000001', 'Anfaz', 1, true),
('11111111-0000-0000-0000-000000000002', 'Fuad', 1, true),
('11111111-0000-0000-0000-000000000003', 'Swabah', 2, true),
('11111111-0000-0000-0000-000000000004', 'Muhammed', 2, true),
('11111111-0000-0000-0000-000000000005', 'Dilshad', 3, true),
('11111111-0000-0000-0000-000000000006', 'Razeel', 3, true),
('11111111-0000-0000-0000-000000000007', 'Nashid', 4, true),
('11111111-0000-0000-0000-000000000008', 'Nafil', 4, true),
('11111111-0000-0000-0000-000000000009', 'Shammas', 5, true),
('11111111-0000-0000-0000-000000000010', 'Sabith', 5, true),
('11111111-0000-0000-0000-000000000011', 'Hasir', 6, true),
('11111111-0000-0000-0000-000000000012', 'Nijad', 6, true),
('11111111-0000-0000-0000-000000000013', 'Shammas ALP', 7, true),
('11111111-0000-0000-0000-000000000014', 'Saddad', 7, true),
('11111111-0000-0000-0000-000000000015', 'Murshid', 8, true),
('11111111-0000-0000-0000-000000000016', 'Nijad', 8, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, group_id = EXCLUDED.group_id;

-- 5. Insert Initial Dual Pool Rounds (Pool A: Regular, Pool B: College)
INSERT INTO public.imam_rounds (id, round_number, pool, status, started_at) VALUES
('22222222-0000-0000-0000-000000000001', 1, 'regular', 'active', now()),
('22222222-0000-0000-0000-000000000002', 1, 'college', 'active', now())
ON CONFLICT (id) DO NOTHING;
