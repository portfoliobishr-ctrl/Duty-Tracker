'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { dutyStore } from '@/lib/dutyStore';
import { StudentReport } from '@/types/database';
import { StudentDetailModal } from './StudentDetailModal';
import { 
  Search, 
  Utensils, 
  Compass, 
  Users, 
  CheckCircle2, 
  Clock,
  Sparkles,
  X,
  ChevronRight
} from 'lucide-react';

export const StudentReportsView: React.FC = () => {
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const refreshData = () => {
    setReports(dutyStore.getStudentReports());
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = dutyStore.subscribe(refreshData);
    return () => unsubscribe();
  }, []);

  // Filter students by search query
  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(
      (r) =>
        r.student.name.toLowerCase().includes(q) ||
        r.group.name.toLowerCase().includes(q) ||
        `group ${r.student.group_id}`.includes(q)
    );
  }, [reports, searchQuery]);

  // Aggregate stats
  const totalStudents = reports.length;
  const totalFoodDutiesCompleted = reports.reduce((acc, r) => acc + r.totalFoodDuties, 0) / 2; // 2 students per group
  const totalAsrPrayersLed = reports.reduce((acc, r) => acc + r.totalAsrLed, 0);

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-8">
      
      {/* Header & Quick Summary Stat Badges */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs text-center">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
            Students
          </span>
          <span className="text-lg font-extrabold text-slate-900 mt-0.5 block">
            {totalStudents}
          </span>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs text-center">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider truncate">
            Food Duties
          </span>
          <span className="text-lg font-extrabold text-orange-600 mt-0.5 block">
            {Math.round(totalFoodDutiesCompleted)}
          </span>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs text-center">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider truncate">
            Asr Prayers
          </span>
          <span className="text-lg font-extrabold text-emerald-600 mt-0.5 block">
            {totalAsrPrayersLed}
          </span>
        </div>
      </div>

      {/* Search Bar (Min 48px height touch friendly) */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search student or group name..."
          className="w-full min-h-[48px] pl-10 pr-10 py-2.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Student List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {filteredReports.length > 0 ? (
          filteredReports.map((report) => {
            const isCollege = report.student.group_id >= 6;

            return (
              <div 
                key={report.student.id}
                onClick={() => setSelectedStudentId(report.student.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedStudentId(report.student.id);
                  }
                }}
                className="p-3.5 hover:bg-slate-50/90 active:bg-slate-100/80 cursor-pointer transition-all group select-none"
              >
                <div className="flex items-center justify-between">
                  {/* Student Info */}
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-2xs group-hover:scale-105 transition-transform ${
                      isCollege 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-emerald-100/70 text-emerald-800'
                    }`}>
                      {report.student.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                          {report.student.name}
                        </span>
                        {report.isNextAsrCandidate && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Next Asr
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {report.group.name} • {isCollege ? 'College' : 'Regular'}
                      </span>
                    </div>
                  </div>

                  {/* Duty Counts + Chevron */}
                  <div className="flex items-center space-x-2">
                    {/* Food Duties Badge */}
                    <div 
                      title="Total Food Duties Completed"
                      className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${
                        report.totalFoodDuties > 0
                          ? 'bg-orange-50/80 text-orange-800 border-orange-200/60'
                          : 'bg-slate-50 text-slate-400 border-slate-200/50'
                      }`}
                    >
                      <Utensils className="w-3.5 h-3.5 text-orange-600" />
                      <span>{report.totalFoodDuties}</span>
                    </div>

                    {/* Asr Prayers Led Badge */}
                    <div 
                      title="Total Asr Prayers Led"
                      className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${
                        report.totalAsrLed > 0
                          ? 'bg-emerald-50/80 text-emerald-800 border-emerald-200/60'
                          : 'bg-slate-50 text-slate-400 border-slate-200/50'
                      }`}
                    >
                      <Compass className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{report.totalAsrLed}</span>
                    </div>

                    {/* Navigation Chevron */}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-0.5" />
                  </div>
                </div>

                {/* Round 1 Status Pill */}
                <div className="mt-2 pl-13 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center space-x-1">
                    {report.hasLedCurrentRound ? (
                      <span className="text-emerald-700 font-medium flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Round 1 turn completed</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Round 1 turn pending</span>
                      </span>
                    )}
                  </div>
                  {report.totalFoodDuties > 0 && (
                    <span className="text-slate-500 font-medium">
                      {report.totalFoodDuties} cooking {report.totalFoodDuties === 1 ? 'turn' : 'turns'} done
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-slate-400 text-sm">
            No students found matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>

      {/* Student Detailed Activity Modal */}
      <StudentDetailModal
        studentId={selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
      />

    </div>
  );
};
