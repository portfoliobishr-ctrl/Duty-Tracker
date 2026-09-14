'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  PoolStats, 
  Student, 
  PoolType,
  PrayerSlotName
} from '@/types/database';
import { dutyStore } from '@/lib/dutyStore';
import { useToast } from '@/context/ToastContext';
import { 
  Compass, 
  Plus, 
  Check, 
  Sun, 
  Sparkles, 
  GraduationCap, 
  Briefcase
} from 'lucide-react';
import { PrayerLoggerModal } from './PrayerLoggerModal';
import confetti from 'canvas-confetti';

export const ImamDutyView: React.FC = () => {
  const [dualStats, setDualStats] = useState<{ poolA: PoolStats; poolB: PoolStats } | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'regular' | 'college'>('all');
  const [activeDuty, setActiveDuty] = useState<PrayerSlotName>('Asr');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<string | undefined>();

  const { showToast } = useToast();

  const refreshData = useCallback(() => {
    const data = dutyStore.getDualPoolStats(activeDuty);
    setDualStats(data);
  }, [activeDuty]);

  useEffect(() => {
    refreshData();
    const unsubscribe = dutyStore.subscribe(refreshData);
    return () => unsubscribe();
  }, [refreshData]);

  const handleToggleStudentTurn = (student: Student, pool: PoolType, currentStatus: boolean, roundNumber: number) => {
    dutyStore.toggleStudentRoundTurn(student.id, !currentStatus, activeDuty);
    if (!currentStatus) {
      try {
        confetti({
          particleCount: 35,
          spread: 50,
          origin: { y: 0.7 },
          colors: ['#059669', '#10b981', '#34d399'],
        });
      } catch {}
      showToast(`${student.name} marked completed for Round ${roundNumber} (${pool === 'college' ? 'College Pool' : 'Regular Pool'})`, 'success');
    } else {
      showToast(`${student.name} turn reset to pending for Round ${roundNumber}`, 'info');
    }
  };

  const handleOpenModal = (studentId?: string) => {
    setSelectedStudentForModal(studentId);
    setIsModalOpen(true);
  };

  if (!dualStats) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 text-xs font-medium">
        Loading Asr rotation queues...
      </div>
    );
  }

  const { poolA, poolB } = dualStats;

  const renderQueueSection = (poolData: PoolStats) => {
    const isRegular = poolData.pool === 'regular';
    const Icon = isRegular ? Briefcase : GraduationCap;

    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
        <div>
          {/* Pool Header */}
          <div className="flex items-start justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isRegular 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' 
                    : 'bg-purple-50 text-purple-700 border-purple-200/60'
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                  <span>{isRegular ? 'Pool A • Weekdays' : 'Pool B • Weekends & Holidays'}</span>
                </span>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  Round {poolData.activeRound.round_number}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1.5">
                {activeDuty === 'Asr' ? (isRegular ? 'Regular Students Queue' : 'College Students Queue') : 'Unified Students Queue'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeDuty === 'Asr' ? (isRegular
                  ? 'Assigned on regular working days. 10 students in custom rotation order.'
                  : 'Assigned on weekends (Saturdays & Sundays) & holidays. 6 students in custom rotation order.') : 'All 16 students in a single continuous rotation.'}
              </p>
            </div>
          </div>

          {/* Next Candidate Spotlight */}
          {poolData.nextCandidate && (
            <div className={`mt-4 p-3.5 rounded-2xl border flex items-center justify-between ${
              isRegular 
                ? 'bg-emerald-50/60 border-emerald-200/70' 
                : 'bg-purple-50/60 border-purple-200/70'
            }`}>
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className={`p-2 rounded-xl text-white ${
                  isRegular ? 'bg-emerald-600' : 'bg-purple-600'
                }`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                    isRegular ? 'text-emerald-700' : 'text-purple-700'
                  }`}>
                    Next In Line ({activeDuty === 'Isha_Azaan' ? 'Isha Azaan' : activeDuty} Turn)
                  </span>
                  <span className="font-bold text-xs sm:text-sm text-slate-900 truncate block">
                    {poolData.nextCandidate.name}
                    <span className="text-xs font-normal text-slate-500 ml-1.5">
                      (Group {poolData.nextCandidate.group_id})
                    </span>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleOpenModal(poolData.nextCandidate?.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all shrink-0 active:scale-95 shadow-xs ${
                  isRegular
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
                }`}
              >
                Log {activeDuty === 'Isha_Azaan' ? 'Isha Azaan' : activeDuty}
              </button>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-600">
                Cycle Progress: <strong className="text-slate-900 font-bold">{poolData.completedCount} of {poolData.totalStudents}</strong> completed
              </span>
              <span className={`font-bold px-2 py-0.5 rounded-md border text-xs ${
                isRegular
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                  : 'bg-purple-50 text-purple-700 border-purple-200/60'
              }`}>
                {poolData.progressPercentage}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  isRegular ? 'bg-emerald-600' : 'bg-purple-600'
                }`}
                style={{ width: `${poolData.progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Alphabetical List of Students */}
          <div className="mt-5 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Rotation Order
            </span>
            {poolData.students.map((item, index) => {
              const { student, hasLedCurrentRound, allTimeLedCount, replacedCount, lastLedDate } = item;
              const isNext = poolData.nextCandidate?.id === student.id;

              return (
                <div
                  key={student.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                    hasLedCurrentRound
                      ? 'bg-slate-50/70 border-slate-200/70 text-slate-700 opacity-90'
                      : isNext
                      ? isRegular
                        ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-300/40'
                        : 'bg-purple-50/40 border-purple-300 ring-1 ring-purple-300/40'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  {/* Left: Index + Checkbox + Details */}
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className="w-5 text-center text-[11px] font-bold text-slate-400 shrink-0">
                      #{index + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleStudentTurn(student, poolData.pool, hasLedCurrentRound, poolData.activeRound.round_number)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-90 ${
                        hasLedCurrentRound
                          ? isRegular
                            ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                            : 'bg-purple-600 text-white shadow-xs shadow-purple-600/30'
                          : 'border-2 border-slate-300 text-transparent hover:border-slate-400 bg-white'
                      }`}
                      title={hasLedCurrentRound ? 'Click to unmark turn' : 'Click to mark turn completed for this round'}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {student.name}
                        </h4>
                        {isNext && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            isRegular ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            NEXT
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-semibold text-[10px]">
                          Group {student.group_id}
                        </span>
                        <span>•</span>
                        <span className="font-medium text-slate-500">
                          All-time: <strong className="text-slate-800 font-bold">{allTimeLedCount}</strong>
                        </span>
                        {replacedCount > 0 && (
                          <span className="text-amber-600 font-medium">({replacedCount} sub)</span>
                        )}
                        {lastLedDate && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline text-slate-400 text-[10px]">
                              Last: {lastLedDate}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Log action button */}
                  <div className="shrink-0 pl-2">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(student.id)}
                      className="px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200/80 text-[11px] font-bold text-slate-700 transition-colors active:scale-95"
                    >
                      Log
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-5xl mx-auto pb-10">
      
      {/* Duty Type Tabs */}
      <div className="flex space-x-2 bg-slate-100/50 p-1 rounded-2xl w-fit border border-slate-200/60">
        {(['Asr', 'Haddad', 'Isha_Azaan'] as PrayerSlotName[]).map((duty) => (
          <button
            key={duty}
            onClick={() => setActiveDuty(duty)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeDuty === duty
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            {duty === 'Isha_Azaan' ? 'Isha Azaan' : duty}
          </button>
        ))}
      </div>

      {/* Top Banner & Control */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-xs font-bold mb-1 border border-amber-200/60">
              <Sun className="w-3.5 h-3.5 text-amber-600" />
              <span>{activeDuty === 'Isha_Azaan' ? 'Isha Azaan' : activeDuty} Duty</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {activeDuty === 'Asr' ? 'Dual-Pool Alphabetical Rotation Roster' : 'Unified Alphabetical Rotation Roster'}
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
              {activeDuty === 'Asr' 
                ? 'This duty tracks the Asr rotation. College students attend college on weekdays, so they rotate on weekends (Saturdays & Sundays) & holidays (Pool B, 6 students). Regular students rotate on working weekdays (Pool A, 10 students). Both queues strictly follow alphabetical order (A to Z).'
                : `This duty tracks the ${activeDuty === 'Isha_Azaan' ? 'Isha Azaan' : activeDuty} rotation. All students rotate in a single unified queue.`}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs shadow-emerald-600/30 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Record {activeDuty === 'Isha_Azaan' ? 'Isha Azaan' : activeDuty}</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs (Only for Asr) */}
        {activeDuty === 'Asr' && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter Queue View:</span>
            <div className="bg-slate-100 p-1 rounded-2xl flex items-center space-x-1 border border-slate-200/60 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-xl transition-all ${
                  activeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Both Queues
              </button>
              <button
                onClick={() => setActiveTab('regular')}
                className={`px-3 py-1 rounded-xl transition-all ${
                  activeTab === 'regular'
                    ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Regular (10)
              </button>
              <button
                onClick={() => setActiveTab('college')}
                className={`px-3 py-1 rounded-xl transition-all ${
                  activeTab === 'college'
                    ? 'bg-white text-purple-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                College (6)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Roster Queues Display */}
      <div className={`grid gap-4 sm:gap-5 ${
        (activeTab === 'all' && activeDuty === 'Asr') ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
      }`}>
        {(activeTab === 'all' || activeTab === 'regular' || activeDuty !== 'Asr') && renderQueueSection(poolA)}
        {activeDuty === 'Asr' && (activeTab === 'all' || activeTab === 'college') && poolB && renderQueueSection(poolB)}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <PrayerLoggerModal
          isOpen={isModalOpen}
          defaultStudentId={selectedStudentForModal}
          dutyType={activeDuty}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedStudentForModal(undefined);
          }}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
};
