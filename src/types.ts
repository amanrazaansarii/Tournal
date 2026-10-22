export type TaskPriority = 'high' | 'medium' | 'low';

export type TaskSource = 'local' | 'voice' | 'keep' | 'google_tasks' | 'gmail';

export interface TaskItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  notes: string;
  priority: TaskPriority;
  completed: boolean;
  startTime: string; // HH:MM (24h) or ''
  durationMinutes: number; // e.g. 30, 45, 60
  reminderMinutesBefore: number; // e.g. 0, 5, 15
  notifiedAt?: string;
  snoozedUntil?: number;
  source: TaskSource;
  meetUri?: string;
  contactName?: string;
  contactEmail?: string;
  createdAt: string;
}

export interface VoiceTableBlock {
  id: string;
  title: string;
  headers: string[];
  rows: string[][];
}

export interface VoiceChartBlock {
  id: string;
  chartType: 'bar' | 'line';
  title: string;
  unit: string;
  dataPoints: Array<{ label: string; value: number }>;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
  rawTranscript: string;
  keyTakeaways: string[];
  intentEdits: string[];
  tables?: VoiceTableBlock[];
  charts?: VoiceChartBlock[];
  sessionType: 'morning_setup' | 'evening_reflection' | 'midday_note';
  updatedAt: string;
}

export type EffortState = 'to_failure' | 'in_control';

export interface WorkoutExercise {
  id: string;
  date: string; // YYYY-MM-DD
  exerciseName: string;
  weight: number;
  weightUnit: 'lbs' | 'kg';
  sets: number;
  reps: number;
  effortState: EffortState;
  notes: string;
  createdAt: string;
}

export interface DailyBodyMetric {
  date: string; // YYYY-MM-DD
  bodyWeight: number;
  bodyWeightUnit: 'lbs' | 'kg';
  measuredAt: string;
}

export interface ProgressPhoto {
  id: string;
  date: string; // YYYY-MM-DD
  dataUrl: string;
  caption: string;
  bodyWeight?: number;
  bodyWeightUnit?: 'lbs' | 'kg';
  poseCategory: 'Front' | 'Side' | 'Back' | 'Training Session';
  createdAt: string;
}

export interface DietEntry {
  id: string;
  date: string; // YYYY-MM-DD
  foodName: string;
  quantity: string;
  calories: number;
  proteinGrams: number;
  // Secondary nutrients hidden under dropdown until expanded
  fiberGrams: number;
  carbsGrams: number;
  fatGrams: number;
  sugarGrams: number;
  sodiumMg: number;
  micronutrientSummary: string;
  createdAt: string;
}

export interface NutritionGoals {
  targetCalories: number;
  targetProteinGrams: number;
  targetFiberGrams: number;
  targetCarbsGrams: number;
  targetFatGrams: number;
  // Calculator parameters
  weightLbs: number;
  activityMultiplier: 'sedentary' | 'moderate' | 'active' | 'athlete';
  goalType: 'cut' | 'maintain' | 'bulk';
  updatedAt: string;
}

export interface ExpenseEntry {
  id: string;
  date: string; // Date logged (YYYY-MM-DD)
  deadlineDate: string; // Expected deadline / due date (YYYY-MM-DD)
  name: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  isCovered: boolean;
  createdAt: string;
}

export interface AppSettings {
  theme: 'system' | 'light' | 'dark';
  showPersistentBar: boolean;
  notificationSound: boolean;
  notificationVibration: boolean;
  defaultReminderMinutes: number;
  defaultWeightUnit: 'lbs' | 'kg';
  use24HourTime: boolean;
  categories: {
    highPriorityTasks: boolean;
    scheduledTasks: boolean;
    workoutReminders: boolean;
    eveningJournal: boolean;
  };
}

export interface UserProfile {
  name: string;
  bio: string;
  avatarDataUrl: string; // Empty string uses default humanoid avatar
  updatedAt: string;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
}
