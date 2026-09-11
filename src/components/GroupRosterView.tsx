'use client';

import React, { useState, useEffect } from 'react';
import { Group, Student } from '@/types/database';
import { dutyStore } from '@/lib/dutyStore';
import { Users, Utensils, CheckCircle2, Clock, Edit3 } from 'lucide-react';
import { EditGroupModal } from './EditGroupModal';

export const GroupRosterView: React.FC = () => {
  const [groups, setGroups] = useState<(Group & { members: Student[] })[]>([]);
  const [stats, setStats] = useState(dutyStore.getImamStats().stats);
  const [selectedGroupForEdit, setSelectedGroupForEdit] = useState<(Group & { members: Student[] }) | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadData = () => {
    setGroups(dutyStore.getGroupsWithMembers());
    setStats(dutyStore.getImamStats().stats);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = dutyStore.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const handleOpenEdit = (group: Group & { members: Student[] }) => {
    setSelectedGroupForEdit(group);
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 mb-1">
            <Users className="w-3.5 h-3.5" />
            <span>Roster & Allocation Directory</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            8 Teams • 16 Students
          </h2>
          <p className="text-xs text-slate-400">
            Groups 1–5 (Regular) & Groups 6–8 (College Weekend/Holiday Teams)
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600">
            <span>Regular: </span>
            <strong className="text-emerald-700">5 Groups</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600">
            <span>College: </span>
            <strong className="text-purple-700">3 Groups</strong>
          </div>
        </div>
      </div>

      {/* Grid of 8 Groups */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {groups.map((group) => {
          return (
            <div
              key={group.id}
              className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Group Title Badge + Edit Button */}
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 rounded-xl font-extrabold text-xs flex items-center justify-center border ${
                      group.is_holiday_only
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      G{group.id}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{group.name}</h3>
                      <p className="text-[10px] font-semibold text-slate-400">
                        {group.is_holiday_only ? 'College (Holidays Only)' : 'Regular Working Team'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      group.is_holiday_only
                        ? 'bg-purple-100/70 text-purple-800'
                        : 'bg-emerald-100/70 text-emerald-800'
                    }`}>
                      {group.is_holiday_only ? 'College' : 'Regular'}
                    </span>
                    
                    {/* Edit Group Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(group)}
                      className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 border border-slate-200 transition-colors flex items-center gap-1 active:scale-95"
                      title="Edit group name & members"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                      <span className="text-[11px] font-bold">Edit</span>
                    </button>
                  </div>
                </div>

                {/* 2 Members in this group */}
                <div className="space-y-2">
                  {group.members.map((member) => {
                    const memberStats = stats.find((s) => s.student.id === member.id);
                    return (
                      <div
                        key={member.id}
                        className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block truncate max-w-[130px]">
                              {member.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Led: <strong className="text-slate-700 font-bold">{memberStats?.allTimeLedCount || 0}</strong> prayers
                            </span>
                          </div>
                        </div>

                        <div>
                          {memberStats?.hasLedCurrentRound ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Round Done</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Group Kitchen Role Summary */}
              <div className="mt-4 pt-2.5 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Utensils className="w-3.5 h-3.5 text-amber-500" />
                  Teachers&apos; Kitchen
                </span>
                <span className="text-slate-600 font-medium">
                  {group.is_holiday_only ? 'Holiday Rotation' : 'Weekday Rotation'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Group Modal */}
      {isEditModalOpen && selectedGroupForEdit && (
        <EditGroupModal
          group={selectedGroupForEdit}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedGroupForEdit(null);
          }}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
