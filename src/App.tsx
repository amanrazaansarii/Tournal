import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckSquare,
  BookOpen,
  Sparkles,
  Dumbbell,
  Flame,
  Receipt,
  Settings,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  TaskItem,
  TaskPriority,
  JournalEntry,
  WorkoutExercise,
  DailyBodyMetric,
  ProgressPhoto,
  DietEntry,
  NutritionGoals,
  ExpenseEntry,
  AppSettings,
  UserProfile,
  ConfirmDialogState,
} from './types';
import {
  ensureInitialSeedData,
  getTodayISO,
  getOffsetDateISO,
  loadTasks,
  saveTasks,
  loadJournals,
  saveJournals,
  loadWorkouts,
  saveWorkouts,
  loadBodyMetrics,
  saveBodyMetrics,
  loadProgressPhotos,
  saveProgressPhoto,
  deleteProgressPhoto,
  clearAllProgressPhotos,
  loadDietEntries,
  saveDietEntries,
  loadNutritionGoals,
  saveNutritionGoals,
  DEFAULT_NUTRITION_GOALS,
  loadExpenses,
  saveExpenses,
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  loadUserProfile,
  saveUserProfile,
  DEFAULT_USER_PROFILE,
} from './services/localVault';
import { initAuth } from './services/workspaceAuth';
import {
  initNotificationServiceWorker,
  playReminderChime,
  sendPersistentTaskNotification,
} from './services/notificationEngine';
import { PersistentNotificationBar } from './components/PersistentNotificationBar';
import { DailyTasksAndJournalView } from './components/DailyTasksAndJournalView';
import { WorkoutAndPhotoVault } from './components/WorkoutAndPhotoVault';
import { DietTrackerView } from './components/DietTrackerView';
import { ExpensesTrackerView } from './components/ExpensesTrackerView';
import { WorkspaceIntegrationPanel } from './components/WorkspaceIntegrationPanel';
import { SettingsView } from './components/SettingsView';
import { AIChatbotView } from './components/AIChatbotView';
import { ProfileView, HumanoidAvatar } from './components/ProfileView';
import { QuickCaptureVoiceFAB, QuickCaptureCategory } from './components/QuickCaptureVoiceFAB';
import { AndroidWidgetsGallery, AndroidWidgetId } from './components/AndroidWidgetsGallery';

type BottomSectionId = 'journal' | 'workouts' | 'tasks' | 'diet' | 'expenses';

type ActiveSection =
  | BottomSectionId
  | 'assistant'
  | 'workspace'
  | 'settings'
  | 'profile';

const ORDERED_BOTTOM_SECTIONS: BottomSectionId[] = [
  'journal',
  'workouts',
  'tasks',
  'diet',
  'expenses',
];

