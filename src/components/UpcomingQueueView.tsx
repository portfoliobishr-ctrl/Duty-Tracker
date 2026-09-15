'use client';

import React, { useState, useEffect } from 'react';
import { dutyStore } from '@/lib/dutyStore';
import { PoolType } from '@/types/database';
import { 
  Utensils, 
  Compass, 
  CheckCircle2, 
  Clock, 
  Calendar,
  Users2,
  ChevronRight,
  ArrowRight,
  ArrowRightLeft,
  SkipForward
} from 'lucide-react';
import { SwapMemberModal } from './SwapMemberModal';
import { Student } from '@/types/database';

type TabType = 'food' | 'imamath' | 'haddad' | 'azan';

const ActionToggle = ({ onTrigger, label, activeColorClass = 'bg-emerald-600' }: { onTrigger: () => void, label: string, activeColorClass?: string }) => {
  const [isActive, setIsActive] = useState(false);
  
  const handleToggle = () => {
    if (isActive) return;
    setIsActive(true);
    onTrigger();
    setTimeout(() => setIsActive(false), 800);
  };
  
  return (
    <div className="flex items-center space-x-2" title="Force start next round (skips pending students)">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <button
        type="button"
        onClick={handleToggle}
        className={`${
          isActive ? activeColorClass : 'bg-slate-200'
        } relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none`}
      >
        <span
          className={`${
            isActive ? 'translate-x-4' : 'translate-x-0.5'
          } inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm`}
        />
      </button>
    </div>
  );
};

