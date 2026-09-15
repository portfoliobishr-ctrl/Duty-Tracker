'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { 
  Database, 
  RotateCcw, 
  Compass,
  Calendar
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

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Logo & App Mark */}
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/20">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
                  DutyTracker
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Rotation
                </span>
              </div>
            </div>
          </div>

          {/* Right Date Badge */}
          <div className="flex items-center space-x-1.5 text-[11px] sm:text-xs text-slate-500 font-medium pl-3 pr-1.5 py-1 rounded-full bg-slate-100/80 border border-slate-200/60">
            <span suppressHydrationWarning className="text-slate-800 font-semibold whitespace-nowrap">{mounted ? formattedDate : ''}</span>
            <div className="relative flex items-center justify-center w-6 h-6 rounded-full hover:bg-slate-200 transition-colors">
              <input 
                type="date" 
                value={dutyStore.getTodayStr()}
                onChange={handleDateChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Change Date"
              />
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
