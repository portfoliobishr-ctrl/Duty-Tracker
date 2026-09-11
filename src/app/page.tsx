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
    <div className="min-h-screen bg-slate-50/75 text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900 pb-24 sm:pb-12">
      {/* Streamlined Header */}
      <Header onOpenSupabaseModal={() => setSupabaseModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 pt-2 sm:pt-4">
        {/* Simplified 3-Tab Segmented Navigation */}
        <TabsNav activeTab={activeTab} onChangeTab={setActiveTab} />

        {isSyncing && (
          <div className="mt-6 flex items-center justify-center py-10 bg-white/50 rounded-2xl border border-slate-200 shadow-sm animate-pulse">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-slate-500">Syncing with database...</p>
            </div>
          </div>
        )}

        {/* Active Tab View */}
        <div className={`mt-3 sm:mt-4 transition-opacity duration-300 ${isSyncing ? 'opacity-0 hidden' : 'opacity-100'}`}>
          {activeTab === 'today' && <TodayOverview />}
          {activeTab === 'upcoming' && <UpcomingQueueView />}
          {activeTab === 'reports' && <StudentReportsView />}
        </div>
      </main>

      {/* Clean Minimal Desktop Footer */}
      <footer className="hidden sm:block border-t border-slate-200/80 bg-white/50 py-5 text-center text-xs text-slate-400 mt-auto">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between">
          <p className="font-semibold text-slate-500 text-xs">
            DutyTracker • 16 Students • 8 Cooking Teams
          </p>
          <p className="text-slate-400 text-[11px]">
            Minimalist Rotation System
          </p>
        </div>
      </footer>

      {/* Supabase Schema Modal */}
      <SupabaseModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
      />
    </div>
  );
}
