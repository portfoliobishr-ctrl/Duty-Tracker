'use client';

import React, { useEffect } from 'react';
import { dutyStore } from '@/lib/dutyStore';
import { 
  X, 
  Utensils, 
  Compass, 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  UserCheck, 
  Coffee, 
  SunMedium,
  Clock
} from 'lucide-react';

interface StudentDetailModalProps {
  studentId: string | null;
  onClose: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  studentId,
  onClose,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!studentId) return null;

  const history = dutyStore.getStudentDutyHistory(studentId);
  if (!history) return null;

  const { student, group, cookingHistory, imamHistory, totalFoodDuties, totalPrayersLed } = history;
  const isCollege = student.group_id >= 6;
  const hasAnyRecords = totalFoodDuties > 0 || totalPrayersLed > 0;

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-xs ${
              isCollege 
                ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' 
                : 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white'
            }`}>
              {student.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {student.name}
              </h3>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                  isCollege ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {group.name}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">
                  {isCollege ? 'College Pool' : 'Regular Pool'}
                </span>
              </div>
            </div>
          </div>

          {/* Close Button (Touch optimized 44x44) */}
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all focus:outline-none"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Summary Metric Cards */}
        <div className="p-4 sm:p-5 pb-3 grid grid-cols-2 gap-3 bg-slate-50/50 border-b border-slate-100">
          <div className="bg-white p-3 rounded-2xl border border-orange-100 shadow-xs flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Food Prep
              </span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <span className="text-xl font-extrabold text-orange-600">
                  {totalFoodDuties}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  {totalFoodDuties === 1 ? 'duty' : 'duties'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-emerald-100 shadow-xs flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Prayers Led
              </span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <span className="text-xl font-extrabold text-emerald-600">
                  {totalPrayersLed}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  {totalPrayersLed === 1 ? 'prayer' : 'prayers'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content History */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          
          {!hasAnyRecords ? (
            /* Friendly Empty State */
            <div className="py-12 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <Sparkles className="w-7 h-7 text-slate-300" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">
                No duty records logged yet.
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Completed cooking duties or prayers led by {student.name} will appear here automatically.
              </p>
            </div>
          ) : (
            <>
              {/* SECTION 1: Food Preparation History */}
              <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Utensils className="w-4 h-4 text-orange-600" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Food Preparation History
                    </h4>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200/50">
                    {totalFoodDuties} logged
                  </span>
                </div>

                {cookingHistory.length > 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 shadow-2xs overflow-hidden">
                    {cookingHistory.map((item) => {
                      return (
                        <div key={item.id} className="p-3 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                          <div className="flex items-start space-x-2.5">
                            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900">
                                {formatDate(item.duty_date)}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-2">
                                <span>{item.is_holiday ? 'Holiday / College Rotation' : 'Regular Rotation'}</span>
                                {item.notes && <span className="text-slate-400">• {item.notes}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Status Tag */}
                          <div>
                            {item.mealStatus === 'Both' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                                Both
                              </span>
                            )}
                            {item.mealStatus === 'Breakfast Completed' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                                <Coffee className="w-3 h-3 mr-1 text-amber-600" />
                                Breakfast Completed
                              </span>
                            )}
                            {item.mealStatus === 'Lunch Completed' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-bold bg-orange-50 text-orange-800 border border-orange-200/60">
                                <SunMedium className="w-3 h-3 mr-1 text-orange-600" />
                                Lunch Completed
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    No cooking duties completed yet.
                  </div>
                )}
              </section>

              {/* PRAYER DUTY SECTIONS */}
              {['Asr', 'Haddad', 'Isha_Azaan'].map((dutyName) => {
                const logs = imamHistory.filter((item) => item.prayer_name === dutyName);
                const displayName = dutyName.replace('_', ' ');
                
                return (
                  <section key={dutyName} className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Compass className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          {displayName} Duty History
                        </h4>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                        {logs.length} led
                      </span>
                    </div>

                    {logs.length > 0 ? (
                      <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 shadow-2xs overflow-hidden">
                        {logs.map((item) => {
                          return (
                            <div key={item.id} className="p-3 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                              <div className="flex items-start space-x-2.5">
                                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                                  <Calendar className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-slate-900">
                                    {formatDate(item.date)}
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">
                                    {item.roleType === 'substitute' && item.originalStudentName ? (
                                      <span className="text-amber-700 font-medium">
                                        Substituted for {item.originalStudentName}
                                      </span>
                                    ) : item.notes ? (
                                      <span>{item.notes}</span>
                                    ) : (
                                      <span>{displayName} Duty</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Role Tag */}
                              <div>
                                {item.roleType === 'regular' && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                                    Regular Rotation
                                  </span>
                                )}
                                {item.roleType === 'holiday' && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                                    <Sparkles className="w-3 h-3 mr-1 text-amber-600" />
                                    Holiday Rotation
                                  </span>
                                )}
                                {item.roleType === 'substitute' && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                                    <UserCheck className="w-3 h-3 mr-1 text-purple-600" />
                                    Substitute
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        No {displayName} duties led yet.
                      </div>
                    )}
                  </section>
                );
              })}
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 shadow-xs hover:bg-slate-50 active:scale-95 transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
