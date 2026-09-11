'use client';

import React, { useState, useEffect } from 'react';
import { Group, Student } from '@/types/database';
import { dutyStore } from '@/lib/dutyStore';
import { useToast } from '@/context/ToastContext';
import { 
  X, 
  Users, 
  CheckCircle2, 
  User, 
  ShieldCheck, 
  Sparkles,
  CalendarDays
} from 'lucide-react';

interface EditGroupModalProps {
  group: (Group & { members: Student[] }) | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditGroupModal: React.FC<EditGroupModalProps> = ({
  group,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [isHolidayOnly, setIsHolidayOnly] = useState(false);
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (group && isOpen) {
      setName(group.name);
      setIsHolidayOnly(Boolean(group.is_holiday_only));
      setDescription(group.description || '');
      setMembers(
        group.members.map((m) => ({
          id: m.id,
          name: m.name,
        }))
      );
    }
  }, [group, isOpen]);

  if (!isOpen || !group) return null;

  const handleMemberNameChange = (id: string, newName: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, name: newName } : m))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Group name cannot be empty', 'error');
      return;
    }
    for (const m of members) {
      if (!m.name.trim()) {
        showToast('Member names cannot be empty', 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      dutyStore.updateGroupWithMembers(group.id, {
        name: name.trim(),
        is_holiday_only: isHolidayOnly,
        description: description.trim() || undefined,
        members,
      });

      showToast(`${name.trim()} and members updated successfully!`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to update group', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-900 animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-extrabold text-sm border ${
              isHolidayOnly 
                ? 'bg-purple-50 text-purple-700 border-purple-200' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              G{group.id}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900">
                Edit {group.name}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Configure team title, availability, and student names
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
          
          {/* 1. Group Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Group Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Group 1, Team Alpha"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
            />
          </div>

          {/* 2. Team Category (Regular vs College Holiday) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Team Category & Availability</span>
              <span className="text-[11px] font-normal text-slate-400">Determines cooking engine</span>
            </label>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsHolidayOnly(false)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  !isHolidayOnly
                    ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full ${!isHolidayOnly ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                  <span className="text-xs font-bold text-slate-900">Regular Team</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Scheduled on regular working days (Groups 1–5 cycle)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setIsHolidayOnly(true)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  isHolidayOnly
                    ? 'bg-purple-50/80 border-purple-400 text-purple-950 ring-2 ring-purple-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full ${isHolidayOnly ? 'bg-purple-600' : 'bg-slate-300'}`} />
                  <span className="text-xs font-bold text-slate-900">College Team</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Holidays & weekends only (Groups 6–8 cycle)
                </p>
              </button>
            </div>
          </div>

          {/* 3. Member Names */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                Assigned Students (2 Members)
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                Rotates Cooking & Imam duties
              </span>
            </div>

            {members.map((member, idx) => (
              <div key={member.id} className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-600">
                  Student {idx + 1}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) => handleMemberNameChange(member.id, e.target.value)}
                    required
                    placeholder={`Student ${idx + 1} Name`}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 4. Description / Role Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Description / Notes (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Teachers Kitchen Team 1"
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
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/30 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
