'use client';

import {
  Group,
  Student,
  CookingDuty,
  ImamRound,
  ImamLog,
  PrayerSlot,
  ImamLogStatus,
  StudentImamStats,
  SystemSettings,
  PoolType,
  PoolStats,
  StudentReport,
  DailyImamState,
} from '@/types/database';
import {
  INITIAL_GROUPS,
  INITIAL_STUDENTS,
  INITIAL_PRAYER_SLOTS,
  INITIAL_ROUNDS,
  INITIAL_SYSTEM_SETTINGS,
  generateInitialCookingDuties,
  generateInitialImamLogs,
  getRelativeDateString,
  isFriday,
  isHolidayOrSunday,
} from './seedData';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEYS = {
  GROUPS: 'duty_tracker_groups_v8',
  STUDENTS: 'duty_tracker_students_v10',
  COOKING: 'duty_tracker_cooking_duties_v10',
  ROUNDS: 'duty_tracker_imam_rounds_v9',
  IMAM_LOGS: 'duty_tracker_imam_logs_v9',
  SETTINGS: 'duty_tracker_settings_v10',
  DAILY_IMAM_STATE: 'duty_tracker_daily_imam_state_v1',
};

class DutyStore {
  private listeners: Set<() => void> = new Set();
  public isSyncing: boolean = false;

