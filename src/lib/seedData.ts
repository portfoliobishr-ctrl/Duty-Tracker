import { 
  Group, 
  Student, 
  PrayerSlot, 
  ImamRound, 
  CookingDuty, 
  ImamLog, 
  SystemSettings 
} from '@/types/database';

export const INITIAL_SYSTEM_SETTINGS: SystemSettings = {
  id: 1,
  default_holidays: [0, 6], // 0 = Sunday, 6 = Saturday (College Team cooking & Imam). Friday is dedicated No Food Duty.
};

export const INITIAL_GROUPS: Group[] = [
  { id: 1, name: 'Group 1', is_holiday_only: false, description: 'Regular Cooking Team 1' },
  { id: 2, name: 'Group 2', is_holiday_only: false, description: 'Regular Cooking Team 2' },
  { id: 3, name: 'Group 3', is_holiday_only: false, description: 'Regular Cooking Team 3' },
  { id: 4, name: 'Group 4', is_holiday_only: false, description: 'Regular Cooking Team 4' },
  { id: 5, name: 'Group 5', is_holiday_only: false, description: 'Regular Cooking Team 5' },
  { id: 6, name: 'Group 6', is_holiday_only: true, description: 'College Team (Holidays / Weekends Only)' },
  { id: 7, name: 'Group 7', is_holiday_only: true, description: 'College Team (Holidays / Weekends Only)' },
  { id: 8, name: 'Group 8', is_holiday_only: true, description: 'College Team (Holidays / Weekends Only)' },
];

export const INITIAL_STUDENTS: Student[] = [
  // ── Pool A : Regular (Groups 1-5) ── order as specified ──────────────────
  // Pool A custom rotation: Fuad(1) → Swabah(2) → Muhammed(3) → Anfaz(4) → Dilshad(5)
  //                         → Nafil(6) → Nashid(7) → Razeel(8) → Sabith(9) → Shammas(10)
  { id: '11111111-0000-0000-0000-000000000001', name: 'Anfaz',    group_id: 1, is_active: true, imam_order: 4 },
  { id: '11111111-0000-0000-0000-000000000002', name: 'Fuad',     group_id: 1, is_active: true, imam_order: 1 },

  { id: '11111111-0000-0000-0000-000000000003', name: 'Swabah',   group_id: 2, is_active: true, imam_order: 2 },
  { id: '11111111-0000-0000-0000-000000000004', name: 'Muhammed', group_id: 2, is_active: true, imam_order: 3 },

  { id: '11111111-0000-0000-0000-000000000005', name: 'Dilshad',  group_id: 3, is_active: true, imam_order: 5 },
  { id: '11111111-0000-0000-0000-000000000006', name: 'Razeel',   group_id: 3, is_active: true, imam_order: 8 },

  { id: '11111111-0000-0000-0000-000000000007', name: 'Nashid',   group_id: 4, is_active: true, imam_order: 7 },
  { id: '11111111-0000-0000-0000-000000000008', name: 'Nafil',    group_id: 4, is_active: true, imam_order: 6 },

  { id: '11111111-0000-0000-0000-000000000009', name: 'Shammas',  group_id: 5, is_active: true, imam_order: 10 },
  { id: '11111111-0000-0000-0000-000000000010', name: 'Sabith',   group_id: 5, is_active: true, imam_order: 9 },

  // ── Pool B : College (Groups 6-8) ── order as specified ──────────────────
  // Pool B custom rotation: Hasir(1) → Nijad/G6(2) → Saddad(3) → Swabeeh(4) → Murshid(5) → Shammas ALP(6)
  { id: '11111111-0000-0000-0000-000000000011', name: 'Hasir',      group_id: 6, is_active: true, imam_order: 1 },
  { id: '11111111-0000-0000-0000-000000000012', name: 'Nijad',      group_id: 6, is_active: true, imam_order: 2 },

  { id: '11111111-0000-0000-0000-000000000013', name: 'Shammas ALP', group_id: 7, is_active: true, imam_order: 6 },
  { id: '11111111-0000-0000-0000-000000000014', name: 'Saddad',      group_id: 7, is_active: true, imam_order: 3 },

  { id: '11111111-0000-0000-0000-000000000015', name: 'Murshid',     group_id: 8, is_active: true, imam_order: 5 },
  { id: '11111111-0000-0000-0000-000000000016', name: 'Swabeeh',     group_id: 8, is_active: true, imam_order: 4 },
];

