'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { 
  Database, 
  RotateCcw, 
  Compass,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { dutyStore } from '@/lib/dutyStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';

interface HeaderProps {
  onOpenSupabaseModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSupabaseModal }) => {
  const [hasSupabase, setHasSupabase] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { showToast } = useToast();

  const selectedDate = useSyncExternalStore(
    (listener) => dutyStore.subscribe(listener),
    () => dutyStore.selectedDate,
    () => null
  );

  useEffect(() => {
    setMounted(true);
    setHasSupabase(isSupabaseConfigured());
  }, []);

  const handleReset = () => {
    if (confirm('Reset all sample data to default seed? (16 students, 8 groups, active Round 1)')) {
      dutyStore.resetToSeed();
      showToast('All sample data reset to default', 'info');
    }
  };

  const today = dutyStore.getToday();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dutyStore.setSelectedDate(e.target.value ? e.target.value : null);
  };

  const handlePrevDay = () => {
    const current = dutyStore.getToday();
    current.setDate(current.getDate() - 1);
    dutyStore.setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const current = dutyStore.getToday();
    current.setDate(current.getDate() + 1);
    dutyStore.setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleGoToday = () => {
    dutyStore.setSelectedDate(null);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 transition-all shrink-0">
      <div className="max-w-4xl mx-auto px-2 sm:px-6">
        <div className="flex items-center justify-between py-2 gap-2">
          
          {/* Logo & App Mark */}
          <div className="flex items-center justify-start gap-2 shrink-0">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/20">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
              DutyTracker
            </span>
          </div>

          {/* Right Date Navigation */}
          <div className="flex items-center space-x-0.5 bg-slate-100/80 rounded-full p-0.5 border border-slate-200/60 shrink-0">
            <button 
              onClick={handlePrevDay}
              className="p-1 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors shrink-0"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button 
              onClick={handleGoToday}
              className="px-2.5 py-1 rounded-full hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors shrink-0"
              title="Go to Today"
            >
              Today
            </button>

            <div className="relative flex items-center justify-center px-1.5 rounded-full hover:bg-slate-200 transition-colors cursor-pointer group shrink-0">
              <span suppressHydrationWarning className="text-slate-800 text-xs font-bold whitespace-nowrap group-hover:opacity-0 transition-opacity">
                {mounted ? formattedDate : ''}
              </span>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-emerald-600">
                <Calendar className="w-4 h-4" />
              </div>
              <input 
                type="date" 
                value={dutyStore.getTodayStr()}
                onChange={handleDateChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Pick Date"
              />
            </div>

            <button 
              onClick={handleNextDay}
              className="p-1 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors shrink-0"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
