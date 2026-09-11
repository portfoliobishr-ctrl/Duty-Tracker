'use client';

import React from 'react';
import { 
  CalendarDays, 
  ListOrdered,
  BarChart3
} from 'lucide-react';

export type TabId = 'today' | 'upcoming' | 'reports';

interface TabsNavProps {
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
}

export const TabsNav: React.FC<TabsNavProps> = ({ activeTab, onChangeTab }) => {
  const tabs: { id: TabId; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'today', label: 'Today', icon: CalendarDays },
    { id: 'upcoming', label: 'Upcoming', icon: ListOrdered },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <>
      {/* Desktop / Tablet Segmented Control */}
      <div className="hidden sm:flex items-center justify-center my-4">
        <div className="bg-slate-200/70 p-1 rounded-2xl flex items-center space-x-1 shadow-inner border border-slate-200/60 max-w-md w-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-xl text-xs font-semibold transition-all duration-150 min-h-[44px] ${
                  isActive
                    ? 'bg-white text-emerald-950 shadow-sm shadow-slate-300/50 ring-1 ring-black/5 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Sticky Bottom Navigation Bar (Minimum 48px Touch Targets) */}
      <nav 
        aria-label="Mobile Navigation"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 px-3 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center min-h-[52px] py-1 px-2 rounded-2xl transition-all active:scale-95 ${
                  isActive
                    ? 'text-emerald-700 font-bold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    isActive ? 'bg-emerald-100/80 text-emerald-700 ring-1 ring-emerald-300/60' : 'text-slate-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight font-medium">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
