'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { 
  Student, 
  ImamLog,
  DailyImamState,
  PrayerSlotName,
  ImamRound
} from '@/types/database';
import { dutyStore } from '@/lib/dutyStore';
import { getRelativeDateString, isHolidayOrSunday } from '@/lib/seedData';
import { useToast } from '@/context/ToastContext';
import { 
  Compass, 
  Check, 
  CheckCircle2, 
  Sparkles,
  UserCheck
} from 'lucide-react';
import { EditDutyModal } from './EditDutyModal';
import confetti from 'canvas-confetti';

export const PrayerDutyCard: React.FC<{ onOpenModal: (dutyType: PrayerSlotName) => void; onOpenEditModal?: (dutyType: PrayerSlotName) => void }> = ({ onOpenModal, onOpenEditModal }) => {
  const [selectedDuty, setSelectedDuty] = useState<PrayerSlotName>('Asr');
  const todayDate = useSyncExternalStore(
    (listener) => dutyStore.subscribe(listener),
    () => dutyStore.getTodayStr(),
    () => dutyStore.getTodayStr()
  );
  
  const [assigned, setAssigned] = useState<{
    student: Student | null;
    pool: 'regular' | 'college';
    isHoliday: boolean;
    queuePosition: number;
    totalInPool: number;
    roundNumber: number;
  } | null>(null);

  const [todayLog, setTodayLog] = useState<ImamLog | null>(null);
  const [dailyImamState, setDailyImamState] = useState<DailyImamState | null>(null);
  
  const [nextCandidate, setNextCandidate] = useState<{
    student: Student;
    pool: 'regular' | 'college';
    round: ImamRound;
    queuePosition: number;
    totalInPool: number;
  } | null>(null);

  const { showToast } = useToast();

  const refreshData = () => {
    const data = dutyStore.getAssignedDutyStudent(todayDate, selectedDuty);
    const roundNumber = dutyStore.getActiveRound(data.pool, selectedDuty).round_number;
    setAssigned({ ...data, roundNumber });

    const log = dutyStore.getImamLogs().find((l) => l.date === todayDate && l.prayer_name === selectedDuty) || null;
    setTodayLog(log);

    setDailyImamState(dutyStore.getDailyImamState(todayDate));

    // Next candidate logic
    const tomorrowDate = getRelativeDateString(1);
    const settings = dutyStore.getSystemSettings();
    const isTomorrowHoliday = isHolidayOrSunday(tomorrowDate, settings.default_holidays);
    const tomorrowPool: 'regular' | 'college' = selectedDuty === 'Asr' ? (isTomorrowHoliday ? 'college' : 'regular') : 'regular';
    
    const stats = dutyStore.getDualPoolStats(selectedDuty);
    const poolStats = selectedDuty === 'Asr' ? (tomorrowPool === 'college' ? stats.poolB : stats.poolA) : stats.poolA;
    if (poolStats && poolStats.nextCandidate) {
      setNextCandidate({
        student: poolStats.nextCandidate,
        pool: tomorrowPool,
        round: poolStats.activeRound,
        queuePosition: poolStats.students.findIndex(s => s.student.id === poolStats.nextCandidate!.id) + 1,
        totalInPool: poolStats.totalStudents,
      });
    } else {
      setNextCandidate(null);
    }
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = dutyStore.subscribe(refreshData);
    return () => unsubscribe();
  }, [todayDate, selectedDuty]);

  const handleMarkLed = () => {
    const activeStudentId = dailyImamState?.acting_student_id || assigned?.student?.id;
    if (!activeStudentId) return;

    if (dailyImamState?.acting_student_id) {
      dutyStore.logDuty({
        prayerName: selectedDuty,
        date: todayDate,
        studentId: dailyImamState.assigned_student_id,
        status: 'absent_replaced',
        replacementStudentId: dailyImamState.acting_student_id,
        notes: 'Confirmed from Today action screen (Substitute)',
      });
    } else if (assigned?.student) {
      dutyStore.logDuty({
        prayerName: selectedDuty,
        date: todayDate,
        studentId: assigned.student.id,
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

  };

  const isDone = todayLog?.status === 'completed' || todayLog?.status === 'led';
  const allStudents = dutyStore.getStudents();
  
  const todayImamStudent = todayLog
    ? ((todayLog.status === 'replaced' || todayLog.status === 'absent_replaced') && todayLog.replacement_student_id
        ? allStudents.find((s) => s.id === todayLog.replacement_student_id)
        : allStudents.find((s) => s.id === todayLog.student_id))
    : assigned?.student;

  const pendingSubstituteId = dailyImamState?.acting_student_id;
  const pendingSubstituteStudent = pendingSubstituteId ? allStudents.find(s => s.id === pendingSubstituteId) : null;
  const activeStudent = pendingSubstituteStudent || assigned?.student;
  
  const dutyName = selectedDuty === 'Isha_Azaan' ? 'Isha Azaan' : selectedDuty;

  // Segmented control mapping
  const tabs: { id: PrayerSlotName; label: string }[] = [
    { id: 'Asr', label: 'Imamath' },
    { id: 'Isha_Azaan', label: 'Azaan' },
    { id: 'Haddad', label: 'Haddad' }
  ];

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col gap-3 w-full min-w-0">
      
      {/* 3-Tab Segmented Switcher */}
      <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedDuty(tab.id)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
              selectedDuty === tab.id
                ? 'bg-white text-emerald-700 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 shrink-0 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
            <Compass className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 leading-tight truncate">
              {dutyName} Duty
            </h2>
          </div>
          </div>
      </div>

      {/* Assigned Imam Profile: Completed vs Pending */}
      {isDone ? (
        <div className="flex flex-col gap-2">
          {/* Today's Completed Banner */}
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 shrink-0 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block truncate">
                  Today&apos;s Duty Completed
                </span>
                <span className="text-xs font-bold text-slate-900 truncate block">
                  Led by {todayImamStudent?.name || assigned?.student?.name || 'Assigned Student'}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1 shrink-0 ml-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Led</span>
            </span>
            <button
              onClick={() => onOpenEditModal ? onOpenEditModal(selectedDuty) : onOpenModal(selectedDuty)}
              className="ml-2 flex items-center space-x-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-white/80 px-2 py-1 rounded border border-emerald-200 transition-all hover:bg-white shrink-0"
            >
              <span>✏️ Change</span>
            </button>
          </div>

          {/* Next Candidate Spotlight */}
          {nextCandidate && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold text-base flex items-center justify-center shadow-xs">
                    {nextCandidate.student.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider truncate">
                        Next {dutyName} (Tomorrow)
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0 mt-1 sm:mt-0">
                        Up Next
                      </span>
                    </div>
                    <span className="text-lg font-extrabold text-slate-900 tracking-tight block mt-0.5 truncate">
                      {nextCandidate.student.name}
                    </span>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                      <span>Round {nextCandidate.round.round_number}</span>
                      <span>•</span>
                      <span>Queue: #{nextCandidate.queuePosition} of {nextCandidate.totalInPool}</span>
                      <span>•</span>
                      <span>{nextCandidate.pool === 'college' ? 'College' : 'Regular'}</span>
                    </div>
                  </div>
                </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-emerald-600 text-white font-bold text-lg flex items-center justify-center shadow-sm shadow-emerald-600/20">
                {activeStudent?.name ? activeStudent.name.charAt(0) : 'D'}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-emerald-800 flex items-center space-x-1 flex-wrap">
                  <span className="truncate">Scheduled {dutyName}</span>
                  {pendingSubstituteStudent && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold shrink-0 mt-1 sm:mt-0">
                      [Substituted]
                    </span>
                  )}
                </span>
                <span className="text-xl font-extrabold text-slate-900 tracking-tight block truncate">
                  {activeStudent?.name || 'Dilshad'}
                </span>
                <div className="flex items-center space-x-1.5 mt-0.5 text-xs text-slate-500">
                  <span>Round {assigned?.roundNumber || 1}</span>
                  <span>•</span>
                  <span>Queue: #{assigned?.queuePosition || 2} of {assigned?.totalInPool || 10}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 mt-1">
            <button
              type="button"
              onClick={handleMarkLed}
              className="w-full h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-all active:scale-[0.98] shadow-sm shadow-emerald-600/30"
            >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>Mark {dutyName} Led by {activeStudent?.name || 'Dilshad'}</span>
          </button>
            <div className="flex items-center justify-center">
              <button
                onClick={() => onOpenModal(selectedDuty)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center space-x-1.5 transition-colors py-1"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Substitute / No Imam</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
