'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  Check, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  Server, 
  Terminal, 
  Table, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'overview' | 'schema' | 'instructions' | 'tables';

const SCHEMA_SQL = `-- ==============================================================================
-- STUDENT DUTY & PRAYER ROTATION SYSTEM - SUPABASE DATABASE SCHEMA
-- Modules: Dual-Schedule Cooking Duty (Regular 1-5 vs College 6-8) + 5-Prayer Imam Rotation
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
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
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

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooking_duties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imam_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imam_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on groups" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Allow public read on students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Allow public read on system_settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Allow public read on cooking_duties" ON public.cooking_duties FOR SELECT USING (true);
CREATE POLICY "Allow public read on prayer_slots" ON public.prayer_slots FOR SELECT USING (true);
CREATE POLICY "Allow public read on imam_rounds" ON public.imam_rounds FOR SELECT USING (true);
CREATE POLICY "Allow public read on imam_logs" ON public.imam_logs FOR SELECT USING (true);

CREATE POLICY "Allow write on cooking_duties" ON public.cooking_duties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow write on imam_logs" ON public.imam_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow write on imam_rounds" ON public.imam_rounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow write on students" ON public.students FOR ALL USING (true) WITH CHECK (true);

-- SEED 8 FOOD TEAMS & 16 STUDENTS
INSERT INTO public.groups (id, name, is_holiday_only, description) VALUES
(1, 'Group 1', false, 'Regular Cooking Team 1'),
(2, 'Group 2', false, 'Regular Cooking Team 2'),
(3, 'Group 3', false, 'Regular Cooking Team 3'),
(4, 'Group 4', false, 'Regular Cooking Team 4'),
(5, 'Group 5', false, 'Regular Cooking Team 5'),
(6, 'Group 6', true, 'College Team (Holidays/Weekends Only)'),
(7, 'Group 7', true, 'College Team (Holidays/Weekends Only)'),
(8, 'Group 8', true, 'College Team (Holidays/Weekends Only)')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_holiday_only = EXCLUDED.is_holiday_only, description = EXCLUDED.description;

INSERT INTO public.system_settings (id, default_holidays) VALUES (1, ARRAY[0]) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.prayer_slots (id, name, display_order) VALUES
(1, 'Asr', 1)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, display_order = EXCLUDED.display_order;

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

INSERT INTO public.imam_rounds (id, round_number, pool, status, started_at) VALUES
('22222222-0000-0000-0000-000000000001', 1, 'regular', 'active', now()),
('22222222-0000-0000-0000-000000000002', 1, 'college', 'active', now())
ON CONFLICT (id) DO NOTHING;`;

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setIsConfigured(isSupabaseConfigured());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SCHEMA_SQL);
      setCopiedSql(true);
      showToast('Schema SQL copied to clipboard', 'success');
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleCopyEnv = async () => {
    const envSnippet = `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key`;
    try {
      await navigator.clipboard.writeText(envSnippet);
      setCopiedEnv(true);
      showToast('.env template copied to clipboard', 'success');
      setTimeout(() => setCopiedEnv(false), 2500);
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleTestConnection = async () => {
    if (!supabase) {
      setTestResult({
        success: false,
        message: 'Supabase credentials are not configured in environment variables.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const { error } = await supabase.from('students').select('id', { count: 'exact', head: true });
      if (error) {
        setTestResult({
          success: false,
          message: `Connection test failed: ${error.message}. Make sure schema.sql has been executed.`,
        });
        showToast('Database connection failed', 'error');
      } else {
        setTestResult({
          success: true,
          message: 'Successfully connected to Supabase database! Tables and permissions verified.',
        });
        showToast('Supabase connection verified!', 'success');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown network or configuration error';
      setTestResult({
        success: false,
        message: `Connection failed: ${msg}`,
      });
      showToast('Connection error', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-900 animate-in slide-in-from-bottom-4 duration-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  Supabase Database Integration
                </h3>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  isConfigured 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {isConfigured ? 'Connected' : 'Local Storage Mode'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                PostgreSQL schema, real-time synchronization, and connection setup
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b border-slate-200/80 bg-slate-50/30 flex space-x-1 sm:space-x-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Overview & Status</span>
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'schema'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Schema SQL</span>
          </button>

          <button
            onClick={() => setActiveTab('instructions')}
            className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'instructions'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Setup Guide</span>
          </button>

          <button
            onClick={() => setActiveTab('tables')}
            className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'tables'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Tables ({6})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs text-slate-600">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border ${
                isConfigured 
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                  : 'bg-amber-50/60 border-amber-200 text-amber-950'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl mt-0.5 ${
                    isConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {isConfigured ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-slate-900 mb-1">
                      {isConfigured ? 'Supabase Credentials Detected' : 'Operating in Standalone Local Storage Mode'}
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-xs">
                      {isConfigured
                        ? 'Your application has environment variables configured for Supabase. You can verify live database connectivity below.'
                        : 'The application is currently saving duties, imam logs, and round progressions in browser LocalStorage. To persist across devices and multiple users, connect to Supabase.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Checklist Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <span className="font-bold text-slate-800 block text-xs">Connection Checklist</span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/70">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className={`w-4 h-4 ${isConfigured ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="font-medium text-slate-700">NEXT_PUBLIC_SUPABASE_URL</span>
                    </div>
                    <span className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                      isConfigured ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {isConfigured ? 'Configured' : 'Missing'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/70">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className={`w-4 h-4 ${isConfigured ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="font-medium text-slate-700">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
                    </div>
                    <span className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                      isConfigured ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {isConfigured ? 'Configured' : 'Missing'}
                    </span>
                  </div>
                </div>

                {/* Test Connection Button */}
                <div className="pt-1 flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={handleTestConnection}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Testing Connectivity...' : 'Test Connection'}</span>
                  </button>

                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all text-center"
                  >
                    <span>Supabase Dashboard</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Test Result alert */}
                {testResult && (
                  <div className={`p-3 rounded-xl border flex items-start gap-2 ${
                    testResult.success 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}>
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                    )}
                    <span className="text-xs leading-relaxed">{testResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SCHEMA SQL */}
          {activeTab === 'schema' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-slate-600 text-xs">
                  Run this SQL in your Supabase SQL Editor to create tables, indexes, and RLS policies:
                </p>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
                </button>
              </div>

              <div className="relative rounded-2xl bg-slate-900 text-slate-200 p-4 font-mono text-[11px] leading-relaxed max-h-[380px] overflow-y-auto border border-slate-800">
                <pre>{SCHEMA_SQL}</pre>
              </div>
            </div>
          )}

          {/* TAB 3: SETUP INSTRUCTIONS */}
          {activeTab === 'instructions' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px]">1</span>
                    <span>Create a Supabase Project</span>
                  </div>
                  <p className="text-slate-600 pl-7">
                    Visit <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-600 underline font-medium">supabase.com</a>, create a free organization and a project (e.g. &ldquo;duty-tracker&rdquo;).
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px]">2</span>
                      <span>Add Environment Variables</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyEnv}
                      className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1"
                    >
                      {copiedEnv ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedEnv ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-slate-600 pl-7 text-xs">
                    Create a <code className="font-mono text-[11px] bg-slate-200/70 px-1 py-0.5 rounded">.env.local</code> file in your project root with your Project URL and Anon Key:
                  </p>
                  <div className="ml-7 p-2.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px]">
                    <div>NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co</div>
                    <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px]">3</span>
                    <span>Execute the SQL Schema</span>
                  </div>
                  <p className="text-slate-600 pl-7">
                    Navigate to Supabase &rarr; SQL Editor &rarr; New query. Paste the content of <code className="font-mono text-[11px] bg-slate-200/70 px-1 py-0.5 rounded">supabase/schema.sql</code> and click <strong>Run</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px]">4</span>
                    <span>Restart Next.js Development Server</span>
                  </div>
                  <p className="text-slate-600 pl-7">
                    Restart your local server with <code className="font-mono text-[11px] bg-slate-200/70 px-1 py-0.5 rounded">npm run dev</code> to load the new environment variables.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TABLES */}
          {activeTab === 'tables' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
                <span className="font-bold text-slate-800 block mb-1">groups (8 total)</span>
                <p className="text-slate-500 text-[11px]">
                  Groups 1–5: Regular Working Day Teams. Groups 6–8: College Teams (Holidays & Weekends only).
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
                <span className="font-bold text-slate-800 block mb-1">students (16 total)</span>
                <p className="text-slate-500 text-[11px]">
                  16 active students distributed 2 per group for cooking & individual Imam duty.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
                <span className="font-bold text-slate-800 block mb-1">system_settings</span>
                <p className="text-slate-500 text-[11px]">
                  Configures default weekend/holiday days (e.g. Sunday [0] & Friday [5]).
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
                <span className="font-bold text-slate-800 block mb-1">cooking_duties</span>
                <p className="text-slate-500 text-[11px]">
                  Unified 1 row per date with holiday flag, breakfast/lunch completion states, and timestamps.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
                <span className="font-bold text-slate-800 block mb-1">prayer_slots (5 prayers)</span>
                <p className="text-slate-500 text-[11px]">
                  5 daily prayers: Fajr, Dhuhr, Asr, Maghrib, and Isha.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
                <span className="font-bold text-slate-800 block mb-1">imam_rounds</span>
                <p className="text-slate-500 text-[11px]">
                  Tracks rotation cycles (Round 1, 2, ...), auto-advancing when all 16 students lead.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
                <span className="font-bold text-slate-800 block mb-1">imam_logs</span>
                <p className="text-slate-500 text-[11px]">
                  Audit trail recording prayer name, student, substitutions, and external imams.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-[11px] text-slate-400">
            Database Schema • PostgreSQL & Supabase
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};