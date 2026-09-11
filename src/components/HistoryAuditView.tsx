'use client';

import React, { useState, useEffect } from 'react';
import { CookingDuty, ImamLog, Student, Group, StudentImamStats } from '@/types/database';
import { dutyStore } from '@/lib/dutyStore';
import { History, Search, Coffee, Utensils, CheckCircle2, Award, Clock } from 'lucide-react';

export const HistoryAuditView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'cooking' | 'imam' | 'leaderboard'>('cooking');
  const [search, setSearch] = useState('');
  const [cookingDuties, setCookingDuties] = useState<CookingDuty[]>([]);
  const [imamLogs, setImamLogs] = useState<ImamLog[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<(Group & { members: Student[] })[]>([]);
  const [imamStats, setImamStats] = useState<StudentImamStats[]>([]);
  const [mounted, setMounted] = useState(false);

  const loadData = () => {
    setCookingDuties(dutyStore.getCookingDuties());
    setImamLogs(dutyStore.getImamLogs());
    setStudents(dutyStore.getStudents());
    setGroups(dutyStore.getGroupsWithMembers());
    setImamStats(dutyStore.getImamStats().stats);
  };

  useEffect(() => {
    setMounted(true);
    loadData();
    const unsubscribe = dutyStore.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const filteredCooking = cookingDuties
    .filter((d) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const groupObj = groups.find((g) => g.id === d.group_id);
      return (
        d.duty_date.includes(q) ||
        d.notes?.toLowerCase().includes(q) ||
        groupObj?.name.toLowerCase().includes(q) ||
        groupObj?.members.some((m) => m.name.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => new Date(b.duty_date).getTime() - new Date(a.duty_date).getTime());

  const filteredImam = imamLogs
    .filter((l) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const st = students.find((s) => s.id === l.student_id);
      const sub = students.find((s) => s.id === l.replacement_student_id);
      return (
        l.date.includes(q) ||
        l.prayer_name.toLowerCase().includes(q) ||
        st?.name.toLowerCase().includes(q) ||
        sub?.name.toLowerCase().includes(q) ||
        l.notes?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());

  const sortedLeaderboard = [...imamStats].sort((a, b) => b.allTimeLedCount - a.allTimeLedCount);

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-700">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Audit Trail & Performance
              </h2>
              <p className="text-xs text-slate-400">Complete records of meals cooked & prayers led</p>
            </div>
          </div>

          {/* Sub-tab segmented pill */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/60 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveSubTab('cooking')}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                activeSubTab === 'cooking'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Cooking ({filteredCooking.length})
            </button>
            <button
              onClick={() => setActiveSubTab('imam')}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                activeSubTab === 'imam'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Prayers ({filteredImam.length})
            </button>
            <button
              onClick={() => setActiveSubTab('leaderboard')}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                activeSubTab === 'leaderboard'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Leaderboard
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {activeSubTab !== 'leaderboard' && (
          <div className="mt-3 relative">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by date, student name, meal, prayer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:bg-white focus:border-emerald-500"
            />
          </div>
        )}
      </div>

      {/* 1. COOKING TAB */}
      {activeSubTab === 'cooking' && (
        <div className="space-y-2.5">
          {filteredCooking.map((duty) => {
            const grp = groups.find((g) => g.id === duty.group_id);
            return (
              <div
                key={duty.duty_date}
                className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">{duty.duty_date}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      duty.is_no_duty
                        ? 'bg-purple-100 text-purple-800'
                        : duty.is_holiday ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {duty.is_no_duty ? 'Friday Off' : duty.is_holiday ? 'Holiday (College Team)' : 'Regular Day'}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      duty.is_no_duty ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-900'
                    }`}>
                      {duty.is_no_duty ? 'No Food Duty' : (grp?.name || `Group ${duty.group_id}`)}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {duty.is_no_duty ? 'Morning & Evening Off' : grp?.members.map((m) => m.name).join(' & ')}
                  </span>
                </div>

                {/* Meals Status */}
                {duty.is_no_duty ? (
                  <div className="py-1.5 px-3 rounded-xl bg-slate-50 text-xs text-slate-500 font-medium flex items-center justify-between">
                    <span>Mess Off: No morning (breakfast) or evening (lunch) duty</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Off Day</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className={`p-2.5 rounded-2xl text-xs flex items-center justify-between ${
                      duty.breakfast_completed ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-50 text-slate-500'
                    }`}>
                      <span className="font-semibold flex items-center gap-1.5">
                        <Coffee className="w-3.5 h-3.5" />
                        Breakfast
                      </span>
                      <span className="font-bold text-[10px]">
                        {duty.breakfast_completed ? 'Completed' : 'Pending'}
                      </span>
                    </div>

                    <div className={`p-2.5 rounded-2xl text-xs flex items-center justify-between ${
                      duty.lunch_completed ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-50 text-slate-500'
                    }`}>
                      <span className="font-semibold flex items-center gap-1.5">
                        <Utensils className="w-3.5 h-3.5" />
                        Lunch
                      </span>
                      <span className="font-bold text-[10px]">
                        {duty.lunch_completed ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 2. PRAYERS TAB */}
      {activeSubTab === 'imam' && (
        <div className="space-y-2.5">
          {filteredImam.map((log) => {
            const st = students.find((s) => s.id === log.student_id);
            const sub = students.find((s) => s.id === log.replacement_student_id);
            return (
              <div
                key={log.id}
                className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">{log.date}</span>
                    <span className="text-xs font-bold text-emerald-800 px-2 py-0.5 rounded-md bg-emerald-50">
                      {log.prayer_name}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {log.status === 'external_imam' ? 'External / Guest Imam' : st?.name}
                    </span>
                  </div>

                  {(log.status === 'replaced' || log.status === 'absent_replaced') && sub && (
                    <p className="text-[11px] text-amber-700 mt-1">
                      Substitute Imam: <strong>{sub.name}</strong> (Replaced {st?.name})
                    </p>
                  )}
                  {log.notes && (
                    <p className="text-[11px] text-slate-400 italic mt-0.5">&ldquo;{log.notes}&rdquo;</p>
                  )}
                </div>

                <div className="shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    log.status === 'completed' || log.status === 'led'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : log.status === 'replaced' || log.status === 'absent_replaced'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {log.status === 'completed' || log.status === 'led' ? 'Led by Student' : log.status === 'external_imam' ? 'External' : 'Replaced'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. LEADERBOARD TAB */}
      {activeSubTab === 'leaderboard' && (
        <div className="space-y-2">
          {sortedLeaderboard.map((item, idx) => (
            <div
              key={item.student.id}
              className="p-3.5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  idx === 0 ? 'bg-amber-100 text-amber-800' : idx === 1 ? 'bg-slate-200 text-slate-700' : idx === 2 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-400'
                }`}>
                  {idx + 1}
                </span>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{item.student.name}</h4>
                  <span className="text-[10px] text-slate-400">Group {item.student.group_id}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                  {item.allTimeLedCount} prayers led
                </span>
                {item.hasLedCurrentRound && (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    Round Done
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
