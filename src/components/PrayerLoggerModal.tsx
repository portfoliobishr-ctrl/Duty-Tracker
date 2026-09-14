'use client';

import React, { useState, useEffect } from 'react';
import { 
  Student, 
  ImamLogStatus,
  PoolType,
  PrayerSlotName
} from '@/types/database';
import { dutyStore } from '@/lib/dutyStore';
import { useToast } from '@/context/ToastContext';
import { 
  X, 
  Compass, 
  CheckCircle2, 
  UserCheck,
  Sun,
  Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PrayerLoggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStudentId?: string;
  defaultDate?: string;
  onSuccess?: () => void;
  dutyType?: PrayerSlotName;
  onSetSubstitute?: (studentId: string, replacementStudentId: string) => void;
}

export const PrayerLoggerModal: React.FC<PrayerLoggerModalProps> = ({
  isOpen,
  onClose,
  defaultStudentId,
  defaultDate,
  dutyType = 'Asr',
  onSuccess,
  onSetSubstitute,
}) => {
  const [date, setDate] = useState<string>(() => defaultDate || new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<ImamLogStatus>('completed');
  const [studentId, setStudentId] = useState<string>('');
  const [replacementStudentId, setReplacementStudentId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [poolInfo, setPoolInfo] = useState<{ pool: PoolType; isHoliday: boolean } | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      const allStudents = dutyStore.getStudents();
      setStudents(allStudents);
      const effectiveDate = defaultDate || new Date().toISOString().split('T')[0];
      setDate(effectiveDate);
      setStatus('completed');

      const assignedInfo = dutyStore.getAssignedDutyStudent(effectiveDate, dutyType);
      setPoolInfo({ pool: assignedInfo.pool, isHoliday: assignedInfo.isHoliday });

      if (defaultStudentId) {
        setStudentId(defaultStudentId);
      } else if (assignedInfo.student) {
        setStudentId(assignedInfo.student.id);
      } else if (allStudents.length > 0) {
        setStudentId(allStudents[0].id);
      }
    }
  }, [isOpen, defaultStudentId, defaultDate]);

  // When date changes, recalculate pool & candidate
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    const assignedInfo = dutyStore.getAssignedDutyStudent(newDate, dutyType);
    setPoolInfo({ pool: assignedInfo.pool, isHoliday: assignedInfo.isHoliday });
    if (assignedInfo.student && !defaultStudentId) {
      setStudentId(assignedInfo.student.id);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (onSetSubstitute && (status === 'replaced' || status === 'absent_replaced') && studentId && replacementStudentId) {
        onSetSubstitute(studentId, replacementStudentId);
        onClose();
        setIsSubmitting(false);
        return;
      }

      const result = dutyStore.logDuty({
        prayerName: dutyType,
        date,
        status,
        studentId: status === 'external_imam' || status === 'none' ? null : (studentId || null),
        replacementStudentId: (status === 'replaced' || status === 'absent_replaced') ? (replacementStudentId || null) : null,
        notes: notes.trim() || undefined,
      });

      if (result.roundAdvanced && result.newRound) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#059669', '#10b981', '#34d399'],
          });
        } catch {}
        showToast(`🎉 Round ${result.newRound.round_number - 1} complete for ${result.newRound.pool} queue! Round ${result.newRound.round_number} has started.`, 'success');
      } else {
        showToast('Asr congregational prayer recorded successfully', 'success');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to save Asr prayer record', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-900 animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm text-slate-900">
                  Record Asr Congregational Prayer
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  poolInfo?.isHoliday ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {poolInfo?.isHoliday ? 'College Pool (Holiday/Sun)' : 'Regular Pool'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Single Daily Prayer Scope • Asr Jama&apos;ath Rotation
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          
          {/* Date & Prayer Info Box */}
          <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">Daily Asr Congregation</span>
                <span className="text-[11px] text-slate-500">
                  {poolInfo?.isHoliday ? 'Sunday/Holiday Engine (Groups 6–8)' : 'Weekday Working Engine (Groups 1–5)'}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">
              Asr Only
            </span>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Prayer Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500 shadow-2xs"
            />
          </div>

          {/* Imam Situation Segmented Control */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Imam Attendance & Situation
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setStatus('completed')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all ${
                  status === 'completed' || status === 'led'
                    ? 'bg-white text-emerald-700 shadow-sm shadow-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Led by Student
              </button>
              <button
                type="button"
                onClick={() => setStatus('replaced')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all ${
                  status === 'replaced' || status === 'absent_replaced'
                    ? 'bg-white text-amber-700 shadow-sm shadow-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Substitute
              </button>
              <button
                type="button"
                onClick={() => setStatus('external_imam')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all ${
                  status === 'external_imam'
                    ? 'bg-white text-blue-700 shadow-sm shadow-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                External Imam
              </button>
            </div>
          </div>

          {/* Student Selector */}
          {status !== 'external_imam' && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {(status === 'replaced' || status === 'absent_replaced') ? 'Original Scheduled Student' : 'Imam Student'}
                </label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                >
                  <option value="">-- Select Student --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Group {s.group_id} • {s.group_id >= 6 ? 'College' : 'Regular'})
                    </option>
                  ))}
                </select>
              </div>

              {(status === 'replaced' || status === 'absent_replaced') && (
                <div className="pt-2 border-t border-slate-200/70">
                  <label className="block text-xs font-semibold text-amber-800 mb-1.5 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    Replacement Student (Who Actually Led)
                  </label>
                  <select
                    value={replacementStudentId}
                    onChange={(e) => setReplacementStudentId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-amber-300 text-slate-800 text-xs font-medium focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-2xs"
                  >
                    <option value="">-- Select Replacement Student --</option>
                    {students
                      .filter((s) => s.id !== studentId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Group {s.group_id} • {s.group_id >= 6 ? 'College' : 'Regular'})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {status === 'external_imam' && (
            <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200/60 text-xs text-blue-900 leading-relaxed">
              💡 <strong>External / Guest Imam</strong>: Recorded without consuming the scheduled student&apos;s turn. Their turn will be preserved for the next eligible Asr date.
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Surah recited, or substitution reason..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/30 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save Asr Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