export default function App() {
  // Always open on 'tasks' (Position #3 in the middle of the bottom bar) on first instance
  const [activeSection, setActiveSection] = useState<ActiveSection>('tasks');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutExercise[]>([]);
  const [bodyMetrics, setBodyMetrics] = useState<DailyBodyMetric[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [dietEntries, setDietEntries] = useState<DietEntry[]>([]);
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals>(DEFAULT_NUTRITION_GOALS);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);

  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const lastWheelSwitchRef = React.useRef<number>(0);
  const [standaloneWidgetId, setStandaloneWidgetId] = useState<AndroidWidgetId | null>(() => {
    try {
      const w = new URLSearchParams(window.location.search).get('widget') as AndroidWidgetId | null;
      if (
        w === 'tasks_4x2' ||
        w === 'macros_2x2' ||
        w === 'workout_4x2' ||
        w === 'expenses_2x2' ||
        w === 'command_4x3'
      ) {
        return w;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    description: '',
    confirmLabel: 'Confirm',
    onConfirm: () => {},
  });

  useEffect(() => {
    ensureInitialSeedData();
    setTasks(loadTasks());
    setJournals(loadJournals());
    setWorkouts(loadWorkouts());
    setBodyMetrics(loadBodyMetrics());
    setDietEntries(loadDietEntries());
    setNutritionGoals(loadNutritionGoals());
    setExpenses(loadExpenses());
    setSettings(loadSettings());
    setUserProfile(loadUserProfile());
    loadProgressPhotos().then(setPhotos);
  }, []);

  // Apply theme (light / dark / device default) to document root
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      if (settings.theme === 'dark') {
        root.classList.add('dark');
      } else if (settings.theme === 'light') {
        root.classList.remove('dark');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
      }
    };
    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (settings.theme === 'system') applyTheme();
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [settings.theme]);

  useEffect(() => {
    const unsub = initAuth(
      (u) => {
        setUser(u);
        setNeedsAuth(false);
      },
      () => {
        setNeedsAuth(true);
      }
    );
    return () => unsub();
  }, []);

  const handleToggleTask = useCallback((taskId: string, explicitState?: boolean) => {
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === taskId
          ? { ...t, completed: explicitState !== undefined ? explicitState : !t.completed }
          : t
      );
      saveTasks(updated);
      return updated;
    });
  }, []);

  const handleSnoozeTask = useCallback((taskId: string, minutes: number) => {
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === taskId
          ? { ...t, snoozedUntil: Date.now() + minutes * 60000 }
          : t
      );
      saveTasks(updated);
      return updated;
    });
  }, []);

  useEffect(() => {
    initNotificationServiceWorker(handleToggleTask, handleSnoozeTask);
  }, [handleToggleTask, handleSnoozeTask]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const today = getTodayISO();
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      setTasks((prev) => {
        let changed = false;
        const next = prev.map((task) => {
          if (task.date !== today || task.completed || !task.startTime) return task;
          if (task.snoozedUntil && Date.now() < task.snoozedUntil) return task;

          const [hh, mm] = task.startTime.split(':').map(Number);
          if (isNaN(hh) || isNaN(mm)) return task;

          const startMinutes = hh * 60 + mm;
          const triggerMinutes = startMinutes - (task.reminderMinutesBefore ?? 5);
          const stampKey = `${today}-${task.startTime}`;

          if (
            currentMinutes >= triggerMinutes &&
            currentMinutes <= startMinutes + (task.durationMinutes || 30) &&
            task.notifiedAt !== stampKey
          ) {
            changed = true;
            playReminderChime(settings);
            sendPersistentTaskNotification(task, handleToggleTask, settings);
            return { ...task, notifiedAt: stampKey };
          }
          return task;
        });

        if (changed) {
          saveTasks(next);
          return next;
        }
        return prev;
      });
    }, 20000);

    return () => window.clearInterval(interval);
  }, [handleToggleTask, settings]);

  const handleUpdateSettings = (nextSettings: AppSettings) => {
    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

  const handleUpdateProfile = (nextProfile: UserProfile) => {
    setUserProfile(nextProfile);
    saveUserProfile(nextProfile);
  };

  const stepBottomSection = (direction: -1 | 1) => {
    const currentIdx = ORDERED_BOTTOM_SECTIONS.indexOf(activeSection as BottomSectionId);
    if (currentIdx === -1) {
      setActiveSection('tasks');
      return;
    }
    const nextIdx = Math.max(
      0,
      Math.min(ORDERED_BOTTOM_SECTIONS.length - 1, currentIdx + direction)
    );
    if (nextIdx !== currentIdx) {
      setActiveSection(ORDERED_BOTTOM_SECTIONS[nextIdx]);
    }
  };

  const handleAddTask = (newTask: Omit<TaskItem, 'id' | 'createdAt'>) => {
    const item: TaskItem = {
      ...newTask,
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => {
      const next = [item, ...prev];
      saveTasks(next);
      return next;
    });
  };

  const handleAddMultipleTasks = (newTasks: Omit<TaskItem, 'id' | 'createdAt'>[]) => {
    const created: TaskItem[] = newTasks.map((t, idx) => ({
      ...t,
      id: `task-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    }));
    setTasks((prev) => {
      const next = [...created, ...prev];
      saveTasks(next);
      return next;
    });
  };

  const handleUpdateTaskPriority = (taskId: string, priority: TaskPriority) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === taskId ? { ...t, priority } : t));
      saveTasks(next);
      return next;
    });
  };

  const handleUpdateTaskTimeFoundation = (
    taskId: string,
    startTime: string,
    durationMinutes: number,
    reminderMinutesBefore: number
  ) => {
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              startTime,
              durationMinutes,
              reminderMinutesBefore,
              notifiedAt: undefined,
            }
          : t
      );
      saveTasks(next);
      return next;
    });
  };

  const handleReassignTasksDate = (fromDate: string, toDate: string) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.date === fromDate ? { ...t, date: toDate } : t));
      saveTasks(next);
      return next;
    });
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== taskId);
      saveTasks(next);
      return next;
    });
  };

  const handleAttachMeetToTask = (taskId: string, meetUri: string) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === taskId ? { ...t, meetUri } : t));
      saveTasks(next);
      return next;
    });
  };

  const handleAttachContactToTask = (taskId: string, contactName: string, contactEmail: string) => {
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === taskId ? { ...t, contactName, contactEmail } : t
      );
      saveTasks(next);
      return next;
    });
  };

  const handleSaveJournal = (entry: Omit<JournalEntry, 'id' | 'updatedAt'>) => {
    setJournals((prev) => {
      const existingIdx = prev.findIndex((j) => j.date === entry.date);
      let next: JournalEntry[];
      if (existingIdx >= 0) {
        next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          ...entry,
          updatedAt: new Date().toISOString(),
        };
      } else {
        next = [
          {
            ...entry,
            id: `journal-${Date.now()}`,
            updatedAt: new Date().toISOString(),
          },
          ...prev,
        ];
      }
      saveJournals(next);
      return next;
    });
  };

  const handleAddWorkout = (exercise: Omit<WorkoutExercise, 'id' | 'createdAt'>) => {
    const item: WorkoutExercise = {
      ...exercise,
      id: `workout-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setWorkouts((prev) => {
      const next = [item, ...prev];
      saveWorkouts(next);
      return next;
    });
  };

  const handleDeleteWorkout = (id: string) => {
    setWorkouts((prev) => {
      const next = prev.filter((w) => w.id !== id);
      saveWorkouts(next);
      return next;
    });
  };

  const handleSaveBodyMetric = (metric: DailyBodyMetric) => {
    setBodyMetrics((prev) => {
      const filtered = prev.filter((m) => m.date !== metric.date);
      const next = [metric, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
      saveBodyMetrics(next);
      return next;
    });
  };

  const handleAddPhoto = async (photo: Omit<ProgressPhoto, 'id' | 'createdAt'>) => {
    const item: ProgressPhoto = {
      ...photo,
      id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    await saveProgressPhoto(item);
    const updated = await loadProgressPhotos();
    setPhotos(updated);
  };

  const handleDeletePhoto = async (id: string) => {
    await deleteProgressPhoto(id);
    const updated = await loadProgressPhotos();
    setPhotos(updated);
  };

  const handleAddDietEntries = (entries: Omit<DietEntry, 'id' | 'createdAt'>[]) => {
    const created: DietEntry[] = entries.map((e, idx) => ({
      ...e,
      id: `diet-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    }));
    setDietEntries((prev) => {
      const next = [...created, ...prev];
      saveDietEntries(next);
      return next;
    });
  };

  const handleDeleteDietEntry = (id: string) => {
    setDietEntries((prev) => {
      const next = prev.filter((d) => d.id !== id);
      saveDietEntries(next);
      return next;
    });
  };

  const handleUpdateNutritionGoals = (goals: NutritionGoals) => {
    setNutritionGoals(goals);
    saveNutritionGoals(goals);
  };

  const handleAddExpenses = (items: Omit<ExpenseEntry, 'id' | 'createdAt'>[]) => {
    const created: ExpenseEntry[] = items.map((e, idx) => ({
      ...e,
      id: `exp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    }));
    setExpenses((prev) => {
      const next = [...created, ...prev];
      saveExpenses(next);
      return next;
    });
  };

  const handleToggleExpenseCovered = (id: string) => {
    setExpenses((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, isCovered: !e.isCovered } : e));
      saveExpenses(next);
      return next;
    });
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveExpenses(next);
      return next;
    });
  };

  const handleExportBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      tasks,
      journals,
      workouts,
      bodyMetrics,
      dietEntries,
      nutritionGoals,
      expenses,
      settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tournal-backup-${selectedDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (Array.isArray(data.tasks)) {
          setTasks(data.tasks);
          saveTasks(data.tasks);
        }
        if (Array.isArray(data.journals)) {
          setJournals(data.journals);
          saveJournals(data.journals);
        }
        if (Array.isArray(data.workouts)) {
          setWorkouts(data.workouts);
          saveWorkouts(data.workouts);
        }
        if (Array.isArray(data.bodyMetrics)) {
          setBodyMetrics(data.bodyMetrics);
          saveBodyMetrics(data.bodyMetrics);
        }
        if (Array.isArray(data.dietEntries)) {
          setDietEntries(data.dietEntries);
          saveDietEntries(data.dietEntries);
        }
        if (data.nutritionGoals) {
          handleUpdateNutritionGoals(data.nutritionGoals);
        }
        if (Array.isArray(data.expenses)) {
          setExpenses(data.expenses);
          saveExpenses(data.expenses);
        }
        if (data.settings) {
          handleUpdateSettings(data.settings);
        }
      } catch {
        // Ignore invalid JSON
      }
    };
    reader.readAsText(file);
  };

  const handleResetAllData = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reset all local data?',
      description:
        'This will permanently clear all local tasks, journal entries, diet logs, workouts, progress photos, expenses, and reset settings to defaults.',
      confirmLabel: 'Reset',
      onConfirm: async () => {
        localStorage.clear();
        await clearAllProgressPhotos();
        ensureInitialSeedData();
        setTasks([]);
        setJournals([]);
        setWorkouts([]);
        setBodyMetrics([]);
        setPhotos([]);
        setDietEntries([]);
        setNutritionGoals(DEFAULT_NUTRITION_GOALS);
        setExpenses([]);
        setSettings(DEFAULT_SETTINGS);
        setUserProfile(DEFAULT_USER_PROFILE);
      },
    });
  };

  const weekDays = [-2, -1, 0, 1, 2, 3, 4].map((offset) => {
    const iso = getOffsetDateISO(offset);
    const d = new Date(`${iso}T12:00:00`);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.getDate();
    return { iso, dayName, dayNum, isToday: offset === 0 };
  });

  const tasksForSelectedDate = tasks.filter((t) => t.date === selectedDate);

  const sectionTitles: Record<ActiveSection, string> = {
    journal: 'Journal',
    workouts: 'Workouts',
    tasks: 'Tasks',
    diet: 'Daily Diet',
    expenses: 'Expenses',
    assistant: 'Ask AI',
    workspace: 'Google Sync',
    settings: 'Settings',
    profile: 'My Profile',
  };

  const activeVoiceCategory: QuickCaptureCategory =
    activeSection === 'journal' ||
    activeSection === 'workouts' ||
    activeSection === 'tasks' ||
    activeSection === 'diet' ||
    activeSection === 'expenses'
      ? activeSection
      : 'tasks';

  if (standaloneWidgetId) {
    return (
      <AndroidWidgetsGallery
        selectedDate={selectedDate}
        tasks={tasks}
        onToggleTask={handleToggleTask}
        workouts={workouts}
        bodyMetrics={bodyMetrics}
        dietEntries={dietEntries}
        nutritionGoals={nutritionGoals}
        expenses={expenses}
        onToggleExpenseCovered={handleToggleExpenseCovered}
        standaloneWidgetId={standaloneWidgetId}
        onExitStandaloneWidget={() => setStandaloneWidgetId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-[#1C1C1E] dark:text-[#F2F2F7] pb-28">
      {/* Thin, Minimalist, Scrollable iOS Top Bar (Not Sticky — scrolls up with the screen) */}
      <header className="apple-nav relative w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-11 flex items-center justify-between gap-4">
          {/* Left: Humanoid Avatar (or Custom Photo) + User Name -> Opens My Profile */}
          <button
            type="button"
            onClick={() =>
              setActiveSection((prev) => (prev === 'profile' ? 'tasks' : 'profile'))
            }
            className="flex items-center gap-2.5 py-1 pr-2.5 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors cursor-pointer min-w-0"
          >
            <HumanoidAvatar
              avatarDataUrl={userProfile.avatarDataUrl}
              sizeClass="w-7 h-7"
            />
            <span className="text-xs font-bold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7] truncate max-w-[160px]">
              {userProfile.name || 'My Profile'}
            </span>
          </button>

          {/* Right: Single Settings Icon Only (No text, no Sync, no Journal) */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() =>
                setActiveSection((prev) => (prev === 'settings' ? 'tasks' : 'settings'))
              }
              aria-label="Settings"
              title="Settings"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                activeSection === 'settings'
                  ? 'apple-btn-primary text-white'
                  : 'apple-subtile text-[#3A3A3C] dark:text-[#D1D1D6] hover:bg-black/[0.08] dark:hover:bg-white/[0.14]'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Grounded Active Priority Task Strip */}
      <PersistentNotificationBar
        tasksForSelectedDate={tasksForSelectedDate}
        onToggleTask={handleToggleTask}
        selectedDate={selectedDate}
        settings={settings}
      />

      {/* Main iOS Grouped Workspace */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-3 space-y-4">
        {/* Contained iOS Section Header & 7-Day Date Strip */}
        <div className="apple-bento p-4 sm:p-5 space-y-3.5 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-baseline gap-2.5 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
                {sectionTitles[activeSection]}
              </h1>
              {activeSection !== 'settings' && (
                <span className="text-xs font-medium text-[#636366] dark:text-[#98989D] whitespace-nowrap">
                  {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>

            {activeSection !== 'settings' && (
              <div className="flex items-center gap-2 shrink-0">
                {/* Self-contained iOS Date Picker Button (Never overflows or floats) */}
                <label className="relative inline-flex items-center gap-1.5 h-8 px-3 rounded-lg apple-subtile text-xs font-semibold font-mono tabular-nums text-[#1C1C1E] dark:text-[#F2F2F7] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] cursor-pointer overflow-hidden">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#1E6F56] dark:text-[#34B38A] shrink-0" />
                  <span>{selectedDate}</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      if (e.target.value) setSelectedDate(e.target.value);
                    }}
                    aria-label="Select date"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </label>
              </div>
            )}
          </div>

          {activeSection !== 'settings' && (
            <div className="pt-2.5 border-t border-black/[0.07] dark:border-white/[0.08] grid grid-cols-7 gap-1.5">
              {weekDays.map((wd) => {
                const active = selectedDate === wd.iso;
                const dayTaskCount = tasks.filter((t) => t.date === wd.iso).length;
                return (
                  <button
                    key={wd.iso}
                    type="button"
                    onClick={() => setSelectedDate(wd.iso)}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                      active
                        ? 'apple-btn-primary text-white'
                        : wd.isToday
                          ? 'text-[#1E6F56] dark:text-[#34B38A] font-bold bg-[#1E6F56]/12 dark:bg-[#34B38A]/15 border border-[#1E6F56]/25'
                          : 'text-[#2C2C2E] dark:text-[#E5E5EA] apple-subtile hover:bg-black/[0.06] dark:hover:bg-white/[0.1]'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-tight leading-none ${
                        active
                          ? 'text-white/90'
                          : wd.isToday
                            ? 'text-[#1E6F56] dark:text-[#34B38A]'
                            : 'text-[#636366] dark:text-[#98989D]'
                      }`}
                    >
                      {wd.dayName}
                    </span>
                    <span className="text-sm font-bold font-mono tabular-nums leading-tight mt-1">
                      {wd.dayNum}
                    </span>
                    <span
                      className={`w-1 h-1 rounded-full mt-1 ${
                        dayTaskCount > 0
                          ? active
                            ? 'bg-white'
                            : 'bg-[#1E6F56] dark:bg-[#34B38A]'
                          : 'bg-transparent'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Animated View Container */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeSection === 'tasks' && (
              <DailyTasksAndJournalView
                viewFilter="tasks_only"
                selectedDate={selectedDate}
                onChangeDate={setSelectedDate}
                tasks={tasks}
                onAddTask={handleAddTask}
                onAddMultipleTasks={handleAddMultipleTasks}
                onToggleTask={handleToggleTask}
                onUpdateTaskPriority={handleUpdateTaskPriority}
                onUpdateTaskTimeFoundation={handleUpdateTaskTimeFoundation}
                onReassignTasksDate={handleReassignTasksDate}
                onDeleteTask={handleDeleteTask}
                journals={journals}
                onSaveJournal={handleSaveJournal}
                settings={settings}
                onOpenAskAI={() => setActiveSection('assistant')}
              />
            )}

            {activeSection === 'journal' && (
              <DailyTasksAndJournalView
                viewFilter="journal_only"
                selectedDate={selectedDate}
                onChangeDate={setSelectedDate}
                tasks={tasks}
                onAddTask={handleAddTask}
                onAddMultipleTasks={handleAddMultipleTasks}
                onToggleTask={handleToggleTask}
                onUpdateTaskPriority={handleUpdateTaskPriority}
                onUpdateTaskTimeFoundation={handleUpdateTaskTimeFoundation}
                onReassignTasksDate={handleReassignTasksDate}
                onDeleteTask={handleDeleteTask}
                journals={journals}
                onSaveJournal={handleSaveJournal}
                settings={settings}
              />
            )}

            {activeSection === 'diet' && (
              <DietTrackerView
                selectedDate={selectedDate}
                dietEntries={dietEntries}
                onAddDietEntries={handleAddDietEntries}
                onDeleteDietEntry={handleDeleteDietEntry}
                nutritionGoals={nutritionGoals}
                onUpdateNutritionGoals={handleUpdateNutritionGoals}
              />
            )}

            {activeSection === 'expenses' && (
              <ExpensesTrackerView
                selectedDate={selectedDate}
                expenses={expenses}
                onAddExpenses={handleAddExpenses}
                onToggleExpenseCovered={handleToggleExpenseCovered}
                onDeleteExpense={handleDeleteExpense}
              />
            )}

            {activeSection === 'assistant' && (
              <AIChatbotView
                selectedDate={selectedDate}
                tasks={tasks}
                journals={journals}
                workouts={workouts}
                bodyMetrics={bodyMetrics}
                dietEntries={dietEntries}
                nutritionGoals={nutritionGoals}
                expenses={expenses}
                onClose={() => setActiveSection('tasks')}
              />
            )}

            {activeSection === 'workouts' && (
              <WorkoutAndPhotoVault
                selectedDate={selectedDate}
                onChangeDate={setSelectedDate}
                workouts={workouts}
                onAddWorkout={handleAddWorkout}
                onDeleteWorkout={handleDeleteWorkout}
                bodyMetrics={bodyMetrics}
                onSaveBodyMetric={handleSaveBodyMetric}
                photos={photos}
                onAddPhoto={handleAddPhoto}
                onDeletePhoto={handleDeletePhoto}
                settings={settings}
              />
            )}

            {activeSection === 'profile' && (
              <ProfileView
                profile={userProfile}
                onUpdateProfile={handleUpdateProfile}
                selectedDate={selectedDate}
                tasks={tasks}
                onToggleTask={handleToggleTask}
                journals={journals}
                workouts={workouts}
                bodyMetrics={bodyMetrics}
                dietEntries={dietEntries}
                nutritionGoals={nutritionGoals}
                expenses={expenses}
                onToggleExpenseCovered={handleToggleExpenseCovered}
                onOpenStandaloneWidget={(id) => setStandaloneWidgetId(id)}
                user={user}
                needsAuth={needsAuth}
                onAuthChange={(u, needs) => {
                  setUser(u);
                  setNeedsAuth(needs);
                }}
                onImportTasks={handleAddMultipleTasks}
                onAttachMeetToTask={handleAttachMeetToTask}
                onAttachContactToTask={handleAttachContactToTask}
                requestConfirmation={(cfg) =>
                  setConfirmDialog({
                    ...cfg,
                    isOpen: true,
                  })
                }
              />
            )}

            {activeSection === 'workspace' && (
              <WorkspaceIntegrationPanel
                user={user}
                needsAuth={needsAuth}
                onAuthChange={(u, needs) => {
                  setUser(u);
                  setNeedsAuth(needs);
                }}
                selectedDate={selectedDate}
                tasksForSelectedDate={tasksForSelectedDate}
                onImportTasks={handleAddMultipleTasks}
                onAttachMeetToTask={handleAttachMeetToTask}
                onAttachContactToTask={handleAttachContactToTask}
                requestConfirmation={(cfg) =>
                  setConfirmDialog({
                    ...cfg,
                    isOpen: true,
                  })
                }
              />
            )}

            {activeSection === 'settings' && (
              <SettingsView
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onExportBackup={handleExportBackup}
                onImportBackup={handleImportBackup}
                onResetAllData={handleResetAllData}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Quick-Capture Floating Microphone Button Positioned in the Bottom Navigation Bar Center Area */}
      <QuickCaptureVoiceFAB
        activeCategory={activeVoiceCategory}
        selectedDate={selectedDate}
        onChangeDate={setSelectedDate}
        settings={settings}
        journals={journals}
        onAddMultipleTasks={handleAddMultipleTasks}
        onSaveJournal={handleSaveJournal}
        onAddWorkout={handleAddWorkout}
        onSaveBodyMetric={handleSaveBodyMetric}
        onAddDietEntries={handleAddDietEntries}
        onAddExpenses={handleAddExpenses}
      />

      {/* Fixed Bottom Bar: 5 Ordered Sections (1: Journal, 2: Workouts, 3: Tasks [Center], 4: Diet, 5: Expenses) with Left/Right Swipe & Scroll */}
      <nav
        aria-label="Bottom Category Navigation Bar"
        onTouchStart={(e) => {
          setSwipeStartX(e.touches[0]?.clientX ?? null);
        }}
        onTouchEnd={(e) => {
          if (swipeStartX === null) return;
          const endX = e.changedTouches[0]?.clientX ?? swipeStartX;
          const deltaX = endX - swipeStartX;
          if (Math.abs(deltaX) > 36) {
            stepBottomSection(deltaX < 0 ? 1 : -1);
          }
          setSwipeStartX(null);
        }}
        onPointerDown={(e) => {
          setSwipeStartX(e.clientX);
        }}
        onPointerUp={(e) => {
          if (swipeStartX === null) return;
          const deltaX = e.clientX - swipeStartX;
          if (Math.abs(deltaX) > 45) {
            stepBottomSection(deltaX < 0 ? 1 : -1);
          }
          setSwipeStartX(null);
        }}
        onWheel={(e) => {
          const now = Date.now();
          if (now - lastWheelSwitchRef.current < 320) return;
          const horiz = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          if (Math.abs(horiz) > 18) {
            lastWheelSwitchRef.current = now;
            stepBottomSection(horiz > 0 ? 1 : -1);
          }
        }}
        className="fixed bottom-0 inset-x-0 z-40 ios-tab-bar select-none"
      >
        <div className="max-w-2xl mx-auto px-2 h-16 flex items-center gap-1">
          {/* Left Slide Step Affordance */}
          <button
            type="button"
            onClick={() => stepBottomSection(-1)}
            aria-label="Previous section"
            className="w-7 h-10 rounded-lg flex items-center justify-center text-[#636366] dark:text-[#98989D] hover:text-[#1C1C1E] dark:hover:text-white shrink-0 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* 5 Ordered Sections: 1. Journal | 2. Workouts | 3. Tasks (Center) | 4. Diet | 5. Expenses */}
          <div className="flex-1 grid grid-cols-5 items-center gap-1">
            {(
              [
                { id: 'journal', label: 'Journal', icon: BookOpen, isCenter: false },
                { id: 'workouts', label: 'Workouts', icon: Dumbbell, isCenter: false },
                { id: 'tasks', label: 'Tasks', icon: CheckSquare, isCenter: true },
                { id: 'diet', label: 'Diet', icon: Flame, isCenter: false },
                { id: 'expenses', label: 'Expenses', icon: Receipt, isCenter: false },
              ] as const
            ).map(({ id, label, icon: Icon, isCenter }) => {
              const active = activeSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSection(id)}
                  className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all ${
                    active
                      ? 'text-[#1E6F56] dark:text-[#34B38A]'
                      : 'text-[#636366] dark:text-[#98989D] hover:text-[#1C1C1E] dark:hover:text-[#F2F2F7]'
                  }`}
                >
                  <div
                    className={`rounded-full flex items-center justify-center transition-all ${
                      isCenter
                        ? active
                          ? 'w-10 h-7 apple-btn-primary text-white shadow-xs'
                          : 'w-9 h-6 bg-black/[0.06] dark:bg-white/[0.09]'
                        : active
                          ? 'w-8 h-6 bg-[#1E6F56]/15 dark:bg-[#34B38A]/20'
                          : 'w-8 h-6'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                  </div>
                  <span
                    className={`text-[10px] tracking-tight mt-0.5 whitespace-nowrap ${
                      active ? 'font-bold' : 'font-medium'
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Slide Step Affordance */}
          <button
            type="button"
            onClick={() => stepBottomSection(1)}
            aria-label="Next section"
            className="w-7 h-10 rounded-lg flex items-center justify-center text-[#636366] dark:text-[#98989D] hover:text-[#1C1C1E] dark:hover:text-white shrink-0 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            className="apple-bento max-w-sm w-full p-6 space-y-4 text-center"
          >
            <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              {confirmDialog.title}
            </h3>
            <p className="text-xs text-[#48484A] dark:text-[#AEAEB2] leading-relaxed">
              {confirmDialog.description}
            </p>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="min-h-[42px] rounded-full apple-subtile text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const fn = confirmDialog.onConfirm;
                  setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                  await fn();
                }}
                className="min-h-[42px] rounded-full apple-btn-primary text-xs font-semibold cursor-pointer"
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
