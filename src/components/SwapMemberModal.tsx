'use client';

import React, { useState, useEffect } from 'react';
import { Student } from '@/types/database';
import { dutyStore } from '@/lib/dutyStore';
import { useToast } from '@/context/ToastContext';
import { X, ArrowRightLeft, User, Search, AlertCircle } from 'lucide-react';

interface SwapMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  dutyDate: string;
  currentMembers: Student[];
  onSuccess?: () => void;
}

export const SwapMemberModal: React.FC<SwapMemberModalProps> = ({
  isOpen,
  onClose,
  dutyDate,
  currentMembers,
  onSuccess,
}) => {
  const [studentOutId, setStudentOutId] = useState<string>('');
  const [studentInId, setStudentInId] = useState<string>('');
  const [isPermanent, setIsPermanent] = useState<boolean>(false);
  
  const { showToast } = useToast();
  const allStudents = dutyStore.getStudents();

  // Exclude current members from the list of possible replacements
  const availableReplacements = allStudents.filter(
    (s) => !currentMembers.some((m) => m.id === s.id) && s.is_active
  );

  useEffect(() => {
    if (isOpen) {
      setStudentOutId('');
      setStudentInId('');
      setIsPermanent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentOutId || !studentInId) {
      showToast('Please select both students to swap', 'error');
      return;
    }

    try {
      dutyStore.swapCookingDutyMembers(dutyDate, studentOutId, studentInId, isPermanent);
      
      const outName = currentMembers.find((m) => m.id === studentOutId)?.name || 'Member';
      const inName = allStudents.find((s) => s.id === studentInId)?.name || 'New Member';
      
      showToast(
        `Successfully swapped ${outName} with ${inName} ${isPermanent ? 'permanently' : 'temporarily'}`,
        'success'
      );
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to swap members', 'error');
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
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Swap Group Member</h2>
              <p className="text-[10px] font-semibold text-slate-500">
                {new Date(dutyDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          <form id="swap-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Step 1: Who is swapping out */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[9px]">1</span>
                <span>Who is swapping out? (Current Member)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentMembers.map(member => (
                  <label 
                    key={member.id}
                    className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      studentOutId === member.id 
                        ? 'border-amber-500 bg-amber-50' 
                        : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="studentOut" 
                      value={member.id}
                      checked={studentOutId === member.id}
                      onChange={(e) => setStudentOutId(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        studentOutId === member.id ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {member.name.charAt(0)}
                      </div>
                      <span className={`text-sm font-semibold ${
                        studentOutId === member.id ? 'text-amber-900' : 'text-slate-700'
                      }`}>
                        {member.name}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Step 2: Who is swapping in */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[9px]">2</span>
                <span>Who is swapping in? (Replacement)</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                  value={studentInId}
                  onChange={(e) => setStudentInId(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-0 text-sm font-medium transition-colors appearance-none"
                >
                  <option value="">Select a replacement...</option>
                  {availableReplacements.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name} (Group {student.group_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 3: Swap Type */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[9px]">3</span>
                <span>Swap Type</span>
              </label>
              
              <div className="flex flex-col space-y-2">
                <label className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  !isPermanent ? 'bg-white border-amber-200' : 'bg-transparent border-transparent opacity-60'
                }`}>
                  <input 
                    type="radio" 
                    name="swapType" 
                    checked={!isPermanent}
                    onChange={() => setIsPermanent(false)}
                    className="mt-1 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <div className="text-sm font-bold text-slate-900">Temporary Swap</div>
                    <p className="text-xs text-slate-500 mt-0.5">Only applies to this specific duty date. Automatically resets afterwards.</p>
                  </div>
                </label>

                <label className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isPermanent ? 'bg-white border-red-200' : 'bg-transparent border-transparent opacity-60'
                }`}>
                  <input 
                    type="radio" 
                    name="swapType" 
                    checked={isPermanent}
                    onChange={() => setIsPermanent(true)}
                    className="mt-1 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <div className="text-sm font-bold text-red-900">Permanent Change</div>
                    <p className="text-xs text-red-700/80 mt-0.5">Permanently exchanges the group assignments of both students.</p>
                  </div>
                </label>
              </div>
            </div>

          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="swap-form"
            disabled={!studentOutId || !studentInId}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center space-x-2 ${
              !studentOutId || !studentInId
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : isPermanent
                  ? 'bg-red-600 hover:bg-red-700 text-white border-transparent'
                  : 'bg-amber-500 hover:bg-amber-600 text-white border-transparent'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Confirm Swap</span>
          </button>
        </div>

      </div>
    </div>
  );
};
