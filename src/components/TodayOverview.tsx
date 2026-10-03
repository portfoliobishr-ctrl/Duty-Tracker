'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { 
  CookingDuty, 
  Student, 
  Group, 
  ImamLog,
  DailyImamState,
  PrayerSlotName
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
  ArrowRightLeft,
  Sun
} from 'lucide-react';
import { PrayerLoggerModal } from './PrayerLoggerModal';
import { SwapMemberModal } from './SwapMemberModal';
import { PrayerDutyCard } from './PrayerDutyCard';
import { ChangeGroupModal } from './ChangeGroupModal';
import { EditDutyModal, EditDutyMode } from './EditDutyModal';
import confetti from 'canvas-confetti';

export const TodayOverview: React.FC = () => {
  const todayDate = useSyncExternalStore(
    (listener) => dutyStore.subscribe(listener),
    () => dutyStore.getTodayStr(),
    () => dutyStore.getTodayStr()
  );
  const [todayDuty, setTodayDuty] = useState<CookingDuty | null>(null);
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

  const [prayerModalOpen, setPrayerModalOpen] = useState(false);
  const [prayerDutyMode, setPrayerDutyMode] = useState<PrayerSlotName>('Asr');
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [changeGroupModalOpen, setChangeGroupModalOpen] = useState(false);
  const [editDutyModalOpen, setEditDutyModalOpen] = useState(false);
  const [editDutyMode, setEditDutyMode] = useState<EditDutyMode>('Cooking');

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshData();
    const unsubscribe = dutyStore.subscribe(() => {
      refreshData();
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const handleToggleMeal = async (meal: 'breakfast' | 'lunch') => {
    try {
      const updated = await dutyStore.toggleMealCompletion(todayDate, meal);
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
    } catch (error: any) {
      showToast(error.message || 'Failed to update database', 'error');
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
  const formattedToday = dutyStore.getToday().toLocaleDateString('en-US', {
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
  const tomorrowDate = getRelativeDateString(1, dutyStore.getToday());
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



  return (
    <div className="flex-1 flex flex-col gap-3 w-full max-w-lg mx-auto pb-6">
      
      {/* Cooking Card */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col gap-3 w-full min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center shadow-xs ${isNoFoodDuty ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
              <Utensils className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 leading-tight truncate">
                {isNoFoodDuty ? 'No Food Duty' : (assignedCookingGroup?.name || `Group ${todayDuty?.group_id || 4}`)}
              </h2>
            </div>
            {isNoFoodDuty && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 shrink-0 ml-1">
                Friday Off
              </span>
            )}

          </div>
          
          </div>

        {/* Students Assigned */}
        {!isNoFoodDuty && (
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
                <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                <span>{formattedToday}</span>
                {todayDuty?.is_temporary_swap && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold ml-2">
                    Swap
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setChangeGroupModalOpen(true)}
                  className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-bold transition-colors"
                >
                  Edit
                </button>
                {assignedCookingGroup && (
                  <button 
                    onClick={() => setSwapModalOpen(true)}
                    className="p-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 transition-colors"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {cookingMembers.length > 0 ? (
                cookingMembers.map((member) => (
                  <div 
                    key={member.id}
                    className="bg-slate-50 px-2 py-1.5 rounded-xl border border-slate-100 flex items-center space-x-2"
                  >
                    <div className="w-5 h-5 rounded-lg bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">
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
        )}

        {/* Meals Action Rows */}
        <div className="flex flex-col gap-2 mt-1">
          {/* Breakfast */}
          <div 
            onClick={() => !isNoFoodDuty && handleToggleMeal('breakfast')}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              isNoFoodDuty 
                ? 'bg-slate-50 border-slate-100' 
                : 'cursor-pointer select-none active:scale-[0.99] ' + (isBreakfastDone ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-100 hover:bg-slate-100')
            }`}
          >
            <div className="flex items-center gap-2">
              <Coffee className={`w-4 h-4 ${isNoFoodDuty ? 'text-slate-400' : isBreakfastDone ? 'text-emerald-500' : 'text-slate-500'}`} />
              <span className="text-sm font-semibold text-slate-800">Breakfast</span>
            </div>
            {isNoFoodDuty ? (
              <span className="text-xs font-bold px-2 py-1 rounded bg-slate-200/80 text-slate-500">Off</span>
            ) : (
              <span
                className={`text-xs font-bold px-2 py-1 rounded-md transition-all ${
                  isBreakfastDone ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-white text-slate-700 border border-slate-200 shadow-sm'
                }`}
              >
                {isBreakfastDone ? 'Done' : 'Mark Done'}
              </span>
            )}
          </div>
          
          {/* Lunch */}
          <div 
            onClick={() => !isNoFoodDuty && handleToggleMeal('lunch')}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              isNoFoodDuty 
                ? 'bg-slate-50 border-slate-100' 
                : 'cursor-pointer select-none active:scale-[0.99] ' + (isLunchDone ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-100 hover:bg-slate-100')
            }`}
          >
            <div className="flex items-center gap-2">
              <Sun className={`w-4 h-4 ${isNoFoodDuty ? 'text-slate-400' : isLunchDone ? 'text-emerald-500' : 'text-slate-500'}`} />
              <span className="text-sm font-semibold text-slate-800">Lunch</span>
            </div>
            {isNoFoodDuty ? (
              <span className="text-xs font-bold px-2 py-1 rounded bg-slate-200/80 text-slate-500">Off</span>
            ) : (
              <span
                className={`text-xs font-bold px-2 py-1 rounded-md transition-all ${
                  isLunchDone ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-white text-slate-700 border border-slate-200 shadow-sm'
                }`}
              >
                {isLunchDone ? 'Done' : 'Mark Done'}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="space-y-2">
        <PrayerDutyCard 
          onOpenModal={(type) => {
            setPrayerDutyMode(type);
            setPrayerModalOpen(true);
          }} 
          onOpenEditModal={(type) => {
            setEditDutyMode(type);
            setEditDutyModalOpen(true);
          }}
        />
      </div>

      {/* Action Modals */}
      <PrayerLoggerModal
        isOpen={prayerModalOpen}
        onClose={() => setPrayerModalOpen(false)}
        defaultDate={todayDate}
        dutyType={prayerDutyMode}
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

      <ChangeGroupModal
        isOpen={changeGroupModalOpen}
        onClose={() => setChangeGroupModalOpen(false)}
        dutyDate={todayDate}
        currentGroupId={todayDuty?.group_id || null}
        onSuccess={() => {
          refreshData();
          setChangeGroupModalOpen(false);
        }}
      />

      <EditDutyModal
        isOpen={editDutyModalOpen}
        onClose={() => setEditDutyModalOpen(false)}
        date={todayDate}
        dutyType={editDutyMode}
        onSuccess={() => {
          refreshData();
          setEditDutyModalOpen(false);
        }}
      />
    </div>
  );
};
