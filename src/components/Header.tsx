'use client';

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  RotateCcw, 
  Compass
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

  // Format date in English cleanly
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

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
          <div className="flex items-center space-x-1.5 text-[11px] sm:text-xs text-slate-500 font-medium px-2.5 sm:px-3 py-1 rounded-full bg-slate-100/80 border border-slate-200/60">
            <span suppressHydrationWarning className="text-slate-800 font-semibold">{mounted ? formattedDate : ''}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
