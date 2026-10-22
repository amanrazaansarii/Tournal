import {
  TaskItem,
  JournalEntry,
  WorkoutExercise,
  DailyBodyMetric,
  ProgressPhoto,
  AppSettings,
  DietEntry,
  NutritionGoals,
  ExpenseEntry,
  UserProfile,
} from '../types';

const STORAGE_KEYS = {
  TASKS: 'tournal_tasks_v1',
  JOURNALS: 'tournal_journals_v1',
  WORKOUTS: 'tournal_workouts_v1',
  BODY_METRICS: 'tournal_body_metrics_v1',
  DIET: 'tournal_diet_v1',
  NUTRITION_GOALS: 'tournal_nutrition_goals_v1',
  EXPENSES: 'tournal_expenses_v1',
  SETTINGS: 'tournal_settings_v2',
  PROFILE: 'tournal_profile_v1',
  SEEDED: 'tournal_seeded_v3',
};

const IDB_NAME = 'TournalProgressPhotoVault';
const IDB_STORE = 'photos';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  showPersistentBar: true,
  notificationSound: true,
  notificationVibration: true,
  defaultReminderMinutes: 5,
  defaultWeightUnit: 'lbs',
  use24HourTime: false,
  categories: {
    highPriorityTasks: true,
    scheduledTasks: true,
    workoutReminders: true,
    eveningJournal: true,
  },
};

export const DEFAULT_NUTRITION_GOALS: NutritionGoals = {
  targetCalories: 2450,
  targetProteinGrams: 180,
  targetFiberGrams: 35,
  targetCarbsGrams: 245,
  targetFatGrams: 75,
  weightLbs: 178,
  activityMultiplier: 'active',
  goalType: 'maintain',
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'My Profile',
  bio: 'Focused daily execution, training & nutrition ledger',
  avatarDataUrl: '',
  updatedAt: new Date().toISOString(),
};

export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getOffsetDateISO(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function ensureInitialSeedData(): void {
  const CLEANED_KEY = 'tournal_publish_clean_v1';
  if (!localStorage.getItem(CLEANED_KEY)) {
    // Purge any legacy "-seed-" dummy items while keeping real user-created records
    try {
      const rawTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (rawTasks) {
        const parsed: TaskItem[] = JSON.parse(rawTasks);
        if (Array.isArray(parsed)) {
          localStorage.setItem(
            STORAGE_KEYS.TASKS,
            JSON.stringify(parsed.filter((t) => !String(t.id).includes('-seed-')))
          );
        }
      }

      const rawJournals = localStorage.getItem(STORAGE_KEYS.JOURNALS);
      if (rawJournals) {
        const parsed: JournalEntry[] = JSON.parse(rawJournals);
        if (Array.isArray(parsed)) {
          localStorage.setItem(
            STORAGE_KEYS.JOURNALS,
            JSON.stringify(parsed.filter((j) => !String(j.id).includes('-seed-')))
          );
        }
      }

      const rawWorkouts = localStorage.getItem(STORAGE_KEYS.WORKOUTS);
      if (rawWorkouts) {
        const parsed: WorkoutExercise[] = JSON.parse(rawWorkouts);
        if (Array.isArray(parsed)) {
          localStorage.setItem(
            STORAGE_KEYS.WORKOUTS,
            JSON.stringify(parsed.filter((w) => !String(w.id).includes('-seed-')))
          );
        }
      }

      const rawMetrics = localStorage.getItem(STORAGE_KEYS.BODY_METRICS);
      if (rawMetrics) {
        const parsed: DailyBodyMetric[] = JSON.parse(rawMetrics);
        if (Array.isArray(parsed)) {
          localStorage.setItem(
            STORAGE_KEYS.BODY_METRICS,
            JSON.stringify(
              parsed.filter(
                (m) =>
                  !(
                    (m.bodyWeight === 178.4 && m.measuredAt === '07:10') ||
                    (m.bodyWeight === 177.8 && m.measuredAt === '07:05')
                  )
              )
            )
          );
        }
      }

      const rawDiet = localStorage.getItem(STORAGE_KEYS.DIET);
      if (rawDiet) {
        const parsed: DietEntry[] = JSON.parse(rawDiet);
        if (Array.isArray(parsed)) {
          localStorage.setItem(
            STORAGE_KEYS.DIET,
            JSON.stringify(parsed.filter((d) => !String(d.id).includes('-seed-')))
          );
        }
      }

      const rawExpenses = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      if (rawExpenses) {
        const parsed: ExpenseEntry[] = JSON.parse(rawExpenses);
        if (Array.isArray(parsed)) {
          localStorage.setItem(
            STORAGE_KEYS.EXPENSES,
            JSON.stringify(parsed.filter((e) => !String(e.id).includes('-seed-')))
          );
        }
      }

      deleteProgressPhoto('photo-seed-1').catch(() => {});
      deleteProgressPhoto('photo-seed-2').catch(() => {});
    } catch {
      // Ignore cleanup parse errors
    }

    localStorage.setItem(CLEANED_KEY, 'true');
  }

  if (!localStorage.getItem(STORAGE_KEYS.NUTRITION_GOALS)) {
    localStorage.setItem(
      STORAGE_KEYS.NUTRITION_GOALS,
      JSON.stringify(DEFAULT_NUTRITION_GOALS)
    );
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      categories: {
        ...DEFAULT_SETTINGS.categories,
        ...(parsed.categories || {}),
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

export function loadUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) return DEFAULT_USER_PROFILE;
    return { ...DEFAULT_USER_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_USER_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
}

export function loadTasks(): TaskItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: TaskItem[]): void {
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
}

export function loadJournals(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.JOURNALS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveJournals(journals: JournalEntry[]): void {
  localStorage.setItem(STORAGE_KEYS.JOURNALS, JSON.stringify(journals));
}

export function loadWorkouts(): WorkoutExercise[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WORKOUTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWorkouts(workouts: WorkoutExercise[]): void {
  localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
}

export function loadBodyMetrics(): DailyBodyMetric[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BODY_METRICS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBodyMetrics(metrics: DailyBodyMetric[]): void {
  localStorage.setItem(STORAGE_KEYS.BODY_METRICS, JSON.stringify(metrics));
}

export function loadDietEntries(): DietEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DIET);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDietEntries(entries: DietEntry[]): void {
  localStorage.setItem(STORAGE_KEYS.DIET, JSON.stringify(entries));
}

export function loadNutritionGoals(): NutritionGoals {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NUTRITION_GOALS);
    return raw ? { ...DEFAULT_NUTRITION_GOALS, ...JSON.parse(raw) } : DEFAULT_NUTRITION_GOALS;
  } catch {
    return DEFAULT_NUTRITION_GOALS;
  }
}

export function saveNutritionGoals(goals: NutritionGoals): void {
  localStorage.setItem(STORAGE_KEYS.NUTRITION_GOALS, JSON.stringify(goals));
}

export function loadExpenses(): ExpenseEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveExpenses(expenses: ExpenseEntry[]): void {
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
}

function openPhotoDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadProgressPhotos(): Promise<ProgressPhoto[]> {
  try {
    const db = await openPhotoDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result || []) as ProgressPhoto[];
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveProgressPhoto(photo: ProgressPhoto): Promise<void> {
  const db = await openPhotoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put(photo);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteProgressPhoto(id: string): Promise<void> {
  const db = await openPhotoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllProgressPhotos(): Promise<void> {
  try {
    const db = await openPhotoDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore IDB clear error
  }
}

