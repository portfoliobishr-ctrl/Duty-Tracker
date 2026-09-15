'use client';

import React, { useState, useEffect } from 'react';
import { CookingDuty, Group, Student } from '@/types/database';
import { dutyStore } from '@/lib/dutyStore';
import { getRelativeDateString } from '@/lib/seedData';
import { useToast } from '@/context/ToastContext';
import { 
  Utensils, 
  Users, 
  Check, 
  Clock, 
  Coffee, 
  Shuffle, 
  Calendar,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const CookingDutyView: React.FC = () => {
  const [duties, setDuties] = useState<CookingDuty[]>([]);
  const [groups, setGroups] = useState<(Group & { members: Student[] })[]>([]);
  const [mounted, setMounted] = useState(false);
  const [reassignDate, setReassignDate] = useState<string | null>(null);

  const { showToast } = useToast();

  const loadData = () => {
    const list = dutyStore.ensureDutiesRange(-3, 10);
    setDuties(list);
    setGroups(dutyStore.getGroupsWithMembers());
  };

  useEffect(() => {
    setMounted(true);
    loadData();
    const unsubscribe = dutyStore.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const handleToggleMeal = async (dateStr: string, meal: 'breakfast' | 'lunch') => {
    try {
      const updated = await dutyStore.toggleMealCompletion(dateStr, meal);
      loadData();

      const isDone = meal === 'breakfast' ? updated.breakfast_completed : updated.lunch_completed;
      if (isDone) {
        try {
          confetti({
            particleCount: 30,
            spread: 40,
            origin: { y: 0.7 },
            colors: ['#059669', '#10b981'],
          });
        } catch {}
        showToast(`${meal === 'breakfast' ? 'Breakfast' : 'Lunch'} marked completed`, 'success');
      } else {
        showToast(`${meal === 'breakfast' ? 'Breakfast' : 'Lunch'} set to pending`, 'info');
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to update database', 'error');
    }
  };

  const handleToggleHolidayForDate = (dateStr: string, currentVal: boolean) => {
    const updated = dutyStore.toggleHoliday(dateStr, !currentVal);
    loadData();
    showToast(
      !currentVal
        ? `Holiday enabled for ${dateStr} (College Team assigned)`
        : `Regular working day enabled for ${dateStr}`,
      'info'
    );
  };

  const handleReassignGroup = (dateStr: string, newGroupId: number | null) => {
    if (newGroupId === null) {
      dutyStore.setNoFoodDuty(dateStr, true);
      showToast('Set to No Food Duty (Off Day)', 'info');
    } else {
      dutyStore.overrideCookingGroup(dateStr, newGroupId, 'Manual override');
      showToast(`Assigned to Group ${newGroupId}`, 'success');
    }
    setReassignDate(null);
    loadData();
  };

  const todayStr = getRelativeDateString(0);

  return (
    <div className="space-y-4 sm:space-y-5 max-w-2xl mx-auto pb-8">
      {/* Header Info */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Dual Cooking Duty Schedule
              </h2>
              <p className="text-xs text-slate-400">
                Regular Days (Groups 1–5) • Weekends (Groups 6–8 College) • Fridays (No Duty)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60">
              1–5 Regular
            </span>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200/60">
              6–8 College
            </span>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
              Fri Off
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Day Schedule Cards */}
      <div className="space-y-3">
        {duties.map((duty) => {
          const group = duty.group_id ? groups.find((g) => g.id === duty.group_id) : null;
          const isToday = duty.duty_date === todayStr;

          const dateObj = new Date(duty.duty_date + 'T00:00:00');
          const formattedHeader = dateObj.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });

          return (
            <div
              key={duty.duty_date}
              className={`rounded-3xl border transition-all p-4 sm:p-5 shadow-xs ${
                isToday
                  ? duty.is_no_duty 
                    ? 'bg-white border-purple-400/80 ring-3 ring-purple-400/10'
                    : 'bg-white border-emerald-500/80 ring-3 ring-emerald-500/10'
                  : duty.is_no_duty
                    ? 'bg-slate-50/50 border-slate-200/80'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
              }`}
            >
              {/* Card Top: Date, Holiday Badge & Reassign */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs sm:text-sm text-slate-900">
                    {formattedHeader}
                  </span>
                  {isToday && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-2xs">
                      Today
                    </span>
                  )}
                  {/* Holiday / No Duty Pill */}
                  {duty.is_no_duty ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                      Friday Off (No Food Duty)
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleHolidayForDate(duty.duty_date, duty.is_holiday)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-colors ${
                        duty.is_holiday
                          ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                      title="Click to toggle holiday status"
                    >
                      {duty.is_holiday ? 'Holiday (College Team)' : 'Regular Day'}
                    </button>
                  )}
                </div>

                {/* Assigned Group Badge & Override trigger */}
                <div className="relative flex items-center space-x-1.5">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                    duty.is_no_duty
                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                      : 'bg-amber-50 text-amber-900 border-amber-200/70'
                  }`}>
                    {duty.is_no_duty ? 'No Cooking Duty' : (group?.name || `Group ${duty.group_id}`)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setReassignDate(reassignDate === duty.duty_date ? null : duty.duty_date)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Override Group or Set Off"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </button>

                  {/* Dropdown Menu for Group Reassignment */}
                  {reassignDate === duty.duty_date && (
                    <div className="absolute right-0 top-8 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 p-2 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 px-2 uppercase tracking-wider block">
                        Reassign Duty:
                      </span>
                      <button
                        onClick={() => handleReassignGroup(duty.duty_date, null)}
                        className={`w-full text-left text-xs px-2.5 py-1.5 rounded-xl flex items-center justify-between ${
                          duty.is_no_duty
                            ? 'bg-purple-50 text-purple-800 font-bold'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span>No Food Duty</span>
                        <span className="text-[10px] text-purple-600 font-medium">Off Day</span>
                      </button>
                      <div className="border-t border-slate-100 my-1"></div>
                      {groups.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => handleReassignGroup(duty.duty_date, g.id)}
                          className={`w-full text-left text-xs px-2.5 py-1.5 rounded-xl flex items-center justify-between ${
                            !duty.is_no_duty && g.id === duty.group_id
                              ? 'bg-emerald-50 text-emerald-800 font-bold'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span>{g.name}</span>
                          <span className="text-[10px] text-slate-400">
                            {g.is_holiday_only ? 'College' : 'Regular'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Student Chefs or Off Description */}
              {duty.is_no_duty ? (
                <div className="py-2.5 px-3 my-1 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Friday Off:</span>
                  <span className="font-semibold text-slate-700">No student cooking duty (Morning & Evening Off)</span>
                </div>
              ) : (
                <div className="py-2.5 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px] font-medium">Student Chefs:</span>
                  <span className="font-bold text-slate-800">
                    {group?.members.map((m) => m.name).join(' & ') || '2 Students'}
                  </span>
                </div>
              )}

              {/* Meal Status / Buttons */}
              {duty.is_no_duty ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="p-3 rounded-2xl border border-slate-200/80 bg-white flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 rounded-xl bg-slate-100 text-slate-500">
                        <Coffee className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block text-slate-700">Morning Meal</span>
                        <span className="text-[10px] text-slate-400">Breakfast: No Duty</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                      Off
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl border border-slate-200/80 bg-white flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 rounded-xl bg-slate-100 text-slate-500">
                        <Utensils className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block text-slate-700">Evening Meal</span>
                        <span className="text-[10px] text-slate-400">Lunch: No Duty</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                      Off
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {/* Breakfast Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleMeal(duty.duty_date, 'breakfast')}
                    className={`p-3 rounded-2xl border text-left transition-all active:scale-98 flex items-center justify-between ${
                      duty.breakfast_completed
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                        : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-1.5 rounded-xl ${
                        duty.breakfast_completed ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-700'
                      }`}>
                        <Coffee className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block">Breakfast</span>
                        {duty.breakfast_completed_at && mounted && (
                          <span suppressHydrationWarning className="text-[10px] text-emerald-700 font-medium">
                            Done {new Date(duty.breakfast_completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      duty.breakfast_completed ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
                    }`}>
                      {duty.breakfast_completed ? 'Done' : 'Tap to Complete'}
                    </span>
                  </button>

                  {/* Lunch Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleMeal(duty.duty_date, 'lunch')}
                    className={`p-3 rounded-2xl border text-left transition-all active:scale-98 flex items-center justify-between ${
                      duty.lunch_completed
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                        : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-1.5 rounded-xl ${
                        duty.lunch_completed ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        <Utensils className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block">Lunch</span>
                        {duty.lunch_completed_at && mounted && (
                          <span suppressHydrationWarning className="text-[10px] text-emerald-700 font-medium">
                            Done {new Date(duty.lunch_completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      duty.lunch_completed ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
                    }`}>
                      {duty.lunch_completed ? 'Done' : 'Tap to Complete'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
