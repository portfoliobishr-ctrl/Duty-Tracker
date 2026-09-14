'use client';

import React, { useState, useEffect } from 'react';
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
import confetti from 'canvas-confetti';

export const PrayerDutyCard: React.FC<{ dutyType: PrayerSlotName; onOpenModal: () => void }> = ({ dutyType, onOpenModal }) => {
  const [todayDate] = useState<string>(() => getRelativeDateString(0));
  
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
    const data = dutyStore.getAssignedDutyStudent(todayDate, dutyType);
    const roundNumber = dutyStore.getActiveRound(data.pool, dutyType).round_number;
    setAssigned({ ...data, roundNumber });

    const log = dutyStore.getImamLogs().find((l) => l.date === todayDate && l.prayer_name === dutyType) || null;
    setTodayLog(log);

    setDailyImamState(dutyStore.getDailyImamState(todayDate));

    // Next candidate logic
    const tomorrowDate = getRelativeDateString(1);
    const settings = dutyStore.getSystemSettings();
    const isTomorrowHoliday = isHolidayOrSunday(tomorrowDate, settings.default_holidays);
    const tomorrowPool: 'regular' | 'college' = dutyType === 'Asr' ? (isTomorrowHoliday ? 'college' : 'regular') : 'regular';
    
    const stats = dutyStore.getDualPoolStats(dutyType);
    const poolStats = dutyType === 'Asr' ? (tomorrowPool === 'college' ? stats.poolB : stats.poolA) : stats.poolA;
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
  }, [todayDate, dutyType]);

  const handleMarkLed = () => {
    const activeStudentId = dailyImamState?.acting_student_id || assigned?.student?.id;
    if (!activeStudentId) return;

    if (dailyImamState?.acting_student_id) {
      dutyStore.logDuty({
        prayerName: dutyType,
        date: todayDate,
        studentId: dailyImamState.assigned_student_id,
        status: 'absent_replaced',
        replacementStudentId: dailyImamState.acting_student_id,
        notes: 'Confirmed from Today action screen (Substitute)',
      });
    } else if (assigned?.student) {
      dutyStore.logDuty({
        prayerName: dutyType,
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

    const allStudents = dutyStore.getStudents();
    const activeStudent = dailyImamState?.acting_student_id 
      ? allStudents.find(s => s.id === dailyImamState.acting_student_id)
      : assigned?.student;

    const dutyName = dutyType === 'Isha_Azaan' ? 'Isha Azaan' : dutyType;
    showToast(`${dutyName} duty recorded for ${activeStudent?.name}`, 'success');
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
  
  const dutyName = dutyType === 'Isha_Azaan' ? 'Isha Azaan' : dutyType;

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all mt-4">
      {/* Card Header */}
      <div className="p-4 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Student Rotation
            </span>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              {dutyName} Duty
            </h2>
          </div>
        </div>

        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          assigned?.isHoliday 
            ? 'bg-amber-100 text-amber-800' 
            : 'bg-slate-100 text-slate-700'
        }`}>
          {assigned?.isHoliday ? 'Holiday / Weekend' : 'Regular Day'}
        </span>
      </div>

      {/* Assigned Imam Profile: Completed vs Pending */}
      {isDone ? (
        <div className="p-4 bg-emerald-50/30 border-b border-emerald-100/60 space-y-3">
          {/* Today's Completed Banner */}
          <div className="p-3 rounded-2xl bg-white border border-emerald-200/80 shadow-2xs flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                  Today&apos;s Duty Completed
                </span>
                <span className="text-xs font-bold text-slate-900">
                  Led by {todayImamStudent?.name || assigned?.student?.name || 'Assigned Student'}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Led</span>
            </span>
          </div>

          {/* Next Candidate Spotlight */}
          {nextCandidate && (
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold text-base flex items-center justify-center shadow-xs">
                    {nextCandidate.student.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        Next {dutyName} (Tomorrow)
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Up Next
                      </span>
                    </div>
                    <span className="text-lg font-extrabold text-slate-900 tracking-tight block mt-0.5">
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
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-emerald-50/40 border-b border-emerald-100/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-bold text-lg flex items-center justify-center shadow-sm shadow-emerald-600/20">
                {activeStudent?.name ? activeStudent.name.charAt(0) : 'D'}
              </div>
              <div>
                <span className="text-xs font-semibold text-emerald-800 flex items-center space-x-1">
                  <span>Scheduled {dutyName}</span>
                  {pendingSubstituteStudent && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                      [Substituted]
                    </span>
                  )}
                </span>
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">
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
        </div>
      )}

      {/* Action Buttons */}
      {!isDone && (
        <div className="p-4 bg-slate-50/50">
          <button
            type="button"
            onClick={handleMarkLed}
            className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center space-x-2 transition-all active:scale-[0.98] shadow-sm shadow-emerald-600/30"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>Mark {dutyName} Led by {activeStudent?.name || 'Dilshad'}</span>
          </button>
          <div className="mt-2.5 flex items-center justify-center space-x-4">
            <button
              onClick={onOpenModal}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center space-x-1.5 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Substitute / No Imam</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
