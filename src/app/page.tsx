'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { Header } from '@/components/Header';
import { TabsNav, TabId } from '@/components/TabsNav';
import { TodayOverview } from '@/components/TodayOverview';
import { UpcomingQueueView } from '@/components/UpcomingQueueView';
import { StudentReportsView } from '@/components/StudentReportsView';
import { SupabaseModal } from '@/components/SupabaseModal';
import { dutyStore } from '@/lib/dutyStore';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [supabaseModalOpen, setSupabaseModalOpen] = useState<boolean>(false);
  const isSyncing = useSyncExternalStore(
    (listener) => dutyStore.subscribe(listener),
    () => dutyStore.isSyncing,
    () => false
  );

  useEffect(() => {
    dutyStore.syncFromSupabase();
  }, []);

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-50 overflow-hidden text-slate-900 w-full max-w-md mx-auto box-border selection:bg-emerald-100 selection:text-emerald-900">
      {/* 1. Fixed Top Header */}
      <div className="shrink-0 z-10 px-2.5 sm:px-4 bg-white border-b border-slate-100 shadow-sm">
        <Header onOpenSupabaseModal={() => setSupabaseModalOpen(true)} />
      </div>

      {/* 2. Scrollable Content Area */}
      <main className="flex-1 overflow-y-auto overscroll-contain px-2.5 sm:px-4 py-4 space-y-4 pb-24">
        {/* Simplified 3-Tab Segmented Navigation (Desktop) */}
        <TabsNav activeTab={activeTab} onChangeTab={setActiveTab} />

        {isSyncing && (
          <div className="flex items-center justify-center py-10 bg-white/50 rounded-2xl border border-slate-200 shadow-sm animate-pulse">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-slate-500">Syncing with database...</p>
            </div>
          </div>
        )}

        {/* Active Tab View */}
        <div className={`transition-opacity duration-300 ${isSyncing ? 'opacity-0 hidden' : 'opacity-100'}`}>
          {activeTab === 'today' && <TodayOverview />}
          {activeTab === 'upcoming' && <UpcomingQueueView />}
          {activeTab === 'reports' && <StudentReportsView />}
        </div>
        
        {/* Clean Minimal Desktop Footer */}
        <footer className="hidden sm:block border-t border-slate-200/80 bg-slate-50 pt-5 pb-2 text-center text-xs text-slate-400 mt-6">
          <div className="max-w-2xl mx-auto px-4 flex items-center justify-between">
            <p className="font-semibold text-slate-500 text-xs">
              DutyTracker • 16 Students • 8 Cooking Teams
            </p>
            <p className="text-slate-400 text-[11px]">
              Minimalist Rotation System
            </p>
          </div>
        </footer>
      </main>

      {/* Supabase Schema Modal */}
      <SupabaseModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
      />
    </div>
  );
}