// Single Congregational Prayer: Asr Only
export const INITIAL_PRAYER_SLOTS: PrayerSlot[] = [
  { id: 1, name: 'Asr', display_order: 1 },
];

// Initial active rounds for both pools
export const INITIAL_ROUNDS: ImamRound[] = [
  {
    id: '22222222-0000-0000-0000-000000000001',
    round_number: 1,
    pool: 'regular',
    status: 'active',
    started_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    completed_at: null,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: '22222222-0000-0000-0000-000000000002',
    round_number: 1,
    pool: 'college',
    status: 'active',
    started_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    completed_at: null,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

// Helper to generate dates in YYYY-MM-DD format relative to today
export function getRelativeDateString(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

// Check if date is a Friday (day 5)
export function isFriday(dateStr: string): boolean {
  const parts = dateStr.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return d.getDay() === 5;
}

// Check if a given date string is a weekend (Saturday / Sunday) or declared holiday (excluding Friday which has no food duty)
export function isHolidayOrSunday(dateStr: string, defaultHolidays = [0, 6]): boolean {
  const parts = dateStr.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  if (d.getDay() === 5) return false; // Friday is no food duty
  return d.getDay() === 0 || d.getDay() === 6 || defaultHolidays.includes(d.getDay());
}

// Generate initial schedule for cooking duties
// Requirements:
// 1. Groups 1, 2, and 3 have already completed their turns.
// 2. Today is Friday: NO food duty in morning (breakfast) and evening (lunch).
// 3. Next scheduled regular cooking team is Group 4 (Nashid, Nafil) starting on Saturday!
export function generateInitialCookingDuties(): CookingDuty[] {
  const duties: CookingDuty[] = [];

  // Group 1: Completed turn (3 days ago - Tuesday)
  const d3 = getRelativeDateString(-3);
  duties.push({
    id: `duty-${d3}`,
    duty_date: d3,
    group_id: 1,
    is_holiday: false,
    is_no_duty: false,
    breakfast_completed: true,
    breakfast_completed_at: `${d3}T08:00:00.000Z`,
    lunch_completed: true,
    lunch_completed_at: `${d3}T13:00:00.000Z`,
    active_student_ids: null,
    is_temporary_swap: false,
    notes: 'Completed turn',
    created_at: new Date().toISOString(),
  });

  // Group 2: Completed turn (2 days ago - Wednesday)
  const d2 = getRelativeDateString(-2);
  duties.push({
    id: `duty-${d2}`,
    duty_date: d2,
    group_id: 2,
    is_holiday: false,
    is_no_duty: false,
    breakfast_completed: true,
    breakfast_completed_at: `${d2}T08:00:00.000Z`,
    lunch_completed: true,
    lunch_completed_at: `${d2}T13:00:00.000Z`,
    active_student_ids: null,
    is_temporary_swap: false,
    notes: 'Completed turn',
    created_at: new Date().toISOString(),
  });

  // 2026-09-11: Dilshad & Razeel completed duty
  duties.push({
    id: `duty-2026-09-11`,
    duty_date: '2026-09-11',
    group_id: 3,
    is_holiday: false,
    is_no_duty: false,
    breakfast_completed: true,
    breakfast_completed_at: `2026-09-11T08:00:00.000Z`,
    lunch_completed: true,
    lunch_completed_at: `2026-09-11T13:00:00.000Z`,
    active_student_ids: ['11111111-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000006'],
    is_temporary_swap: false,
    notes: 'Completed turn by Dilshad & Razeel',
    created_at: new Date().toISOString(),
  });



  // Today (offset 0): Friday -> NO FOOD DUTY (Morning & Evening Off)
  const d0 = getRelativeDateString(0);
  const todayIsFriday = isFriday(d0);
  duties.push({
    id: `duty-${d0}`,
    duty_date: d0,
    group_id: todayIsFriday ? null : 4,
    is_holiday: false,
    is_no_duty: todayIsFriday,
    breakfast_completed: false,
    breakfast_completed_at: null,
    lunch_completed: false,
    lunch_completed_at: null,
    active_student_ids: null,
    is_temporary_swap: false,
    notes: todayIsFriday ? 'Friday - No Food Duty (Morning & Evening)' : 'Scheduled Turn',
    created_at: new Date().toISOString(),
  });

  // Yesterday (2026-09-12): Swabeeh and Shammas ALP completed duty
  duties.push({
    id: `duty-2026-09-12`,
    duty_date: '2026-09-12',
    group_id: 8,
    is_holiday: true,
    is_no_duty: false,
    breakfast_completed: true,
    breakfast_completed_at: `2026-09-12T08:00:00.000Z`,
    lunch_completed: true,
    lunch_completed_at: `2026-09-12T13:00:00.000Z`,
    active_student_ids: ['11111111-0000-0000-0000-000000000013', '11111111-0000-0000-0000-000000000016'],
    is_temporary_swap: true,
    notes: 'Completed by Swabeeh and Shammas ALP',
    created_at: new Date().toISOString(),
  });

  return duties;
}

// Generate initial Asr imam logs
// Completed turns in Pool A (custom order):
//   1. Fuad  → done  (4 days ago)
//   2. Swabah → done (3 days ago)
//   3. Muhammed → done (2 days ago)
//   4. Anfaz → done (1 day ago)
// Next Up: Dilshad (#5 in custom order)
export function generateInitialImamLogs(regularRoundId: string, collegeRoundId = '22222222-0000-0000-0000-000000000002'): ImamLog[] {
  const logs: ImamLog[] = [];
  const d4 = getRelativeDateString(-4);
  const d3 = getRelativeDateString(-3);
  const d2 = getRelativeDateString(-2);
  const d1 = getRelativeDateString(-1);

  // 1. Fuad — imam_order #1 — completed 4 days ago
  logs.push({
    id: 'log-asr-fuad-r1',
    round_id: regularRoundId,
    date: d4,
    prayer_name: 'Asr',
    student_id: '11111111-0000-0000-0000-000000000002', // Fuad
    status: 'completed',
    notes: 'Round 1 turn completed',
    created_at: `${d4}T16:15:00Z`,
  });

  // 2. Swabah — imam_order #2 — completed 3 days ago
  logs.push({
    id: 'log-asr-swabah-r1',
    round_id: regularRoundId,
    date: d3,
    prayer_name: 'Asr',
    student_id: '11111111-0000-0000-0000-000000000003', // Swabah
    status: 'completed',
    notes: 'Round 1 turn completed',
    created_at: `${d3}T16:15:00Z`,
  });

  // 3. Muhammed — imam_order #3 — completed 2 days ago
  logs.push({
    id: 'log-asr-muhammed-r1',
    round_id: regularRoundId,
    date: d2,
    prayer_name: 'Asr',
    student_id: '11111111-0000-0000-0000-000000000004', // Muhammed
    status: 'completed',
    notes: 'Round 1 turn completed',
    created_at: `${d2}T16:15:00Z`,
  });

  // 4. Anfaz — imam_order #4 — completed 1 day ago
  logs.push({
    id: 'log-asr-anfaz-r1',
    round_id: regularRoundId,
    date: d1,
    prayer_name: 'Asr',
    student_id: '11111111-0000-0000-0000-000000000001', // Anfaz
    status: 'completed',
    notes: 'Round 1 turn completed',
    created_at: `${d1}T16:15:00Z`,
  });

  // Yesterday (2026-09-12): Hasir completed
  logs.push({
    id: 'log-asr-hasir-2026-09-12',
    round_id: collegeRoundId,
    date: '2026-09-12',
    prayer_name: 'Asr',
    student_id: '11111111-0000-0000-0000-000000000011', // Hasir
    status: 'completed',
    notes: 'Completed by Hasir',
    created_at: `2026-09-12T16:15:00Z`,
  });

  // 2026-09-11: Dilshad replaced by Razeel
  logs.push({
    id: 'log-asr-dilshad-2026-09-11',
    round_id: regularRoundId,
    date: '2026-09-11',
    prayer_name: 'Asr',
    student_id: '11111111-0000-0000-0000-000000000005', // Dilshad
    status: 'replaced',
    replacement_student_id: '11111111-0000-0000-0000-000000000006', // Razeel
    notes: 'dilshad go to his home',
    created_at: `2026-09-11T16:15:00Z`,
  });

  return logs;
}
