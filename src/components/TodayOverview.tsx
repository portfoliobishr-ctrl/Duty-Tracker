'use client';

import React, { useState, useEffect } from 'react';
import { 
  CookingDuty, 
  Student, 
  Group, 
  ImamLog,
  DailyImamState
} from '@/types/database';
import { dutyStore } from '@/lib/dutyStore';
import { getRelativeDateString, isFriday, isHolidayOrSunday } from '@/lib/seedData';
import { useToast } from '@/context/ToastContext';
import { 
  Utensils, 
  Compass, 
  Check, 
  CheckCircle2, 
  UserCheck, 
  Calendar,
  Sparkles,
  Users2,
  Clock3,
  Coffee,
  ArrowRightLeft
} from 'lucide-react';
import { PrayerLoggerModal } from './PrayerLoggerModal';
import { SwapMemberModal } from './SwapMemberModal';
import { PrayerDutyCard } from './PrayerDutyCard';
import confetti from 'canvas-confetti';

export const TodayOverview: React.FC = () => {
  const [todayDate] = useState<string>(() => getRelativeDateString(0));
  const [todayDuty, setTodayDuty] = useState<CookingDuty | null>(() => dutyStore.ensureDutyForDate(getRelativeDateString(0)));
  const [groups, setGroups] = useState<(Group & { members: Student[] })[]>(() => dutyStore.getGroupsWithMembers());
  const [todayAsrLog, setTodayAsrLog] = useState<ImamLog | null>(null);
  const [assignedAsr, setAssignedAsr] = useState<{
    student: Student | null;
    pool: 'regular' | 'college';
    isHoliday: boolean;
    queuePosition: number;
    totalInPool: number;
  } | null>(null);
  const [dailyImamState, setDailyImamState] = useState<DailyImamState | null>(() => dutyStore.getDailyImamState(getRelativeDateString(0)));

  // Modal for Substitute / No Imam
  const [prayerModalOpen, setPrayerModalOpen] = useState(false);
  const [activeModalDuty, setActiveModalDuty] = useState<'Asr' | 'Haddad' | 'Isha_Azaan'>('Asr');
  const [activePrayerTab, setActivePrayerTab] = useState<'Asr' | 'Haddad' | 'Isha_Azaan'>('Asr');
  const [swapModalOpen, setSwapModalOpen] = useState(false);

  const { showToast } = useToast();

  const refreshData = () => {
    const duty = dutyStore.ensureDutyForDate(todayDate);
    setTodayDuty(duty);
    setGroups(dutyStore.getGroupsWithMembers());

    const asrData = dutyStore.getAssignedDutyStudent(todayDate, 'Asr');
    setAssignedAsr(asrData);

    const asrLog = dutyStore.getImamLogs().find((l) => l.date === todayDate && l.prayer_name === 'Asr') || null;
    setTodayAsrLog(asrLog);

    setDailyImamState(dutyStore.getDailyImamState(todayDate));
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = dutyStore.subscribe(refreshData);
    return () => unsubscribe();
  }, [todayDate]);

  // Current cooking group & members
  const assignedCookingGroup = groups.find((g) => g.id === todayDuty?.group_id);
  let cookingMembers = assignedCookingGroup?.members || [];
  if (todayDuty?.active_student_ids && todayDuty.active_student_ids.length > 0) {
    const allSt = dutyStore.getStudents();
    cookingMembers = todayDuty.active_student_ids
      .map(id => allSt.find(s => s.id === id))
      .filter(Boolean) as Student[];
  }

  // Holiday Toggle
  const handleToggleHoliday = () => {
    if (!todayDuty) return;
    const newHolidayState = !todayDuty.is_holiday;
    const updated = dutyStore.toggleHoliday(todayDate, newHolidayState);
    setTodayDuty({ ...updated });
    refreshData();

    showToast(
      newHolidayState
        ? 'Switched to Holiday queue (College Students)'
        : 'Switched to Regular queue (Working Day)',
      'info'
    );
  };

  // 1-Tap Meal toggle (Breakfast or Lunch)
  const handleToggleMeal = (meal: 'breakfast' | 'lunch') => {
    const updated = dutyStore.toggleMealCompletion(todayDate, meal);
    setTodayDuty({ ...updated });

    const isNowDone = meal === 'breakfast' ? updated.breakfast_completed : updated.lunch_completed;
    if (isNowDone) {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#059669', '#10b981', '#34d399'],
        });
      } catch {}
      showToast(`${meal === 'breakfast' ? 'Breakfast' : 'Lunch'} marked done!`, 'success');
    } else {
      showToast(`${meal === 'breakfast' ? 'Breakfast' : 'Lunch'} marked pending`, 'info');
    }
  };

  // 1-Tap Mark Asr Led
  const handleMarkAsrLed = () => {
    const activeStudentId = dailyImamState?.acting_student_id || assignedAsr?.student?.id;
    if (!activeStudentId) return;

    if (dailyImamState?.acting_student_id) {
      dutyStore.logDuty({
        prayerName: 'Asr',
        date: todayDate,
        studentId: dailyImamState.assigned_student_id,
        status: 'absent_replaced',
        replacementStudentId: dailyImamState.acting_student_id,
        notes: 'Confirmed from Today action screen (Substitute)',
      });
    } else if (assignedAsr?.student) {
      dutyStore.logDuty({
        prayerName: 'Asr',
        date: todayDate,
        studentId: assignedAsr.student.id,
        status: 'completed',
        notes: 'Confirmed from Today action screen',
      });
    }

    try {
      confetti({
        particleCount: 50,
        spread: 65,
        origin: { y: 0.65 },
        colors: ['#047857', '#10b981', '#6ee7b7'],
      });
    } catch {}

    const allStudents = dutyStore.getStudents();
    const activeStudent = dailyImamState?.acting_student_id 
      ? allStudents.find(s => s.id === dailyImamState.acting_student_id)
      : assignedAsr?.student;

    showToast(`Asr prayer recorded for ${activeStudent?.name}`, 'success');
    refreshData();
  };

  // Format today cleanly (e.g., "Thursday, Sep 10")
  const formattedToday = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const isHoliday = todayDuty?.is_holiday || false;
  const isBreakfastDone = todayDuty?.breakfast_completed || false;
  const isLunchDone = todayDuty?.lunch_completed || false;
  const isAsrDone = todayAsrLog?.status === 'completed' || todayAsrLog?.status === 'led';
  const isNoFoodDuty = todayDuty?.is_no_duty || false;

  const allStudents = dutyStore.getStudents();
  const todayImamStudent = todayAsrLog
    ? ((todayAsrLog.status === 'replaced' || todayAsrLog.status === 'absent_replaced') && todayAsrLog.replacement_student_id
        ? allStudents.find((s) => s.id === todayAsrLog.replacement_student_id)
        : allStudents.find((s) => s.id === todayAsrLog.student_id))
    : assignedAsr?.student;

  const pendingSubstituteId = dailyImamState?.acting_student_id;
  const pendingSubstituteStudent = pendingSubstituteId ? allStudents.find(s => s.id === pendingSubstituteId) : null;
  const activeStudent = pendingSubstituteStudent || assignedAsr?.student;

  // Next Asr candidate for upcoming duty (after today)
  const tomorrowDate = getRelativeDateString(1);
  const settings = dutyStore.getSystemSettings();
  const isTomorrowHoliday = isHolidayOrSunday(tomorrowDate, settings.default_holidays);
  const tomorrowPool: 'regular' | 'college' = isTomorrowHoliday ? 'college' : 'regular';
  
  const tomorrowAsrQueue = dutyStore.getUpcomingQueue('Asr', tomorrowPool);
  const nextAsrQueueItem = tomorrowAsrQueue.queue.find((q) => q.isNext);
  const nextAsrCandidate = nextAsrQueueItem ? {
    student: nextAsrQueueItem.student,
    pool: tomorrowPool,
    round: tomorrowAsrQueue.round,
    queuePosition: nextAsrQueueItem.orderIndex,
    totalInPool: tomorrowAsrQueue.queue.length,
  } : null;

  // Next Cooking queue item (used in action cards)
  const upcomingCookingQueue = dutyStore.getUpcomingCookingQueue(7);
  const nextCookingItem = upcomingCookingQueue.find((item) => !item.isToday && !item.duty.is_no_duty);

  // Stable label for tomorrow's team type — use pre-computed isTomorrowHoliday to avoid SSR/client mismatch
  const nextCookingTeamLabel = isTomorrowHoliday ? 'College Team' : 'Regular Team';

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-6">
      
      {/* 1. Holiday Switch: Clean single toggle */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-sm flex items-center justify-between transition-all">
        <div className="flex items-center space-x-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            isNoFoodDuty ? 'bg-purple-100 text-purple-700' : isHoliday ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
          }`}>
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-slate-900">
                {isNoFoodDuty ? 'Friday Routine' : 'Holiday Today?'}
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                isNoFoodDuty
                  ? 'bg-purple-100 text-purple-800'
                  : isHoliday 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-emerald-100/70 text-emerald-800'
              }`}>
                {isNoFoodDuty ? 'No Food Duty Day' : isHoliday ? 'College Teams' : 'Regular Teams'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isNoFoodDuty 
                ? 'Mess off day • No morning or evening cooking duty' 
                : isHoliday ? 'Using College students schedule' : 'Standard working day rotation'}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          type="button"
          onClick={handleToggleHoliday}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
            isHoliday ? 'bg-amber-500' : 'bg-slate-300'
          }`}
          aria-label="Toggle Holiday"
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
              isHoliday ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* 2. Today's Cooking Card */}
      {isNoFoodDuty ? (
        <section className="bg-white rounded-2xl border border-purple-200/90 shadow-sm overflow-hidden transition-all">
          {/* Card Header */}
          <div className="p-4 border-b border-purple-100 bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
                <Utensils className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
                  Friday Routine
                </span>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  No Food Duty Today
                </h2>
              </div>
            </div>

            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200/60">
              Friday Off
            </span>
          </div>

          {/* Meals Status Banner */}
          <div className="p-4 space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/60">
                  <Coffee className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <span className="text-slate-400 text-[10px] block">Morning Meal</span>
                    <span className="font-bold text-slate-900">Breakfast: No Duty</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/60">
                  <Utensils className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <span className="text-slate-400 text-[10px] block">Evening Meal</span>
                    <span className="font-bold text-slate-900">Lunch: No Duty</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 pt-0.5">
                On Fridays, food duty is off for both morning and evening meals. Weekend College Team cooking resumes on Saturday.
              </p>
            </div>

            {/* Next Scheduled Team */}
            {nextCookingItem && (
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/70 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                    Next Cooking Team (Tomorrow - {nextCookingTeamLabel})
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {nextCookingItem.group.name}
                    {nextCookingItem.members.length > 0 && (
                      <span className="font-normal text-slate-600"> ({nextCookingItem.members.map((m) => m.name).join(' & ')})</span>
                    )}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded-md">
                  Saturday (Holiday)
                </span>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all">
          {/* Card Header */}
          <div className="p-4 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shadow-xs">
                <Utensils className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Cooking Duty
                </span>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  {assignedCookingGroup?.name || `Group ${todayDuty?.group_id || 4}`}
                </h2>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
                <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                <span>{formattedToday}</span>
              </div>
              {assignedCookingGroup && (
                <button 
                  onClick={() => setSwapModalOpen(true)}
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
                  title="Swap Member"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Students Assigned */}
          <div className="px-4 py-3.5 bg-slate-50/60 border-b border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Users2 className="w-3.5 h-3.5" />
                <span>Assigned Cooking Pair:</span>
              </div>
              {todayDuty?.is_temporary_swap && (
                <div className="flex items-center space-x-2">
                  <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                    Temporary Swap
                  </span>
                  {!(isBreakfastDone && isLunchDone) && (
                    <button 
                      onClick={() => {
                        dutyStore.revertCookingDutySwap(todayDate);
                        refreshData();
                      }}
                      className="text-[9px] font-bold text-slate-500 hover:text-amber-700 hover:underline"
                    >
                      Revert
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {cookingMembers.length > 0 ? (
                cookingMembers.map((member) => (
                  <div 
                    key={member.id}
                    className="bg-white px-3 py-2 rounded-xl border border-slate-200/80 flex items-center space-x-2"
                  >
                    <div className="w-6 h-6 rounded-lg bg-orange-50 text-orange-700 text-xs font-bold flex items-center justify-center">
                      {member.name.charAt(0)}
                    </div>
                    <span className="text-sm font-semibold text-slate-800 truncate">
                      {member.name}
                    </span>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-xs text-slate-400 italic py-1">
                  Nashid &amp; Nafil (Group 4)
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons: Breakfast Done & Lunch Done (>= 48px height) */}
          <div className="p-4 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Breakfast Button */}
              <button
                type="button"
                onClick={() => handleToggleMeal('breakfast')}
                className={`min-h-[48px] w-full px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-between transition-all active:scale-[0.98] ${
                  isBreakfastDone
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200/60'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                    isBreakfastDone ? 'bg-white/20 text-white' : 'bg-white text-slate-500 shadow-xs'
                  }`}>
                    {isBreakfastDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '1'}
                  </div>
                  <span>Breakfast</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                  isBreakfastDone ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {isBreakfastDone ? 'Done' : 'Mark Done'}
                </span>
              </button>

              {/* Lunch Button */}
              <button
                type="button"
                onClick={() => handleToggleMeal('lunch')}
                className={`min-h-[48px] w-full px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-between transition-all active:scale-[0.98] ${
                  isLunchDone
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200/60'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                    isLunchDone ? 'bg-white/20 text-white' : 'bg-white text-slate-500 shadow-xs'
                  }`}>
                    {isLunchDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '2'}
                  </div>
                  <span>Lunch</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                  isLunchDone ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {isLunchDone ? 'Done' : 'Mark Done'}
                </span>
              </button>
            </div>

            {/* Next Cooking Team (Always Visible) */}
            {nextCookingItem && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-orange-50/90 to-amber-50/70 border border-orange-200/80 flex items-center justify-between shadow-2xs animate-in fade-in duration-200">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800 block">
                      Next Cooking Team (Tomorrow)
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {nextCookingItem.group.name}
                      {nextCookingItem.members.length > 0 && (
                        <span className="font-normal text-slate-600"> ({nextCookingItem.members.map((m) => m.name).join(' & ')})</span>
                      )}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-orange-800 bg-orange-200/70 px-2 py-0.5 rounded-md border border-orange-300/60">
                  Up Next
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3. Prayer Duties Segmented Control */}
      <div className="bg-slate-100/80 p-1 rounded-xl flex items-center mb-4 border border-slate-200/50">
        <button
          onClick={() => setActivePrayerTab('Asr')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
            activePrayerTab === 'Asr' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Asr
        </button>
        <button
          onClick={() => setActivePrayerTab('Haddad')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
            activePrayerTab === 'Haddad' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Haddad
        </button>
        <button
          onClick={() => setActivePrayerTab('Isha_Azaan')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
            activePrayerTab === 'Isha_Azaan' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Azaan
        </button>
      </div>

      <div className="space-y-4">
        <PrayerDutyCard 
          dutyType={activePrayerTab} 
          onOpenModal={() => { setActiveModalDuty(activePrayerTab); setPrayerModalOpen(true); }} 
        />
      </div>

      {/* Action Modals */}
      <PrayerLoggerModal
        isOpen={prayerModalOpen}
        onClose={() => setPrayerModalOpen(false)}
        defaultDate={todayDate}
        dutyType={activeModalDuty}
        onSuccess={() => {
          refreshData();
          setPrayerModalOpen(false);
        }}
        onSetSubstitute={(studentId, replacementStudentId) => {
          dutyStore.setDailyImamState({
            date: todayDate,
            assigned_student_id: studentId,
            acting_student_id: replacementStudentId,
            status: 'pending'
          });
          refreshData();
        }}
      />

      <SwapMemberModal
        isOpen={swapModalOpen}
        onClose={() => setSwapModalOpen(false)}
        dutyDate={todayDate}
        currentMembers={cookingMembers}
        onSuccess={() => {
          refreshData();
          setSwapModalOpen(false);
        }}
      />
    </div>
  );
};
