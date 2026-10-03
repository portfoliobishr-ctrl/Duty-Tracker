'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Edit3 } from 'lucide-react';
import { dutyStore } from '@/lib/dutyStore';
import { useToast } from '@/context/ToastContext';
import { PrayerSlotName } from '@/types/database';

export type EditDutyMode = 'Cooking' | PrayerSlotName;

interface EditDutyModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  dutyType: EditDutyMode;
  onSuccess?: () => void;
}

export const EditDutyModal: React.FC<EditDutyModalProps> = ({
  isOpen,
  onClose,
  date,
  dutyType,
  onSuccess
}) => {
  const { showToast } = useToast();
  
  // Cooking Duty State
  const [selectedGroupId, setSelectedGroupId] = useState<number>(1);
  const groups = dutyStore.getGroupsWithMembers();

  // Prayer Duty State
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const students = dutyStore.getStudents().filter(s => s.is_active).sort((a, b) => a.name.localeCompare(b.name));

  const isCooking = dutyType === 'Cooking';
  const dutyName = isCooking ? 'Cooking Duty' : `${dutyType.replace('_', ' ')} Duty`;

  // Fetch current assignments
  useEffect(() => {
    if (isOpen) {
      if (isCooking) {
        const duty = dutyStore.getCookingDuties().find(d => d.duty_date === date);
        setSelectedGroupId(duty?.group_id || 1);
      } else {
        const log = dutyStore.getImamLogs().find(l => l.date === date && l.prayer_name === dutyType);
        if (log && log.student_id) {
          setSelectedStudentId(log.replacement_student_id || log.student_id);
        } else {
          const assigned = dutyStore.getAssignedDutyStudent(date, dutyType as PrayerSlotName);
          setSelectedStudentId(assigned.student?.id || students[0]?.id || '');
        }
      }
    }
  }, [isOpen, date, dutyType, isCooking, students]);

  if (!isOpen) return null;

  const isPrayerDone = !isCooking && dutyStore.getImamLogs().find(l => l.date === date && l.prayer_name === dutyType && (l.status === 'completed' || l.status === 'led'));
  const isCookingDone = isCooking && dutyStore.getCookingDuties().find(d => d.duty_date === date && (d.breakfast_completed || d.lunch_completed));

  const handleSave = () => {
    if (isCooking) {
      dutyStore.overrideCookingGroup(date, selectedGroupId, 'Manual override via Edit Duty');
      showToast(`Cooking Duty changed to Group ${selectedGroupId}`, 'success');
    } else {
      dutyStore.logDuty({
        prayerName: dutyType as PrayerSlotName,
        date: date,
        studentId: selectedStudentId,
        status: 'completed',
        notes: 'Changed / Overridden manually via Edit Modal'
      });
      showToast(`${dutyName} assigned and marked completed`, 'success');
    }
    if (onSuccess) onSuccess();
    onClose();
  };

  const handleUndo = () => {
    if (isCooking) {
      // Toggle both meals back to false if they were true
      const duty = dutyStore.getCookingDuties().find(d => d.duty_date === date);
      if (duty?.breakfast_completed) dutyStore.toggleMealCompletion(date, 'breakfast');
      if (duty?.lunch_completed) dutyStore.toggleMealCompletion(date, 'lunch');
      showToast('Cooking Duty marked as pending', 'info');
    } else {
      dutyStore.undoDutyLog(date, dutyType as PrayerSlotName);
      showToast(`${dutyName} completion undone`, 'info');
    }
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-900 flex items-center space-x-2">
            <Edit3 className="w-4 h-4 text-emerald-600" />
            <span>Edit {dutyName}</span>
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-xs text-slate-500 text-center bg-slate-50 p-2 rounded-lg border border-slate-100 font-medium">
            Date: <strong className="text-slate-800">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric'})}</strong>
          </p>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              {isCooking ? 'Reassign Group' : 'Reassign Student'}
            </label>
            {isCooking ? (
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.is_holiday_only ? 'College' : 'Regular'}) - {g.members.map(m => m.name).join(' & ')}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
              >
                <option value="" disabled>Select Student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Group {s.group_id})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isPrayerDone ? 'Change Imam & Save' : 'Save Changes'}</span>
            </button>
            
            {(isPrayerDone || isCookingDone) && (
              <button
                type="button"
                onClick={handleUndo}
                className="w-full bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Undo Completion (Mark Pending)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
