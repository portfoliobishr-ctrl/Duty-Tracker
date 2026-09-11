export type MealType = 'breakfast' | 'lunch';
export type DutyStatus = 'pending' | 'completed' | 'missed';
export type PrayerSlotName = 'Asr';
export type ImamLogStatus = 'completed' | 'replaced' | 'external_imam' | 'none' | 'led' | 'absent_replaced';
export type RoundStatus = 'active' | 'completed';
export type PoolType = 'regular' | 'college';

export interface Group {
  id: number;
  name: string;
  is_holiday_only: boolean;
  description?: string | null;
  created_at?: string;
  members?: Student[];
}

export interface Student {
  id: string;
  name: string;
  group_id: number;
  is_active: boolean;
  imam_order?: number; // Custom sort position within the Asr imam rotation pool
  created_at?: string;
  group?: Group;
}

export interface SystemSettings {
  id: number;
  default_holidays: number[]; // 0 = Sunday, 5 = Friday
}

export interface CookingDuty {
  id: string;
  duty_date: string; // YYYY-MM-DD
  group_id: number | null; // null if no duty scheduled (e.g. Friday)
  is_holiday: boolean;
  is_no_duty?: boolean; // true on Fridays or mess-off days (no morning or evening duty)
  breakfast_completed: boolean;
  breakfast_completed_at?: string | null;
  lunch_completed: boolean;
  lunch_completed_at?: string | null;
  notes?: string | null;
  created_at?: string;
  group?: Group;
}

export interface PrayerSlot {
  id: number;
  name: PrayerSlotName;
  display_order: number;
}

export interface ImamRound {
  id: string;
  round_number: number;
  pool: PoolType; // 'regular' (Pool A, 10 students) or 'college' (Pool B, 6 students)
  status: RoundStatus;
  started_at?: string;
  completed_at?: string | null;
  created_at?: string;
}

export interface ImamLog {
  id: string;
  round_id: string;
  date: string; // YYYY-MM-DD
  prayer_name: PrayerSlotName;
  student_id?: string | null;
  status: ImamLogStatus;
  replacement_student_id?: string | null;
  notes?: string | null;
  created_at?: string;
  student?: Student | null;
  replacement_student?: Student | null;
}

export interface StudentImamStats {
  student: Student;
  roundLedCount: number;
  hasLedCurrentRound: boolean;
  allTimeLedCount: number;
  replacedCount: number;
  lastLedDate?: string | null;
}

export interface PoolStats {
  pool: PoolType;
  title: string;
  activeRound: ImamRound;
  students: StudentImamStats[];
  completedCount: number;
  totalStudents: number;
  progressPercentage: number;
  nextCandidate: Student | null;
}

export interface StudentReport {
  student: Student;
  group: Group;
  totalFoodDuties: number; // total meals completed by their group
  totalFoodDutyDays: number; // total days their group completed cooking
  totalAsrLed: number; // total times student led Asr prayer
  replacedCount: number; // times they served as replacement/substitute
  hasLedCurrentRound: boolean;
  isNextAsrCandidate: boolean;
}