  public async syncFromSupabase(): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase || typeof window === 'undefined') return false;

    this.isSyncing = true;
    this.notify();

    try {
      const [
        { data: groups, error: e1 },
        { data: students, error: e2 },
        { data: cooking, error: e3 },
        { data: rounds, error: e4 },
        { data: logs, error: e5 },
        { data: settings, error: e6 }
      ] = await Promise.all([
        supabase.from('groups').select('*').order('id'),
        supabase.from('students').select('*').order('id'),
        supabase.from('cooking_duties').select('*'),
        supabase.from('imam_rounds').select('*'),
        supabase.from('imam_logs').select('*'),
        supabase.from('system_settings').select('*')
      ]);

      if (e1 || e2 || e3 || e4 || e5 || e6) {
        console.error("Supabase fetch errors:", { e1, e2, e3, e4, e5, e6 });
        this.isSyncing = false;
        this.notify();
        return false;
      }

      if (groups && groups.length > 0) localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
      if (students && students.length > 0) localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
      if (cooking && cooking.length > 0) localStorage.setItem(STORAGE_KEYS.COOKING, JSON.stringify(cooking));
      if (rounds && rounds.length > 0) localStorage.setItem(STORAGE_KEYS.ROUNDS, JSON.stringify(rounds));
      if (logs && logs.length > 0) localStorage.setItem(STORAGE_KEYS.IMAM_LOGS, JSON.stringify(logs));
      if (settings && settings.length > 0) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings[0]));

      this.isSyncing = false;
      this.notify();
      return true;
    } catch (e) {
      console.error('Failed to sync from database', e);
      this.isSyncing = false;
      this.notify();
      return false;
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    // Schedule notification asynchronously so state updates don't collide with React render cycles
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.listeners.forEach((listener) => {
          try {
            listener();
          } catch (e) {
            console.error('DutyStore listener error:', e);
          }
        });
      }, 0);
    } else {
      this.listeners.forEach((listener) => {
        try {
          listener();
        } catch (e) {
          console.error('DutyStore listener error:', e);
        }
      });
    }
  }

  // --- SYSTEM SETTINGS ---
  public getSystemSettings(): SystemSettings {
    if (typeof window === 'undefined') return INITIAL_SYSTEM_SETTINGS;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) {
        const parsed: SystemSettings = JSON.parse(stored);
        if (!parsed.default_holidays.includes(6)) {
          parsed.default_holidays.push(6);
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch { }
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SYSTEM_SETTINGS));
    return INITIAL_SYSTEM_SETTINGS;
  }

  public saveSystemSettings(settings: SystemSettings) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }
    this.notify();
  }

  // --- SWAPPING & GROUP MANAGEMENT ---
  public swapCookingDutyMembers(dateStr: string, studentOutId: string, studentInId: string, isPermanent: boolean) {
    const students = this.getStudents();
    const sOut = students.find(s => s.id === studentOutId);
    const sIn = students.find(s => s.id === studentInId);
    if (!sOut || !sIn) return;

    if (isPermanent) {
      // Permanent: Swap their group_ids
      const tempGroupId = sOut.group_id;
      sOut.group_id = sIn.group_id;
      sIn.group_id = tempGroupId;

      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
      this.notify();

      if (isSupabaseConfigured() && supabase) {
        supabase.from('students').update({ group_id: sOut.group_id }).eq('id', sOut.id);
        supabase.from('students').update({ group_id: sIn.group_id }).eq('id', sIn.id);
      }
    } else {
      // Temporary: Override for a specific CookingDuty
      let duties = this.getCookingDuties();
      let duty = duties.find(d => d.duty_date === dateStr);
      if (!duty) {
        this.ensureDutyForDate(dateStr);
        duties = this.getCookingDuties();
        duty = duties.find(d => d.duty_date === dateStr)!;
      }

      const groups = this.getGroupsWithMembers();
      const currentGroup = groups.find(g => g.id === duty!.group_id);
      
      let activeIds = duty.active_student_ids && duty.active_student_ids.length > 0
        ? [...duty.active_student_ids]
        : currentGroup?.members.map(m => m.id) || [];

      // Replace studentOut with studentIn
      activeIds = activeIds.map(id => id === studentOutId ? studentInId : id);
      
      duty.active_student_ids = activeIds;
      duty.is_temporary_swap = true;

      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.COOKING, JSON.stringify(duties));
      this.notify();

      if (isSupabaseConfigured() && supabase) {
        supabase.from('cooking_duties').upsert({
          duty_date: duty.duty_date,
          group_id: duty.group_id,
          is_holiday: duty.is_holiday,
          breakfast_completed: duty.breakfast_completed,
          breakfast_completed_at: duty.breakfast_completed_at,
          lunch_completed: duty.lunch_completed,
          lunch_completed_at: duty.lunch_completed_at,
          active_student_ids: duty.active_student_ids,
          is_temporary_swap: duty.is_temporary_swap,
          notes: duty.notes,
        }, { onConflict: 'duty_date' });
      }
    }
  }

  public revertCookingDutySwap(dateStr: string) {
    const duties = this.getCookingDuties();
    const duty = duties.find(d => d.duty_date === dateStr);
    if (!duty) return;

    duty.active_student_ids = null;
    duty.is_temporary_swap = false;

    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.COOKING, JSON.stringify(duties));
    this.notify();

    if (isSupabaseConfigured() && supabase) {
      supabase.from('cooking_duties').update({
        active_student_ids: null,
        is_temporary_swap: false
      }).eq('id', duty.id);
    }
  }

  public resetGroupsToDefault() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
    }
    this.notify();

    if (isSupabaseConfigured() && supabase) {
      // Parallel updates for all 16 initial students
      INITIAL_STUDENTS.forEach(student => {
        supabase!.from('students').update({ group_id: student.group_id }).eq('id', student.id).then();
      });
    }
  }

  // --- DAILY IMAM PENDING STATE ---
  public getDailyImamState(dateStr: string): DailyImamState | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DAILY_IMAM_STATE);
      if (stored) {
        const parsed: DailyImamState = JSON.parse(stored);
        if (parsed.date === dateStr) {
          return parsed;
        } else {
          // Clean up old date state
          localStorage.removeItem(STORAGE_KEYS.DAILY_IMAM_STATE);
        }
      }
    } catch { }
    return null;
  }

  public setDailyImamState(state: DailyImamState) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.DAILY_IMAM_STATE, JSON.stringify(state));
    }
    this.notify();
  }

  public clearDailyImamState() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.DAILY_IMAM_STATE);
    }
    this.notify();
  }

  // --- LOCAL CACHE INITIALIZERS ---
  public getGroups(): Group[] {
    if (typeof window === 'undefined') return INITIAL_GROUPS;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GROUPS);
      if (stored) return JSON.parse(stored);
    } catch { }
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(INITIAL_GROUPS));
    return INITIAL_GROUPS;
  }

  public getStudents(): Student[] {
    if (typeof window === 'undefined') return INITIAL_STUDENTS;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (stored) {
        const parsed: Student[] = JSON.parse(stored);
        if (parsed.some((s) => s.name.includes('Zayd') || s.name.includes('Bilal Ahmed'))) {
          localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
          return INITIAL_STUDENTS;
        }
        return parsed;
      }
    } catch { }
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
    return INITIAL_STUDENTS;
  }

  public getPrayerSlots(): PrayerSlot[] {
    return INITIAL_PRAYER_SLOTS;
  }

  public getCookingDuties(): CookingDuty[] {
    if (typeof window === 'undefined') return generateInitialCookingDuties();
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.COOKING);
      if (stored) {
        const parsed: CookingDuty[] = JSON.parse(stored);
        let updated = false;
        parsed.forEach((d) => {
          if (isFriday(d.duty_date) && !d.is_no_duty && !d.breakfast_completed && !d.lunch_completed) {
            d.is_no_duty = true;
            d.group_id = null;
            d.notes = 'Friday - No Food Duty (Morning & Evening)';
            updated = true;
          }
        });
        if (updated) {
          localStorage.setItem(STORAGE_KEYS.COOKING, JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch { }
    const initial = generateInitialCookingDuties();
    localStorage.setItem(STORAGE_KEYS.COOKING, JSON.stringify(initial));
    return initial;
  }

  public getImamRounds(): ImamRound[] {
    if (typeof window === 'undefined') return INITIAL_ROUNDS;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ROUNDS);
      if (stored) return JSON.parse(stored);
    } catch { }
    localStorage.setItem(STORAGE_KEYS.ROUNDS, JSON.stringify(INITIAL_ROUNDS));
    return INITIAL_ROUNDS;
  }

  public getImamLogs(): ImamLog[] {
    if (typeof window === 'undefined') return generateInitialImamLogs(INITIAL_ROUNDS[0].id);
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.IMAM_LOGS);
      if (stored) return JSON.parse(stored);
    } catch { }
    const initial = generateInitialImamLogs(INITIAL_ROUNDS[0].id);
    localStorage.setItem(STORAGE_KEYS.IMAM_LOGS, JSON.stringify(initial));
    return initial;
  }

  // --- GROUPS WITH MEMBERS ---
  public getGroupsWithMembers(): (Group & { members: Student[] })[] {
    const groups = this.getGroups();
    const students = this.getStudents();
    return groups.map((g) => ({
      ...g,
      members: students.filter((s) => s.group_id === g.id && s.is_active),
    }));
  }

  // --- UPDATE GROUP AND MEMBERS ---
  public updateGroupWithMembers(groupId: number, params: {
    name: string;
    is_holiday_only: boolean;
    description?: string;
    members: { id: string; name: string }[];
  }): void {
    const groups = this.getGroups();
    const students = this.getStudents();

    const groupIdx = groups.findIndex((g) => g.id === groupId);
    if (groupIdx !== -1) {
      groups[groupIdx] = {
        ...groups[groupIdx],
        name: params.name,
        is_holiday_only: params.is_holiday_only,
        description: params.description ?? groups[groupIdx].description,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
      }

      if (isSupabaseConfigured() && supabase) {
        supabase.from('groups').update({
          name: params.name,
          is_holiday_only: params.is_holiday_only,
          description: params.description ?? groups[groupIdx].description,
        }).eq('id', groupId);
      }
    }

    params.members.forEach((m) => {
      const studentIdx = students.findIndex((s) => s.id === m.id);
      if (studentIdx !== -1) {
        students[studentIdx] = {
          ...students[studentIdx],
          name: m.name.trim(),
        };

        if (isSupabaseConfigured() && supabase) {
          supabase.from('students').update({
            name: m.name.trim(),
          }).eq('id', m.id);
        }
      }
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    }

    this.notify();
  }

  // --- EVENT-DRIVEN QUEUE ADVANCEMENT ---
  // Determines the active cooking group strictly based on the last recorded completed duty
  public getActiveCookingGroup(isHoliday: boolean): number {
    const duties = this.getCookingDuties();

    // Find duties that have at least one meal completed
    const completed = duties.filter(
      (d) => !d.is_no_duty && d.group_id !== null && (d.breakfast_completed || d.lunch_completed)
    );

    if (isHoliday) {
      const holidayCompleted = completed
        .filter((d) => d.is_holiday && d.group_id !== null && d.group_id >= 6 && d.group_id <= 8)
        .sort((a, b) => a.duty_date.localeCompare(b.duty_date));
      const last = holidayCompleted[holidayCompleted.length - 1];
      if (last && last.group_id) {
        return 6 + ((last.group_id - 6 + 1) % 3);
      }
      return 6; // Initial starting group for college pool (Group 6)
    } else {
      const regularCompleted = completed
        .filter((d) => !d.is_holiday && d.group_id !== null && d.group_id >= 1 && d.group_id <= 5)
        .sort((a, b) => a.duty_date.localeCompare(b.duty_date));
      const last = regularCompleted[regularCompleted.length - 1];
      if (last && last.group_id) {
        return 1 + ((last.group_id - 1 + 1) % 5);
      }
      return 1; // Initial starting group for regular pool (Group 1)
    }
  }

  // --- DUAL-SCHEDULING ENGINE FOR COOKING DUTIES ---
  public ensureDutyForDate(dateStr: string): CookingDuty {
    const duties = this.getCookingDuties();
    let duty = duties.find((d) => d.duty_date === dateStr);

    // FRIDAY HAS NO FOOD DUTY (MORNING AND EVENING)
    if (isFriday(dateStr)) {
      if (!duty) {
        duty = {
          id: `duty-${dateStr}`,
          duty_date: dateStr,
          group_id: null,
          is_holiday: false,
          is_no_duty: true,
          breakfast_completed: false,
          breakfast_completed_at: null,
          lunch_completed: false,
          lunch_completed_at: null,
          notes: 'Friday - No Food Duty (Morning & Evening)',
          created_at: new Date().toISOString(),
        };
        duties.push(duty);
        duties.sort((a, b) => a.duty_date.localeCompare(b.duty_date));
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.COOKING, JSON.stringify(duties));
        }
        this.notify();
      } else if (!duty.is_no_duty) {
        duty.is_no_duty = true;
        duty.group_id = null;
        duty.notes = 'Friday - No Food Duty (Morning & Evening)';
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.COOKING, JSON.stringify(duties));
        }
        this.notify();
      }
      return duty;
    }

    const settings = this.getSystemSettings();
    const isHoliday = isHolidayOrSunday(dateStr, settings.default_holidays);
    const activeGroup = this.getActiveCookingGroup(isHoliday);

    if (duty) {
      // If duty has already been completed or manually overridden, keep it intact
      if (duty.breakfast_completed || duty.lunch_completed || duty.notes?.includes('Manual override')) {
        return duty;
      }

      // If it is today's pending duty, ensure it dynamically tracks the current active group
      const today = getRelativeDateString(0);
      if (dateStr === today && duty.group_id !== activeGroup) {
        duty.group_id = activeGroup;
        duty.is_holiday = isHoliday;
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.COOKING, JSON.stringify(duties));
        }
        this.notify();
      }
      return duty;
    }

    const newDuty: CookingDuty = {
      id: `duty-${dateStr}`,
      duty_date: dateStr,
      group_id: activeGroup,
      is_holiday: isHoliday,
      is_no_duty: false,
      breakfast_completed: false,
      breakfast_completed_at: null,
      lunch_completed: false,
      lunch_completed_at: null,
      notes: isHoliday ? 'College Team (Holiday / Weekend)' : null,
      created_at: new Date().toISOString(),
    };

    duties.push(newDuty);
    duties.sort((a, b) => a.duty_date.localeCompare(b.duty_date));

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.COOKING, JSON.stringify(duties));
    }
    this.notify();
    return newDuty;
  }

  public ensureDutiesRange(startOffset = -3, endOffset = 10): CookingDuty[] {
    for (let o = startOffset; o <= endOffset; o++) {
      this.ensureDutyForDate(getRelativeDateString(o));
    }
    return this.getCookingDuties();
  }

  public toggleHoliday(dateStr: string, isHoliday: boolean): CookingDuty {
    let duties = this.getCookingDuties();
    let duty = duties.find((d) => d.duty_date === dateStr);

    if (!duty) {
      this.ensureDutyForDate(dateStr);
      duties = this.getCookingDuties();
      duty = duties.find((d) => d.duty_date === dateStr)!;
    }

    duty.is_holiday = isHoliday;

    if (isHoliday && (!duty.group_id || duty.group_id < 6)) {
      const pastHolidays = duties
        .filter((d) => d.is_holiday && !d.is_no_duty && d.group_id !== null && d.duty_date < dateStr)
        .sort((a, b) => a.duty_date.localeCompare(b.duty_date));
      const lastHoliday = pastHolidays[pastHolidays.length - 1];
      duty.group_id = lastHoliday && lastHoliday.group_id && lastHoliday.group_id >= 6
        ? 6 + ((lastHoliday.group_id - 6 + 1) % 3)
        : 6;
      duty.is_no_duty = false;
      duty.notes = 'College Team (Holiday / Weekend)';
    } else if (!isHoliday && duty.group_id && duty.group_id >= 6) {
      const pastRegulars = duties
        .filter((d) => !d.is_holiday && !d.is_no_duty && d.group_id !== null && d.duty_date < dateStr)
        .sort((a, b) => a.duty_date.localeCompare(b.duty_date));
      const lastRegular = pastRegulars[pastRegulars.length - 1];
      duty.group_id = lastRegular && lastRegular.group_id && lastRegular.group_id <= 5
        ? 1 + ((lastRegular.group_id - 1 + 1) % 5)
        : 1;
      duty.is_no_duty = false;
      duty.notes = null;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.COOKING, JSON.stringify(duties));
    }
    this.notify();

    if (isSupabaseConfigured() && supabase) {
      supabase.from('cooking_duties').upsert({
        duty_date: duty.duty_date,
        group_id: duty.group_id,
        is_holiday: duty.is_holiday,
        breakfast_completed: duty.breakfast_completed,
        breakfast_completed_at: duty.breakfast_completed_at,
        lunch_completed: duty.lunch_completed,
        lunch_completed_at: duty.lunch_completed_at,
        active_student_ids: duty.active_student_ids || null,
        is_temporary_swap: duty.is_temporary_swap || false,
        notes: duty.notes,
      }, { onConflict: 'duty_date' });
    }

    return duty;
  }

  public overrideCookingGroup(dateStr: string, groupId: number, notes?: string): CookingDuty {
    let duties = this.getCookingDuties();
    let duty = duties.find((d) => d.duty_date === dateStr);

    if (!duty) {
      this.ensureDutyForDate(dateStr);
      duties = this.getCookingDuties();
      duty = duties.find((d) => d.duty_date === dateStr)!;
    }

    duty.group_id = groupId;
    duty.is_no_duty = false;
    if (notes !== undefined) duty.notes = notes;

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.COOKING, JSON.stringify(duties));
    }
    this.notify();

    if (isSupabaseConfigured() && supabase) {
      supabase.from('cooking_duties').upsert({
        duty_date: duty.duty_date,
        group_id: duty.group_id,
        is_holiday: duty.is_holiday,
        breakfast_completed: duty.breakfast_completed,
        breakfast_completed_at: duty.breakfast_completed_at,
        lunch_completed: duty.lunch_completed,
        lunch_completed_at: duty.lunch_completed_at,
        active_student_ids: duty.active_student_ids || null,
        is_temporary_swap: duty.is_temporary_swap || false,
        notes: duty.notes,
      }, { onConflict: 'duty_date' });
    }

    return duty;
  }

  public setNoFoodDuty(dateStr: string, isNoDuty: boolean): CookingDuty {
    let duties = this.getCookingDuties();
    let duty = duties.find((d) => d.duty_date === dateStr);

    if (!duty) {
      this.ensureDutyForDate(dateStr);
      duties = this.getCookingDuties();
      duty = duties.find((d) => d.duty_date === dateStr)!;
    }

    duty.is_no_duty = isNoDuty;
    if (isNoDuty) {
      duty.group_id = null;
      duty.notes = isFriday(dateStr)
        ? 'Friday - No Food Duty (Morning & Evening)'
        : 'No Food Duty (Mess Off)';
    } else {
      const settings = this.getSystemSettings();
      const isHoliday = isHolidayOrSunday(dateStr, settings.default_holidays);
      duty.is_holiday = isHoliday;
      duty.group_id = isHoliday ? 6 : 1;
      duty.notes = isHoliday ? 'College Team (Holiday / Weekend)' : 'Regular Turn';
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.COOKING, JSON.stringify(duties));
    }
    this.notify();

    if (isSupabaseConfigured() && supabase) {
      supabase.from('cooking_duties').upsert({
        duty_date: duty.duty_date,
        group_id: duty.group_id,
        is_holiday: duty.is_holiday,
        breakfast_completed: duty.breakfast_completed,
        breakfast_completed_at: duty.breakfast_completed_at,
        lunch_completed: duty.lunch_completed,
        lunch_completed_at: duty.lunch_completed_at,
        active_student_ids: duty.active_student_ids || null,
        is_temporary_swap: duty.is_temporary_swap || false,
        notes: duty.notes,
      }, { onConflict: 'duty_date' });
    }

    return duty;
  }

  public toggleMealCompletion(dateStr: string, meal: 'breakfast' | 'lunch'): CookingDuty {
    let duties = this.getCookingDuties();
    let duty = duties.find((d) => d.duty_date === dateStr);

    if (!duty) {
      this.ensureDutyForDate(dateStr);
      duties = this.getCookingDuties();
      duty = duties.find((d) => d.duty_date === dateStr)!;
    }

    const now = new Date().toISOString();

    if (meal === 'breakfast') {
      duty.breakfast_completed = !duty.breakfast_completed;
      duty.breakfast_completed_at = duty.breakfast_completed ? now : null;
    } else {
      duty.lunch_completed = !duty.lunch_completed;
      duty.lunch_completed_at = duty.lunch_completed ? now : null;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.COOKING, JSON.stringify(duties));
    }
    this.notify();

    if (isSupabaseConfigured() && supabase) {
      supabase.from('cooking_duties').upsert({
        duty_date: duty.duty_date,
        group_id: duty.group_id,
        is_holiday: duty.is_holiday,
        breakfast_completed: duty.breakfast_completed,
        breakfast_completed_at: duty.breakfast_completed_at,
        lunch_completed: duty.lunch_completed,
        lunch_completed_at: duty.lunch_completed_at,
        active_student_ids: duty.active_student_ids || null,
        is_temporary_swap: duty.is_temporary_swap || false,
        notes: duty.notes,
      }, { onConflict: 'duty_date' });
    }

    return duty;
  }

  // --- DUAL-POOL CUSTOM-ORDERED IMAM ROTATION ENGINE (ASR ONLY) ---

  // Get Pool A (Regular: Groups 1-5), sorted by imam_order then name
  public getPoolAStudents(): Student[] {
    const students = this.getStudents().filter((s) => s.group_id <= 5 && s.is_active);
    return students.sort((a, b) => {
      const oa = a.imam_order ?? 999;
      const ob = b.imam_order ?? 999;
      return oa !== ob ? oa - ob : a.name.localeCompare(b.name);
    });
  }

  // Get Pool B (College: Groups 6-8), sorted by imam_order then name
  public getPoolBStudents(): Student[] {
    const students = this.getStudents().filter((s) => s.group_id >= 6 && s.is_active);
    return students.sort((a, b) => {
      const oa = a.imam_order ?? 999;
      const ob = b.imam_order ?? 999;
      return oa !== ob ? oa - ob : a.name.localeCompare(b.name);
    });
  }

  // Get active round for a specific pool
  public getActiveRound(pool: PoolType): ImamRound {
    const rounds = this.getImamRounds();
    let active = rounds.find((r) => r.pool === pool && r.status === 'active');
    if (active) return active;

    const poolRounds = rounds.filter((r) => r.pool === pool);
    const newRound: ImamRound = {
      id: crypto.randomUUID ? crypto.randomUUID() : `round-${pool}-${Date.now()}`,
      round_number: poolRounds.length + 1,
      pool,
      status: 'active',
      started_at: new Date().toISOString(),
      completed_at: null,
      created_at: new Date().toISOString(),
    };
    rounds.push(newRound);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ROUNDS, JSON.stringify(rounds));
    }
    return newRound;
  }

  // Get assigned Asr Imam candidate for a date based on day type (Sunday / Holiday -> Pool B, Weekday -> Pool A)
  public getAssignedAsrImam(dateStr: string): {
    student: Student | null;
    pool: PoolType;
    isHoliday: boolean;
    activeRound: ImamRound;
    queuePosition: number;
    totalInPool: number;
  } {
    const duty = this.ensureDutyForDate(dateStr);
    const settings = this.getSystemSettings();
    const isHoliday = duty.is_holiday || isHolidayOrSunday(dateStr, settings.default_holidays);

    const pool: PoolType = isHoliday ? 'college' : 'regular';
    const activeRound = this.getActiveRound(pool);
    const poolStudents = pool === 'college' ? this.getPoolBStudents() : this.getPoolAStudents();
    const logs = this.getImamLogs().filter((l) => l.round_id === activeRound.id && l.prayer_name === 'Asr');

    const completedStudentIds = new Set<string>();
    logs.forEach((l) => {
      if ((l.status === 'completed' || l.status === 'led') && l.student_id) {
        completedStudentIds.add(l.student_id);
      } else if ((l.status === 'replaced' || l.status === 'absent_replaced') && l.replacement_student_id) {
        completedStudentIds.add(l.replacement_student_id);
      }
    });

    // Pick first student in alphabetical order who hasn't completed their turn in this round
    const nextIdx = poolStudents.findIndex((s) => !completedStudentIds.has(s.id));
    const student = nextIdx !== -1 ? poolStudents[nextIdx] : (poolStudents[0] || null);

    return {
      student,
      pool,
      isHoliday,
      activeRound,
      queuePosition: nextIdx !== -1 ? nextIdx + 1 : 1,
      totalInPool: poolStudents.length,
    };
  }

  // Log Asr Prayer Congregation
  public logAsrDuty(params: {
    date: string;
    studentId?: string | null;
    status: ImamLogStatus;
    replacementStudentId?: string | null;
    notes?: string;
  }): {
    log: ImamLog;
    roundAdvanced: boolean;
    newRound?: ImamRound;
  } {
    const students = this.getStudents();
    const allRounds = this.getImamRounds();
    const logs = this.getImamLogs();

    // Determine target pool from student ID or date
    const targetStudentId = params.studentId || params.replacementStudentId;
    const targetStudent = targetStudentId ? students.find((s) => s.id === targetStudentId) : null;
    let pool: PoolType = 'regular';
    if (targetStudent) {
      pool = targetStudent.group_id >= 6 ? 'college' : 'regular';
    } else {
      const duty = this.ensureDutyForDate(params.date);
      pool = duty.is_holiday ? 'college' : 'regular';
    }

    const activeRound = this.getActiveRound(pool);

    const newLog: ImamLog = {
      id: crypto.randomUUID ? crypto.randomUUID() : `log-asr-${Date.now()}`,
      round_id: activeRound.id,
      date: params.date,
      prayer_name: 'Asr',
      student_id: params.status === 'external_imam' || params.status === 'none' ? null : (params.studentId || null),
      status: params.status,
      replacement_student_id: (params.status === 'replaced' || params.status === 'absent_replaced') ? (params.replacementStudentId || null) : null,
      notes: params.notes || null,
      created_at: new Date().toISOString(),
    };

    logs.unshift(newLog);

    // Clear any pending daily state for this date
    if (this.getDailyImamState(params.date)) {
      this.clearDailyImamState();
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.IMAM_LOGS, JSON.stringify(logs));
    }

    // Check round progression for this pool
    let roundAdvanced = false;
    let newRound: ImamRound | undefined;

    const poolStudents = pool === 'college' ? this.getPoolBStudents() : this.getPoolAStudents();
    const poolRoundLogs = logs.filter((l) => l.round_id === activeRound.id && l.prayer_name === 'Asr');

    const completedStudentIds = new Set<string>();
    poolRoundLogs.forEach((l) => {
      if ((l.status === 'completed' || l.status === 'led') && l.student_id) {
        completedStudentIds.add(l.student_id);
      } else if ((l.status === 'replaced' || l.status === 'absent_replaced') && l.replacement_student_id) {
        completedStudentIds.add(l.replacement_student_id);
      }
    });

    if (completedStudentIds.size >= poolStudents.length && poolStudents.length > 0) {
      roundAdvanced = true;
      const now = new Date().toISOString();
      activeRound.status = 'completed';
      activeRound.completed_at = now;

      newRound = {
        id: crypto.randomUUID ? crypto.randomUUID() : `round-${pool}-${Date.now()}`,
        round_number: activeRound.round_number + 1,
        pool,
        status: 'active',
        started_at: now,
        completed_at: null,
        created_at: now,
      };

      allRounds.push(newRound);

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.ROUNDS, JSON.stringify(allRounds));
      }
    }

    this.notify();

    if (isSupabaseConfigured() && supabase) {
      supabase.from('imam_logs').insert({
        id: newLog.id,
        round_id: newLog.round_id,
        date: newLog.date,
        prayer_name: 'Asr',
        student_id: newLog.student_id,
        status: newLog.status,
        replacement_student_id: newLog.replacement_student_id,
        notes: newLog.notes,
      });

      if (roundAdvanced && newRound) {
        supabase.from('imam_rounds').update({ status: 'completed', completed_at: activeRound.completed_at }).eq('id', activeRound.id);
        supabase.from('imam_rounds').insert({
          id: newRound.id,
          round_number: newRound.round_number,
          pool: newRound.pool,
          status: 'active',
          started_at: newRound.started_at,
        });
      }
    }

    return { log: newLog, roundAdvanced, newRound };
  }

  // Toggle student turn manually in their active pool round
  public toggleStudentRoundTurn(studentId: string, turnCompleted: boolean): void {
    const students = this.getStudents();
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const pool: PoolType = student.group_id >= 6 ? 'college' : 'regular';
    const activeRound = this.getActiveRound(pool);
    const logs = this.getImamLogs();

    if (turnCompleted) {
      this.logAsrDuty({
        date: getRelativeDateString(0),
        status: 'completed',
        studentId,
        notes: 'Manually verified turn',
      });
    } else {
      const filtered = logs.filter(
        (l) => !(l.round_id === activeRound.id && (l.student_id === studentId || l.replacement_student_id === studentId))
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.IMAM_LOGS, JSON.stringify(filtered));
      }
      this.notify();
    }
  }

  // Get statistics for both pools
  public getDualPoolStats(): {
    poolA: PoolStats;
    poolB: PoolStats;
  } {
    const logs = this.getImamLogs().filter((l) => l.prayer_name === 'Asr');

    // Helper to compute pool stats
    const computePool = (pool: PoolType, title: string, students: Student[]): PoolStats => {
      const activeRound = this.getActiveRound(pool);
      const roundLogs = logs.filter((l) => l.round_id === activeRound.id);

      const completedIds = new Set<string>();
      roundLogs.forEach((l) => {
        if ((l.status === 'completed' || l.status === 'led') && l.student_id) {
          completedIds.add(l.student_id);
        } else if ((l.status === 'replaced' || l.status === 'absent_replaced') && l.replacement_student_id) {
          completedIds.add(l.replacement_student_id);
        }
      });

      const stats: StudentImamStats[] = students.map((s) => {
        const studentAllTime = logs.filter(
          (l) =>
            ((l.status === 'completed' || l.status === 'led') && l.student_id === s.id) ||
            ((l.status === 'replaced' || l.status === 'absent_replaced') && l.replacement_student_id === s.id)
        );
        const replacedLogs = logs.filter(
          (l) => (l.status === 'replaced' || l.status === 'absent_replaced') && l.student_id === s.id
        );
        const roundLogsForS = roundLogs.filter(
          (l) =>
            (l.student_id === s.id && (l.status === 'completed' || l.status === 'led')) ||
            (l.replacement_student_id === s.id && (l.status === 'replaced' || l.status === 'absent_replaced'))
        );
        const lastLog = studentAllTime.sort((a, b) => b.date.localeCompare(a.date))[0];

        return {
          student: s,
          roundLedCount: roundLogsForS.length,
          hasLedCurrentRound: completedIds.has(s.id),
          allTimeLedCount: studentAllTime.length,
          replacedCount: replacedLogs.length,
          lastLedDate: lastLog?.date || null,
        };
      });

      const completedCount = completedIds.size;
      const totalStudents = students.length;
      const progressPercentage = totalStudents > 0 ? Math.min(100, Math.round((completedCount / totalStudents) * 100)) : 0;
      const nextCandidate = stats.find((s) => !s.hasLedCurrentRound)?.student || null;

      return {
        pool,
        title,
        activeRound,
        students: stats,
        completedCount,
        totalStudents,
        progressPercentage,
        nextCandidate,
      };
    };

    const poolA = computePool('regular', 'Pool A: Regular Students (Working Days)', this.getPoolAStudents());
    const poolB = computePool('college', 'Pool B: College Students (Holidays/Sundays)', this.getPoolBStudents());

    return { poolA, poolB };
  }

  // Compatibility helper for header & legacy
  public getImamStats(): {
    activeRound: ImamRound;
    stats: StudentImamStats[];
    roundCompletedCount: number;
    totalStudents: number;
    progressPercentage: number;
  } {
    const { poolA } = this.getDualPoolStats();
    return {
      activeRound: poolA.activeRound,
      stats: poolA.students,
      roundCompletedCount: poolA.completedCount,
      totalStudents: poolA.totalStudents,
      progressPercentage: poolA.progressPercentage,
    };
  }

  // Compatibility method for legacy logPrayer callers
  public logPrayer(params: {
    prayerName?: string;
    date: string;
    status: ImamLogStatus;
    studentId?: string | null;
    replacementStudentId?: string | null;
    notes?: string;
  }) {
    return this.logAsrDuty(params);
  }

  // --- INDIVIDUAL STUDENT DUTY REPORTS ---
  public getStudentReports(): StudentReport[] {
    const students = this.getStudents();
    const groups = this.getGroups();
    const duties = this.getCookingDuties();
    const logs = this.getImamLogs().filter((l) => l.prayer_name === 'Asr');

    const groupMap = new Map<number, Group>();
    groups.forEach((g) => groupMap.set(g.id, g));

    const todayDate = getRelativeDateString(0);
    const assignedAsr = this.getAssignedAsrImam(todayDate);

    const activeRoundRegular = this.getActiveRound('regular');
    const activeRoundCollege = this.getActiveRound('college');

    const regularCompletedIds = new Set<string>();
    logs.filter((l) => l.round_id === activeRoundRegular.id).forEach((l) => {
      if ((l.status === 'completed' || l.status === 'led') && l.student_id) regularCompletedIds.add(l.student_id);
      if ((l.status === 'replaced' || l.status === 'absent_replaced') && l.replacement_student_id) regularCompletedIds.add(l.replacement_student_id);
    });

    const collegeCompletedIds = new Set<string>();
    logs.filter((l) => l.round_id === activeRoundCollege.id).forEach((l) => {
      if ((l.status === 'completed' || l.status === 'led') && l.student_id) collegeCompletedIds.add(l.student_id);
      if ((l.status === 'replaced' || l.status === 'absent_replaced') && l.replacement_student_id) collegeCompletedIds.add(l.replacement_student_id);
    });

    return students.map((s) => {
      const group = groupMap.get(s.group_id) || {
        id: s.group_id,
        name: `Group ${s.group_id}`,
        is_holiday_only: s.group_id >= 6,
      };

      const completedDuties = duties.filter(
        (d) => d.group_id === s.group_id && (d.breakfast_completed || d.lunch_completed)
      );

      const totalFoodDutyDays = completedDuties.length;

      const ledLogs = logs.filter(
        (l) =>
        ((l.student_id === s.id && (l.status === 'completed' || l.status === 'led')) ||
          (l.replacement_student_id === s.id && (l.status === 'replaced' || l.status === 'absent_replaced')))
      );

      const replacedLogs = logs.filter(
        (l) => (l.status === 'replaced' || l.status === 'absent_replaced') && l.student_id === s.id
      );

      const isCollege = s.group_id >= 6;
      const hasLedCurrentRound = isCollege
        ? collegeCompletedIds.has(s.id)
        : regularCompletedIds.has(s.id);

      const isNextAsrCandidate = assignedAsr.student?.id === s.id;

      return {
        student: s,
        group,
        totalFoodDuties: totalFoodDutyDays,
        totalFoodDutyDays,
        totalAsrLed: ledLogs.length,
        replacedCount: replacedLogs.length,
        hasLedCurrentRound,
        isNextAsrCandidate,
      };
    }).sort((a, b) => {
      // Sort by pool first (regular before college), then by imam_order within each pool
      const aIsCollege = a.student.group_id >= 6;
      const bIsCollege = b.student.group_id >= 6;
      if (aIsCollege !== bIsCollege) return aIsCollege ? 1 : -1;
      const oa = a.student.imam_order ?? 999;
      const ob = b.student.imam_order ?? 999;
      return oa !== ob ? oa - ob : a.student.name.localeCompare(b.student.name);
    });
  }

  // --- UPCOMING COOKING QUEUE (EVENT-DRIVEN PROJECTION) ---
  public getUpcomingCookingQueue(daysCount = 7): {
    duty: CookingDuty;
    group: Group;
    members: Student[];
    isToday: boolean;
  }[] {
    const today = getRelativeDateString(0);
    const duties = this.getCookingDuties();
    const groupsWithMembers = this.getGroupsWithMembers();
    const settings = this.getSystemSettings();

    // Start projections from the currently active uncompleted groups
    let nextReg = this.getActiveCookingGroup(false);
    let nextHol = this.getActiveCookingGroup(true);

    const queueItems: {
      duty: CookingDuty;
      group: Group;
      members: Student[];
      isToday: boolean;
    }[] = [];

    for (let offset = 0; offset < daysCount; offset++) {
      const dateStr = getRelativeDateString(offset);
      const isToday = offset === 0;

      if (isFriday(dateStr)) {
        const existing = duties.find((d) => d.duty_date === dateStr);
        const duty: CookingDuty = existing || {
          id: `duty-${dateStr}`,
          duty_date: dateStr,
          group_id: null,
          is_holiday: false,
          is_no_duty: true,
          breakfast_completed: false,
          lunch_completed: false,
          notes: 'Friday - No Food Duty (Morning & Evening)',
          created_at: new Date().toISOString(),
        };

        queueItems.push({
          duty,
          group: {
            id: 0,
            name: 'Friday Off',
            is_holiday_only: false,
            members: [],
          },
          members: [],
          isToday,
        });
        continue;
      }

      const isHoliday = isHolidayOrSunday(dateStr, settings.default_holidays);
      const existing = duties.find((d) => d.duty_date === dateStr);
      let assignedId: number;

      if (existing && (existing.breakfast_completed || existing.lunch_completed || existing.notes?.includes('Manual override')) && existing.group_id) {
        assignedId = existing.group_id;
      } else {
        assignedId = isHoliday ? nextHol : nextReg;
      }

      const duty: CookingDuty = existing || {
        id: `duty-${dateStr}`,
        duty_date: dateStr,
        group_id: assignedId,
        is_holiday: isHoliday,
        is_no_duty: false,
        breakfast_completed: false,
        lunch_completed: false,
        notes: isHoliday ? 'College Team (Holiday / Weekend)' : null,
        created_at: new Date().toISOString(),
      };

      const g = groupsWithMembers.find((item) => item.id === assignedId);
      let actualMembers = g?.members || [];
      if (duty.active_student_ids && duty.active_student_ids.length > 0) {
        actualMembers = duty.active_student_ids.map(id => this.getStudents().find(s => s.id === id)).filter(Boolean) as Student[];
      }

      queueItems.push({
        duty: { ...duty, group_id: assignedId },
        group: g || {
          id: assignedId,
          name: `Group ${assignedId}`,
          is_holiday_only: assignedId >= 6,
          members: [],
        },
        members: actualMembers,
        isToday,
      });

      // Project sequence advance for subsequent days in preview
      if (isHoliday) {
        nextHol = ((nextHol - 6 + 1) % 3) + 6;
      } else {
        nextReg = (nextReg % 5) + 1;
      }
    }

    return queueItems;
  }

  // --- STUDENT DETAILED ACTIVITY AUDIT ---
  public getStudentDutyHistory(studentId: string) {
    const students = this.getStudents();
    const student = students.find((s) => s.id === studentId);
    if (!student) return null;

    const groups = this.getGroups();
    const group = groups.find((g) => g.id === student.group_id) || {
      id: student.group_id,
      name: `Group ${student.group_id}`,
      is_holiday_only: student.group_id >= 6,
    };

    const duties = this.getCookingDuties();
    const logs = this.getImamLogs();
    const rounds = this.getImamRounds();

    // 1. Food Duties History: dates where student actually worked
    const cookingHistory = duties
      .filter((d) => {
        const isDefaultMember = d.group_id === student.group_id;
        const isActiveMember = d.active_student_ids && d.active_student_ids.length > 0 
          ? d.active_student_ids.includes(student.id) 
          : isDefaultMember;
        return isActiveMember && (d.breakfast_completed || d.lunch_completed);
      })
      .sort((a, b) => b.duty_date.localeCompare(a.duty_date))
      .map((d) => {
        let mealStatus: 'Both' | 'Breakfast Completed' | 'Lunch Completed' = 'Both';
        if (d.breakfast_completed && d.lunch_completed) {
          mealStatus = 'Both';
        } else if (d.breakfast_completed) {
          mealStatus = 'Breakfast Completed';
        } else {
          mealStatus = 'Lunch Completed';
        }

        return {
          id: d.id,
          duty_date: d.duty_date,
          is_holiday: d.is_holiday,
          mealStatus,
          breakfast_completed: d.breakfast_completed,
          breakfast_completed_at: d.breakfast_completed_at,
          lunch_completed: d.lunch_completed,
          lunch_completed_at: d.lunch_completed_at,
          notes: d.notes,
        };
      });

    // 2. Asr Imam History: dates where student led Asr prayer or served as substitute
    const studentLogs = logs.filter(
      (l) =>
        (l.student_id === student.id && (l.status === 'completed' || l.status === 'led')) ||
        (l.replacement_student_id === student.id && (l.status === 'replaced' || l.status === 'absent_replaced'))
    );

    const imamHistory = studentLogs
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((l) => {
        const round = rounds.find((r) => r.id === l.round_id);
        const isSubstitute = (l.status === 'replaced' || l.status === 'absent_replaced') && l.replacement_student_id === student.id;

        let roleType: 'regular' | 'holiday' | 'substitute' = 'regular';
        if (isSubstitute) {
          roleType = 'substitute';
        } else if (round?.pool === 'college') {
          roleType = 'holiday';
        }

        let originalStudentName: string | undefined;
        if (isSubstitute && l.student_id) {
          const original = students.find((s) => s.id === l.student_id);
          originalStudentName = original?.name;
        }

        return {
          id: l.id,
          date: l.date,
          prayer_name: l.prayer_name,
          roleType,
          status: l.status,
          notes: l.notes,
          originalStudentName,
        };
      });

    return {
      student,
      group,
      cookingHistory,
      imamHistory,
      totalFoodDuties: cookingHistory.length,
      totalAsrLed: imamHistory.length,
    };
  }

  // --- UPCOMING ASR IMAMS QUEUE (ALPHABETICAL) ---
  public getUpcomingAsrQueue(targetPool?: PoolType): {
    pool: PoolType;
    round: ImamRound;
    queue: {
      student: Student;
      hasCompletedRound: boolean;
      isNext: boolean;
      orderIndex: number;
    }[];
  } {
    const pool = targetPool || 'regular';
    const activeRound = this.getActiveRound(pool);
    const poolStudents = pool === 'college' ? this.getPoolBStudents() : this.getPoolAStudents();
    const logs = this.getImamLogs().filter((l) => l.round_id === activeRound.id && l.prayer_name === 'Asr');

    const completedIds = new Set<string>();
    logs.forEach((l) => {
      if ((l.status === 'completed' || l.status === 'led') && l.student_id) completedIds.add(l.student_id);
      if ((l.status === 'replaced' || l.status === 'absent_replaced') && l.replacement_student_id) completedIds.add(l.replacement_student_id);
    });

    const nextUncompletedIdx = poolStudents.findIndex((s) => !completedIds.has(s.id));

    const queue = poolStudents.map((s, idx) => ({
      student: s,
      hasCompletedRound: completedIds.has(s.id),
      isNext: idx === nextUncompletedIdx,
      orderIndex: idx + 1,
    }));

    return { pool, round: activeRound, queue };
  }

  // Reset to default seed
  public resetToSeed(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(INITIAL_GROUPS));
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
      localStorage.setItem(STORAGE_KEYS.COOKING, JSON.stringify(generateInitialCookingDuties()));
      localStorage.setItem(STORAGE_KEYS.ROUNDS, JSON.stringify(INITIAL_ROUNDS));
      localStorage.setItem(STORAGE_KEYS.IMAM_LOGS, JSON.stringify(generateInitialImamLogs(INITIAL_ROUNDS[0].id, INITIAL_ROUNDS[1].id)));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SYSTEM_SETTINGS));
    }
    this.notify();
  }
}

export const dutyStore = new DutyStore();