export const UpcomingQueueView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('food');
  const [cookingQueue, setCookingQueue] = useState<ReturnType<typeof dutyStore.getUpcomingCookingQueue>>([]);
  const [selectedImamPool, setSelectedImamPool] = useState<PoolType>('regular');
  const [asrQueue, setAsrQueue] = useState<ReturnType<typeof dutyStore.getUpcomingQueue> | null>(null);
  const [haddadQueue, setHaddadQueue] = useState<ReturnType<typeof dutyStore.getUpcomingQueue> | null>(null);
  const [ishaAzaanQueue, setIshaAzaanQueue] = useState<ReturnType<typeof dutyStore.getUpcomingQueue> | null>(null);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [selectedDutyForSwap, setSelectedDutyForSwap] = useState<{ date: string, members: Student[] } | null>(null);
  const [haddadEnabled, setHaddadEnabled] = useState(true);


  const toggleHaddad = () => {
    setHaddadEnabled(prev => !prev);
  };

  const refreshData = () => {
    setCookingQueue(dutyStore.getUpcomingCookingQueue(7));
    setAsrQueue(dutyStore.getUpcomingQueue('Asr', selectedImamPool));
    setHaddadQueue(dutyStore.getUpcomingQueue('Haddad'));
    setIshaAzaanQueue(dutyStore.getUpcomingQueue('Isha_Azaan'));
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = dutyStore.subscribe(refreshData);
    return () => unsubscribe();
  }, [selectedImamPool]);

  // Format date helper (e.g., "Today", "Tomorrow", "Fri, Sep 12")
  const formatDateLabel = (dateStr: string, isToday: boolean, idx: number) => {
    if (isToday || idx === 0) return 'Today';
    if (idx === 1) return 'Tomorrow';
    const parts = dateStr.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-8">
      
      {/* Top Tab Bar */}
      <div className="flex bg-slate-100 p-1.5 rounded-xl">
        <button
          onClick={() => setActiveTab('food')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'food' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Food
        </button>
        <button
          onClick={() => setActiveTab('imamath')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'imamath' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Imamath
        </button>
        <button
          onClick={() => setActiveTab('haddad')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'haddad' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Haddad
        </button>
        <button
          onClick={() => setActiveTab('azan')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'azan' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Azan
        </button>
      </div>

      {/* SECTION 1: Next Cooking Teams */}
      {activeTab === 'food' && (
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="p-4 border-b border-slate-100 bg-gradient-to-b from-slate-50/60 to-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Next Cooking Teams
              </h2>
              <p className="text-xs text-slate-500">
                Upcoming rotation order (Groups 1–8)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <ActionToggle 
              label="Skip Next Group" 
              onTrigger={() => dutyStore.forceNextCookingGroup()} 
              activeColorClass="bg-orange-600"
            />
          </div>
        </div>


        {/* Detailed Queue List */}
        <div className="divide-y divide-slate-100">
          {cookingQueue.map((item, idx) => {
            const memberNames = item.duty.is_no_duty 
              ? 'No cooking duty scheduled (Morning & Evening Off)' 
              : item.members.map((m) => m.name).join(', ') || 'Assigned Students';
            const isCompleted = item.duty.breakfast_completed && item.duty.lunch_completed;
            const isPartial = (item.duty.breakfast_completed || item.duty.lunch_completed) && !isCompleted;

            return (
              <div 
                key={item.duty.id}
                className={`p-3.5 flex items-center justify-between transition-colors ${
                  item.isToday 
                    ? item.duty.is_no_duty ? 'bg-purple-50/40' : 'bg-emerald-50/30' 
                    : 'hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    item.isToday 
                      ? item.duty.is_no_duty ? 'bg-purple-600 text-white' : 'bg-emerald-600 text-white' 
                      : item.duty.is_no_duty ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-900">
                        {item.duty.is_no_duty ? 'Friday Off (No Food Duty)' : item.group.name}
                      </span>
                      {item.isToday && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          item.duty.is_no_duty ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          Today
                        </span>
                      )}
                      {item.duty.is_no_duty ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                          Mess Off
                        </span>
                      ) : item.duty.is_holiday ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          Holiday
                        </span>
                      ) : null}
                    </div>
                    <p className={`text-xs font-medium mt-0.5 flex items-center space-x-2 ${item.duty.is_no_duty ? 'text-purple-600/80' : 'text-slate-500'}`}>
                      <span>{memberNames}</span>
                      {item.duty.is_temporary_swap && (
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded leading-none">
                          Swapped
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-right">
                  {!item.duty.is_no_duty && !isCompleted && (
                    <button 
                      onClick={() => {
                        setSelectedDutyForSwap({ date: item.duty.duty_date, members: item.members });
                        setSwapModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                      title="Swap Member"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div>
                    <span className="text-xs font-semibold text-slate-600 block">
                    {formatDateLabel(item.duty.duty_date, item.isToday, idx)}
                  </span>
                  <div className="mt-0.5">
                    {item.duty.is_no_duty ? (
                      <span className="text-[11px] font-bold text-purple-600">
                        Off Day
                      </span>
                    ) : isCompleted ? (
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center justify-end space-x-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Completed</span>
                      </span>
                    ) : isPartial ? (
                      <span className="text-[11px] font-semibold text-amber-600">
                        In Progress
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </section>
      )}

      {/* SECTION 2: Next Asr Imams (Alphabetical Queue) */}
      {activeTab === 'imamath' && (
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="p-4 border-b border-slate-100 bg-gradient-to-b from-slate-50/60 to-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Next Asr Imams
              </h2>
              <div className="text-xs text-slate-500 mt-0.5">
                Alphabetical rotation order • Round {asrQueue?.round.round_number}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <ActionToggle 
              label="Skip to Next Round" 
              onTrigger={() => dutyStore.forceNextRound(selectedImamPool, 'Asr')} 
              activeColorClass="bg-emerald-600"
            />
            {/* Pool Selector: Regular vs College */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/60 text-xs">
            <button
              type="button"
              onClick={() => setSelectedImamPool('regular')}
              className={`px-2 py-1 rounded-md font-semibold transition-all ${
                selectedImamPool === 'regular'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Regular (10)
            </button>
            <button
              type="button"
              onClick={() => setSelectedImamPool('college')}
              className={`px-2 py-1 rounded-md font-semibold transition-all ${
                selectedImamPool === 'college'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              College (6)
            </button>
          </div>
          </div>
        </div>


        {/* Detailed Queue List */}
        <div className="divide-y divide-slate-100">
          {asrQueue?.queue.map((item) => {
            return (
              <div 
                key={item.student.id}
                className={`p-3.5 flex items-center justify-between transition-colors ${
                  item.isNext 
                    ? 'bg-emerald-50/50' 
                    : item.hasCompletedRound 
                    ? 'bg-slate-50/40 opacity-75' 
                    : 'hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    item.isNext 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : item.hasCompletedRound 
                      ? 'bg-slate-200 text-slate-500' 
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {item.hasCompletedRound ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : item.orderIndex}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-bold ${
                        item.hasCompletedRound ? 'text-slate-500 line-through' : 'text-slate-900'
                      }`}>
                        {item.student.name}
                      </span>
                      {item.isNext && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Next Up
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      Group {item.student.group_id} • Alphabetical #{item.orderIndex}
                    </span>
                  </div>
                </div>

                <div>
                  {item.hasCompletedRound ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      Completed
                    </span>
                  ) : item.isNext ? (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Scheduled
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">
                      In Queue
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      )}

      {/* SECTION 3: Next Haddad Imams (Alphabetical Queue) */}
      {activeTab === 'haddad' && (
      <section className={`bg-white rounded-2xl border ${haddadEnabled ? 'border-slate-200/90 shadow-sm' : 'border-slate-200/50 shadow-none'} overflow-hidden transition-all duration-300`}>
        {/* Section Header */}
        <div className="p-4 border-b border-slate-100 bg-gradient-to-b from-slate-50/60 to-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${haddadEnabled ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-400'}`}>
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className={`text-sm font-bold leading-tight transition-colors ${haddadEnabled ? 'text-slate-900' : 'text-slate-400'}`}>
                Next Haddad Duties
              </h2>
              <p className="text-xs text-slate-500">
                {haddadEnabled ? `Unified Alphabetical Rotation • Round ${haddadQueue?.round.round_number}` : 'Haddad tracking is currently disabled'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {haddadEnabled && (
              <ActionToggle 
                label="Skip to Next Round" 
                onTrigger={() => dutyStore.forceNextRound('regular', 'Haddad')} 
                activeColorClass="bg-blue-600"
              />
            )}
            <button
              type="button"
            onClick={toggleHaddad}
            className={`${
              haddadEnabled ? 'bg-blue-600' : 'bg-slate-200'
            } relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none`}
            title={haddadEnabled ? "Disable Haddad Section" : "Enable Haddad Section"}
          >
            <span
              className={`${
                haddadEnabled ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </button>
          </div>
        </div>

        {/* Detailed Queue List */}
        {haddadEnabled && (
          <div className="divide-y divide-slate-100">
            {haddadQueue?.queue.map((item) => {
              return (
                <div 
                  key={item.student.id}
                  className={`p-3.5 flex items-center justify-between transition-colors ${
                    item.isNext 
                      ? 'bg-blue-50/50' 
                      : item.hasCompletedRound 
                      ? 'bg-slate-50/40 opacity-75' 
                      : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      item.isNext 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : item.hasCompletedRound 
                        ? 'bg-slate-200 text-slate-500' 
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {item.hasCompletedRound ? <CheckCircle2 className="w-4 h-4 text-blue-600" /> : item.orderIndex}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-bold ${
                          item.hasCompletedRound ? 'text-slate-500 line-through' : 'text-slate-900'
                        }`}>
                          {item.student.name}
                        </span>
                        {item.isNext && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                            Next Up
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">
                        Group {item.student.group_id} • Alphabetical #{item.orderIndex}
                      </span>
                    </div>
                  </div>

                  <div>
                    {item.hasCompletedRound ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        Completed
                      </span>
                    ) : item.isNext ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        Scheduled
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">
                        In Queue
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      )}

      {/* SECTION 4: Next Isha Azaan Imams (Alphabetical Queue) */}
      {activeTab === 'azan' && (
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="p-4 border-b border-slate-100 bg-gradient-to-b from-slate-50/60 to-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Next Isha Azaan Duties
              </h2>
              <p className="text-xs text-slate-500">
                Unified Alphabetical Rotation • Round {ishaAzaanQueue?.round.round_number}
              </p>
            </div>
          </div>

          <ActionToggle 
            label="Skip to Next Round" 
            onTrigger={() => dutyStore.forceNextRound('regular', 'Isha_Azaan')} 
            activeColorClass="bg-purple-600"
          />
        </div>

        {/* Detailed Queue List */}
        <div className="divide-y divide-slate-100">
          {ishaAzaanQueue?.queue.map((item) => {
            return (
              <div 
                key={item.student.id}
                className={`p-3.5 flex items-center justify-between transition-colors ${
                  item.isNext 
                    ? 'bg-purple-50/50' 
                    : item.hasCompletedRound 
                    ? 'bg-slate-50/40 opacity-75' 
                    : 'hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    item.isNext 
                      ? 'bg-purple-600 text-white shadow-xs' 
                      : item.hasCompletedRound 
                      ? 'bg-slate-200 text-slate-500' 
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {item.hasCompletedRound ? <CheckCircle2 className="w-4 h-4 text-purple-600" /> : item.orderIndex}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-bold ${
                        item.hasCompletedRound ? 'text-slate-500 line-through' : 'text-slate-900'
                      }`}>
                        {item.student.name}
                      </span>
                      {item.isNext && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                          Next Up
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      Group {item.student.group_id} • Alphabetical #{item.orderIndex}
                    </span>
                  </div>
                </div>

                <div>
                  {item.hasCompletedRound ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      Completed
                    </span>
                  ) : item.isNext ? (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      Scheduled
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">
                      In Queue
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      )}

      {selectedDutyForSwap && (
        <SwapMemberModal
          isOpen={swapModalOpen}
          onClose={() => {
            setSwapModalOpen(false);
            setTimeout(() => setSelectedDutyForSwap(null), 200);
          }}
          dutyDate={selectedDutyForSwap.date}
          currentMembers={selectedDutyForSwap.members}
          onSuccess={() => {
            refreshData();
            setSwapModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
