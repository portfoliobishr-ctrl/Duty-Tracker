'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Edit3 } from 'lucide-react';
import { dutyStore } from '@/lib/dutyStore';
import { useToast } from '@/context/ToastContext';

interface ChangeGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  dutyDate: string;
  currentGroupId: number | null;
  onSuccess: () => void;
}

export const ChangeGroupModal: React.FC<ChangeGroupModalProps> = ({
  isOpen,
  onClose,
  dutyDate,
  currentGroupId,
  onSuccess
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<number>(currentGroupId || 1);
  const { showToast } = useToast();
  
  const groups = dutyStore.getGroupsWithMembers();

  useEffect(() => {
    if (isOpen) {
      setSelectedGroupId(currentGroupId || 1);
    }
  }, [isOpen, currentGroupId]);

  if (!isOpen) return null;

  const handleSave = () => {
    dutyStore.overrideCookingGroup(dutyDate, selectedGroupId, 'Manual override - Group changed via Edit Duty');
    showToast(`Cooking Duty changed to Group ${selectedGroupId}`, 'success');
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-900 flex items-center space-x-2">
            <Edit3 className="w-4 h-4 text-emerald-600" />
            <span>Edit Duty / Change Group</span>
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-xs text-slate-500">
            Select the cooking group to assign for <strong>{new Date(dutyDate).toLocaleDateString()}</strong>.
            This change will be saved to Supabase and strictly bound to this date.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Assigned Group
            </label>
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
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Duty</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
