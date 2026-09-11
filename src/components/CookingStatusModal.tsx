'use client';

import React, { useState, useEffect } from 'react';
import { CookingDuty } from '@/types/database';
import { dutyStore } from '@/lib/dutyStore';
import { useToast } from '@/context/ToastContext';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  Utensils, 
  Coffee,
  Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CookingStatusModalProps {
  duty: CookingDuty | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CookingStatusModal: React.FC<CookingStatusModalProps> = ({
  duty,
  onClose,
  onSuccess,
}) => {
  const [bfDone, setBfDone] = useState(false);
  const [lnDone, setLnDone] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (duty) {
      setBfDone(duty.breakfast_completed);
      setLnDone(duty.lunch_completed);
      setNotes(duty.notes || '');
    }
  }, [duty]);

  if (!duty) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (bfDone !== duty.breakfast_completed) {
        dutyStore.toggleMealCompletion(duty.duty_date, 'breakfast');
      }
      if (lnDone !== duty.lunch_completed) {
        dutyStore.toggleMealCompletion(duty.duty_date, 'lunch');
      }
      if (notes !== (duty.notes || '')) {
        if (duty.group_id) {
          dutyStore.overrideCookingGroup(duty.duty_date, duty.group_id, notes);
        }
      }

      if (bfDone || lnDone) {
        try {
          confetti({
            particleCount: 35,
            spread: 45,
            origin: { y: 0.7 },
            colors: ['#059669', '#10b981'],
          });
        } catch {}
      }

      showToast('Cooking duties saved', 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to update duty', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupDetails = duty.group_id ? dutyStore.getGroupsWithMembers().find((g) => g.id === duty.group_id) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-900 animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Cooking Duty Confirmation
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {duty.duty_date} • {duty.is_no_duty ? 'Friday Off (No Food Duty)' : (groupDetails?.name || `Group ${duty.group_id}`)}
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Assigned Students */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
              {duty.is_no_duty ? 'Status:' : `Assigned Student Chefs (${groupDetails?.is_holiday_only ? 'College Team' : 'Regular Team'}):`}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {duty.is_no_duty ? (
                <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 font-bold">
                  Friday Off (No morning or evening cooking duty)
                </span>
              ) : (
                groupDetails?.members.map((m) => (
                  <span
                    key={m.id}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold shadow-2xs"
                  >
                    {m.name}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Meals Completion Toggles */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Meal Status
            </label>

            {/* Breakfast Checkbox Card */}
            <button
              type="button"
              onClick={() => setBfDone(!bfDone)}
              className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                bfDone
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Coffee className={`w-4 h-4 ${bfDone ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span className="text-xs font-bold">Breakfast Prepared</span>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                bfDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {bfDone ? 'Completed' : 'Pending'}
              </span>
            </button>

            {/* Lunch Checkbox Card */}
            <button
              type="button"
              onClick={() => setLnDone(!lnDone)}
              className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                lnDone
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Utensils className={`w-4 h-4 ${lnDone ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span className="text-xs font-bold">Lunch Prepared</span>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                lnDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {lnDone ? 'Completed' : 'Pending'}
              </span>
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special requirements, menu notes..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:bg-white focus:border-emerald-500"
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
              className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/30 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
