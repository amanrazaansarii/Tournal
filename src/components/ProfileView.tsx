import React, { useState, useMemo } from 'react';
import {
  Camera,
  Trash2,
  Check,
  CheckCircle2,
  BookOpen,
  Dumbbell,
  Flame,
  Receipt,
  ChevronDown,
  ChevronUp,
  Activity,
  BarChart3,
  HeartPulse,
  PieChart,
  TrendingUp,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  UserProfile,
  TaskItem,
  JournalEntry,
  WorkoutExercise,
  DailyBodyMetric,
  DietEntry,
  NutritionGoals,
  ExpenseEntry,
  ConfirmDialogState,
} from '../types';
import { WorkspaceIntegrationPanel } from './WorkspaceIntegrationPanel';
import { AndroidWidgetsGallery, AndroidWidgetId } from './AndroidWidgetsGallery';

export const HumanoidAvatar: React.FC<{
  avatarDataUrl?: string;
  sizeClass?: string;
}> = ({ avatarDataUrl, sizeClass = 'w-8 h-8' }) => {
  if (avatarDataUrl) {
    return (
      <img
        src={avatarDataUrl}
        alt="Profile avatar"
        referrerPolicy="no-referrer"
        className={`${sizeClass} rounded-full object-cover border border-black/[0.1] dark:border-white/[0.14] shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-b from-[#2A8568] to-[#195E48] flex items-center justify-center text-white border border-white/15 shadow-2xs shrink-0 overflow-hidden`}
    >
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[78%] h-[78%]"
      >
        <circle cx="18" cy="12.5" r="5.5" fill="currentColor" fillOpacity="0.95" />
        <path
          d="M7.5 31C7.5 25.201 12.201 20.5 18 20.5C23.799 20.5 28.5 25.201 28.5 31"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

interface ProfileViewProps {
  profile: UserProfile;
  onUpdateProfile: (next: UserProfile) => void;
  selectedDate: string;
  tasks: TaskItem[];
  onToggleTask?: (taskId: string) => void;
  journals: JournalEntry[];
  workouts: WorkoutExercise[];
  bodyMetrics: DailyBodyMetric[];
  dietEntries: DietEntry[];
  nutritionGoals: NutritionGoals;
  expenses: ExpenseEntry[];
  onToggleExpenseCovered?: (id: string) => void;
  onOpenStandaloneWidget?: (widgetId: AndroidWidgetId) => void;
  user: User | null;
  needsAuth: boolean;
  onAuthChange: (user: User | null, needsAuth: boolean) => void;
  onImportTasks: (newTasks: Omit<TaskItem, 'id' | 'createdAt'>[]) => void;
  onAttachMeetToTask: (taskId: string, meetUri: string) => void;
  onAttachContactToTask: (taskId: string, name: string, email: string) => void;
  requestConfirmation: (dialog: Omit<ConfirmDialogState, 'isOpen'>) => void;
}

type AnalyticsTab = 'all' | 'tasks' | 'diet' | 'workout' | 'health' | 'expenses';

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onUpdateProfile,
  selectedDate,
  tasks,
  onToggleTask,
  journals,
  workouts,
  bodyMetrics,
  dietEntries,
  nutritionGoals,
  expenses,
  onToggleExpenseCovered,
  onOpenStandaloneWidget,
  user,
  needsAuth,
  onAuthChange,
  onImportTasks,
  onAttachMeetToTask,
  onAttachContactToTask,
  requestConfirmation,
}) => {
  const [nameInput, setNameInput] = useState(profile.name);
  const [bioInput, setBioInput] = useState(profile.bio);
  const [savedToast, setSavedToast] = useState(false);
  const [showKeepImport, setShowKeepImport] = useState(false);

  // Interactive Performance Charts state
  const [activeChartTab, setActiveChartTab] = useState<AnalyticsTab>('all');
  const [dayRange, setDayRange] = useState<7 | 14>(7);
  const [selectedBarDate, setSelectedBarDate] = useState<string>(selectedDate);

  React.useEffect(() => {
    setSelectedBarDate(selectedDate);
  }, [selectedDate]);

  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const sortedMetricsDesc = useMemo(
    () => [...bodyMetrics].sort((a, b) => b.date.localeCompare(a.date)),
    [bodyMetrics]
  );
  const latestWeight = sortedMetricsDesc[0];
  const pendingExpensesCount = expenses.filter((e) => !e.isCovered).length;

  // Build date window ending at selectedDate
  const dateSeries = useMemo(() => {
    const base = new Date(`${selectedDate}T12:00:00`);
    const list: { iso: string; shortLabel: string }[] = [];
    for (let i = dayRange - 1; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const iso = `${yyyy}-${mm}-${dd}`;
      const shortLabel = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      list.push({ iso, shortLabel });
    }
    return list;
  }, [selectedDate, dayRange]);

  // 1. Task Completions Analytics
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const byPriority = (p: 'high' | 'medium' | 'low') => {
      const pTasks = tasks.filter((t) => t.priority === p);
      const pDone = pTasks.filter((t) => t.completed).length;
      return {
        total: pTasks.length,
        done: pDone,
        pct: pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0,
      };
    };

    const dailySeries = dateSeries.map((ds) => {
      const dTasks = tasks.filter((t) => t.date === ds.iso);
      const dDone = dTasks.filter((t) => t.completed).length;
      return {
        ...ds,
        total: dTasks.length,
        done: dDone,
        pending: dTasks.length - dDone,
        pct: dTasks.length > 0 ? Math.round((dDone / dTasks.length) * 100) : 0,
      };
    });

    const focusedDay =
      dailySeries.find((d) => d.iso === selectedBarDate) ||
      dailySeries[dailySeries.length - 1];

    return {
      total,
      completed,
      rate,
      p1: byPriority('high'),
      p2: byPriority('medium'),
      p3: byPriority('low'),
      dailySeries,
      focusedDay,
    };
  }, [tasks, dateSeries, selectedBarDate]);

  // 2. Diet & Nutrition Analytics
  const dietStats = useMemo(() => {
    const dailySeries = dateSeries.map((ds) => {
      const entries = dietEntries.filter((e) => e.date === ds.iso);
      const calories = Math.round(entries.reduce((s, e) => s + e.calories, 0));
      const protein = Math.round(entries.reduce((s, e) => s + e.proteinGrams, 0) * 10) / 10;
      const carbs = Math.round(entries.reduce((s, e) => s + e.carbsGrams, 0));
      const fat = Math.round(entries.reduce((s, e) => s + e.fatGrams, 0));
      const fiber = Math.round(entries.reduce((s, e) => s + e.fiberGrams, 0) * 10) / 10;
      const calPct = Math.min(
        Math.round((calories / Math.max(nutritionGoals.targetCalories, 1)) * 100),
        130
      );
      const proPct = Math.min(
        Math.round((protein / Math.max(nutritionGoals.targetProteinGrams, 1)) * 100),
        130
      );
      return {
        ...ds,
        calories,
        protein,
        carbs,
        fat,
        fiber,
        calPct,
        proPct,
      };
    });

    const activeDays = dailySeries.filter((d) => d.calories > 0);
    const avgCalories =
      activeDays.length > 0
        ? Math.round(activeDays.reduce((s, d) => s + d.calories, 0) / activeDays.length)
        : 0;
    const avgProtein =
      activeDays.length > 0
        ? Math.round(
            (activeDays.reduce((s, d) => s + d.protein, 0) / activeDays.length) * 10
          ) / 10
        : 0;

    const focusedDay =
      dailySeries.find((d) => d.iso === selectedBarDate) ||
      dailySeries[dailySeries.length - 1];

    return {
      dailySeries,
      avgCalories,
      avgProtein,
      focusedDay,
    };
  }, [dietEntries, dateSeries, nutritionGoals, selectedBarDate]);

  // 3. Workout Performance Analytics
  const workoutStats = useMemo(() => {
    const totalSets = workouts.reduce((s, w) => s + w.sets, 0);
    const totalVolume = workouts.reduce((s, w) => s + w.weight * w.sets * w.reps, 0);
    const failureCount = workouts.filter((w) => w.effortState === 'to_failure').length;
    const controlCount = workouts.filter((w) => w.effortState === 'in_control').length;
    const failurePct =
      workouts.length > 0 ? Math.round((failureCount / workouts.length) * 100) : 0;

    const dailySeries = dateSeries.map((ds) => {
      const dWorkouts = workouts.filter((w) => w.date === ds.iso);
      const vol = dWorkouts.reduce((s, w) => s + w.weight * w.sets * w.reps, 0);
      const sets = dWorkouts.reduce((s, w) => s + w.sets, 0);
      return {
        ...ds,
        exercisesCount: dWorkouts.length,
        volume: vol,
        sets,
      };
    });

    const maxVolume = Math.max(...dailySeries.map((d) => d.volume), 1);
    const focusedDay =
      dailySeries.find((d) => d.iso === selectedBarDate) ||
      dailySeries[dailySeries.length - 1];

    return {
      totalSets,
      totalVolume,
      failureCount,
      controlCount,
      failurePct,
      dailySeries,
      maxVolume,
      focusedDay,
    };
  }, [workouts, dateSeries, selectedBarDate]);

  // 4. Health & Recovery Analytics (Bodyweight Trend + Mindfulness/Journal Consistency + Composite Score)
  const healthStats = useMemo(() => {
    const sortedMetrics = [...bodyMetrics].sort((a, b) => a.date.localeCompare(b.date));
    const minWeight =
      sortedMetrics.length > 0
        ? Math.min(...sortedMetrics.map((m) => m.bodyWeight)) - 2
        : 0;
    const maxWeight =
      sortedMetrics.length > 0
        ? Math.max(...sortedMetrics.map((m) => m.bodyWeight)) + 2
        : 100;

    const weightDelta =
      sortedMetrics.length >= 2
        ? Math.round(
            (sortedMetrics[sortedMetrics.length - 1].bodyWeight -
              sortedMetrics[0].bodyWeight) *
              10
          ) / 10
        : 0;

    // Composite Health Readiness Score (0 - 100) driven purely by user's logged records
    const proteinAdherence =
      dietEntries.length > 0
        ? Math.min(
            (dietStats.avgProtein / Math.max(nutritionGoals.targetProteinGrams, 1)) * 100,
            100
          )
        : 0;
    const targetWorkoutDays = dayRange === 14 ? 8 : 4;
    const workoutDaysCount = workoutStats.dailySeries.filter((d) => d.sets > 0).length;
    const workoutConsistency = Math.min(
      (workoutDaysCount / targetWorkoutDays) * 100,
      100
    );
    const journalDaysInWindow = dateSeries.filter((ds) =>
      journals.some((j) => j.date === ds.iso && j.content.trim().length > 0)
    ).length;
    const targetJournalDays = dayRange === 14 ? 10 : 5;
    const journalConsistency = Math.min(
      (journalDaysInWindow / targetJournalDays) * 100,
      100
    );
    const compositeHealthScore = Math.round(
      proteinAdherence * 0.35 +
        workoutConsistency * 0.3 +
        taskStats.rate * 0.2 +
        journalConsistency * 0.15
    );

    return {
      sortedMetrics,
      minWeight,
      maxWeight,
      weightDelta,
      compositeHealthScore,
      proteinAdherence: Math.round(proteinAdherence),
      workoutConsistency: Math.round(workoutConsistency),
      journalConsistency: Math.round(journalConsistency),
    };
  }, [
    bodyMetrics,
    dietEntries.length,
    dietStats.avgProtein,
    nutritionGoals.targetProteinGrams,
    workoutStats.dailySeries,
    dateSeries,
    journals,
    dayRange,
    taskStats.rate,
  ]);

  // 5. Expenditure Coverage Analytics
  const expenseStats = useMemo(() => {
    const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
    const coveredAmount = expenses
      .filter((e) => e.isCovered)
      .reduce((s, e) => s + e.amount, 0);
    const pendingAmount = totalAmount - coveredAmount;
    const coveragePct =
      totalAmount > 0 ? Math.round((coveredAmount / totalAmount) * 100) : 0;

    const categoryMap = new Map<
      string,
      { category: string; covered: number; pending: number; total: number }
    >();
    expenses.forEach((e) => {
      const cat = e.category || 'Other';
      const cur = categoryMap.get(cat) || {
        category: cat,
        covered: 0,
        pending: 0,
        total: 0,
      };
      if (e.isCovered) {
        cur.covered += e.amount;
      } else {
        cur.pending += e.amount;
      }
      cur.total += e.amount;
      categoryMap.set(cat, cur);
    });

    const categories = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
    const maxCategoryTotal = Math.max(...categories.map((c) => c.total), 1);

    return {
      totalAmount,
      coveredAmount,
      pendingAmount,
      coveragePct,
      categories,
      maxCategoryTotal,
    };
  }, [expenses]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 320;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
          onUpdateProfile({
            ...profile,
            name: nameInput.trim() || 'My Profile',
            bio: bioInput.trim(),
            avatarDataUrl: dataUrl,
            updatedAt: new Date().toISOString(),
          });
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    onUpdateProfile({
      ...profile,
      avatarDataUrl: '',
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...profile,
      name: nameInput.trim() || 'My Profile',
      bio: bioInput.trim(),
      updatedAt: new Date().toISOString(),
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  const showSection = (key: Exclude<AnalyticsTab, 'all'>) =>
    activeChartTab === 'all' || activeChartTab === key;

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      {/* 1. iOS Profile Identity Card */}
      <form onSubmit={handleSaveProfile} className="apple-bento p-6 space-y-5">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative group">
            <HumanoidAvatar
              avatarDataUrl={profile.avatarDataUrl}
              sizeClass="w-20 h-20"
            />
            <label
              title="Upload custom profile image"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full apple-btn-primary flex items-center justify-center cursor-pointer shadow-md"
            >
              <Camera className="w-4 h-4 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1">
            <h2 className="text-lg font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">
              {profile.name || 'My Profile'}
            </h2>
            <p className="text-xs text-[#636366] dark:text-[#98989D]">
              {profile.bio || 'Personal Daily Planner & Ledger'}
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1.5">
              <label className="px-3 py-1.5 rounded-lg apple-subtile text-xs font-semibold text-[#1E6F56] dark:text-[#34B38A] cursor-pointer">
                <span>Upload Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
              {profile.avatarDataUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="px-3 py-1.5 rounded-lg apple-subtile text-xs font-semibold text-[#FF3B30] flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Use Default Avatar</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-black/[0.07] dark:border-white/[0.08]">
          <div>
            <label className="block text-[11px] font-medium text-[#636366] dark:text-[#98989D] mb-1">
              Display Name (Shown on Top Bar)
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your Name..."
              className="w-full apple-subtile px-3.5 py-2 text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7] focus:outline-none focus:border-[#1E6F56]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#636366] dark:text-[#98989D] mb-1">
              Daily Focus / Bio
            </label>
            <input
              type="text"
              value={bioInput}
              onChange={(e) => setBioInput(e.target.value)}
              placeholder="Your daily focus..."
              className="w-full apple-subtile px-3.5 py-2 text-sm text-[#1C1C1E] dark:text-[#F2F2F7] focus:outline-none focus:border-[#1E6F56]"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="min-h-[38px] px-4 py-1.5 rounded-full apple-btn-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            {savedToast ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved Profile</span>
              </>
            ) : (
              <span>Save Profile</span>
            )}
          </button>
        </div>
      </form>

      {/* 2. Personal Activity Snapshot */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="apple-bento p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#636366] dark:text-[#98989D]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1E6F56] dark:text-[#34B38A]" />
            <span>Tasks Done</span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-[#1C1C1E] dark:text-[#F2F2F7]">
            {completedTasksCount}/{tasks.length}
          </div>
        </div>

        <div className="apple-bento p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#636366] dark:text-[#98989D]">
            <BookOpen className="w-3.5 h-3.5 text-[#1E6F56] dark:text-[#34B38A]" />
            <span>Journals</span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-[#1C1C1E] dark:text-[#F2F2F7]">
            {journals.length}
          </div>
        </div>

        <div className="apple-bento p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#636366] dark:text-[#98989D]">
            <Dumbbell className="w-3.5 h-3.5 text-[#1E6F56] dark:text-[#34B38A]" />
            <span>Workouts</span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-[#1C1C1E] dark:text-[#F2F2F7]">
            {workouts.length}{' '}
            {latestWeight ? (
              <span className="text-xs font-normal text-[#636366] dark:text-[#98989D]">
                ({latestWeight.bodyWeight} {latestWeight.bodyWeightUnit})
              </span>
            ) : null}
          </div>
        </div>

        <div className="apple-bento p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#636366] dark:text-[#98989D]">
            <Flame className="w-3.5 h-3.5 text-[#FF9500]" />
            <span>Meals & Bills</span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-[#1C1C1E] dark:text-[#F2F2F7]">
            {dietEntries.length}{' '}
            <span className="text-xs font-normal text-[#636366] dark:text-[#98989D]">
              · {pendingExpensesCount} due
            </span>
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE PERFORMANCE & PROGRESS CHARTS SUITE */}
      <div className="apple-bento p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#1E6F56] dark:text-[#34B38A]" />
              <h3 className="text-base font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">
                Interactive Performance & Progress Overview
              </h3>
            </div>
            <p className="text-xs text-[#636366] dark:text-[#98989D] mt-0.5">
              Tap any chart bar, node, or domain filter below to inspect your progress across all 5 pillars.
            </p>
          </div>

          {/* Timeframe Selector (7D / 14D) */}
          <div className="flex items-center gap-1 apple-subtile p-1 rounded-full">
            {([7, 14] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setDayRange(days)}
                className={`px-3 py-1 rounded-full text-xs font-mono font-semibold cursor-pointer transition-all ${
                  dayRange === days
                    ? 'apple-btn-primary text-white'
                    : 'text-[#636366] dark:text-[#98989D]'
                }`}
              >
                {days}D Window
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Domain Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {(
            [
              { id: 'all', label: 'All 5 Pillars', icon: PieChart },
              { id: 'tasks', label: 'Task Completions', icon: CheckCircle2 },
              { id: 'diet', label: 'Diet & Macros', icon: Flame },
              { id: 'workout', label: 'Workout & Volume', icon: Dumbbell },
              { id: 'health', label: 'Health & Weight', icon: HeartPulse },
              { id: 'expenses', label: 'Expenditure Coverage', icon: Receipt },
            ] as const
          ).map(({ id, label, icon: Icon }) => {
            const active = activeChartTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveChartTab(id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  active
                    ? 'apple-btn-primary text-white shadow-2xs'
                    : 'apple-subtile text-[#3A3A3C] dark:text-[#D1D1D6] hover:bg-black/[0.06] dark:hover:bg-white/[0.1]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CHART 1: MY TASK COMPLETIONS */}
          {showSection('tasks') && (
            <div className="apple-subtile p-4 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1E6F56] dark:text-[#34B38A]" />
                  <div>
                    <div className="text-xs font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">
                      Task Completions
                    </div>
                    <div className="text-[11px] text-[#636366] dark:text-[#98989D]">
                      Daily execution & priority breakdown
                    </div>
                  </div>
                </div>
                <span className="text-lg font-bold font-mono tabular-nums text-[#1E6F56] dark:text-[#34B38A]">
                  {taskStats.rate}%
                </span>
              </div>

              {/* Priority Completion Bars (P1 / P2 / P3) */}
              <div className="space-y-2">
                {(
                  [
                    { label: 'P1 High Priority', stat: taskStats.p1, color: 'bg-[#FF453A]' },
                    { label: 'P2 Medium Priority', stat: taskStats.p2, color: 'bg-[#FF9F0A]' },
                    { label: 'P3 Low Priority', stat: taskStats.p3, color: 'bg-[#34B38A]' },
                  ] as const
                ).map((row) => (
                  <div key={row.label} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#3A3A3C] dark:text-[#D1D1D6] font-medium">
                        {row.label}
                      </span>
                      <span className="font-mono tabular-nums text-[#636366] dark:text-[#98989D]">
                        {row.stat.done}/{row.stat.total} ({row.stat.pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-black/[0.08] dark:bg-white/[0.08] overflow-hidden">
                      <div
                        style={{ width: `${row.stat.pct}%` }}
                        className={`h-full rounded-full ${row.color} transition-all duration-500`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Interactive Daily Task Bar Chart */}
              <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase text-[#636366] dark:text-[#98989D]">
                  <span>Daily Task Completion Ratio</span>
                  {taskStats.focusedDay && (
                    <span className="font-mono text-[#1E6F56] dark:text-[#34B38A]">
                      {taskStats.focusedDay.shortLabel}: {taskStats.focusedDay.done}/
                      {taskStats.focusedDay.total} ({taskStats.focusedDay.pct}%)
                    </span>
                  )}
                </div>
                <div className="h-24 flex items-end gap-1.5">
                  {taskStats.dailySeries.map((d) => {
                    const isSelected = d.iso === selectedBarDate;
                    const barHeight = d.total > 0 ? Math.max(d.pct, 12) : 6;
                    return (
                      <button
                        key={d.iso}
                        type="button"
                        onClick={() => setSelectedBarDate(d.iso)}
                        title={`${d.shortLabel}: ${d.done}/${d.total} completed`}
                        className="flex-1 flex flex-col items-center gap-1 h-full justify-end group cursor-pointer"
                      >
                        <div className="w-full bg-black/[0.06] dark:bg-white/[0.06] rounded-t-md h-16 flex items-end overflow-hidden">
                          <div
                            style={{ height: `${barHeight}%` }}
                            className={`w-full rounded-t-md transition-all ${
                              isSelected
                                ? 'bg-[#34B38A]'
                                : d.total > 0
                                  ? 'bg-[#1E6F56]/75 group-hover:bg-[#34B38A]'
                                  : 'bg-black/10 dark:bg-white/10'
                            }`}
                          />
                        </div>
                        <span
                          className={`text-[9px] font-mono tabular-nums truncate max-w-full ${
                            isSelected
                              ? 'font-bold text-[#1E6F56] dark:text-[#34B38A]'
                              : 'text-[#636366] dark:text-[#98989D]'
                          }`}
                        >
                          {d.shortLabel.split(' ')[1]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* CHART 2: MY DIET & NUTRITION */}
          {showSection('diet') && (
            <div className="apple-subtile p-4 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#FF9500]" />
                  <div>
                    <div className="text-xs font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">
                      My Diet & Macro Completion
                    </div>
                    <div className="text-[11px] text-[#636366] dark:text-[#98989D]">
                      Avg {dietStats.avgCalories} kcal · {dietStats.avgProtein}g protein
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[#FF9500]">
                  Target: {nutritionGoals.targetCalories} kcal
                </span>
              </div>

              {/* Interactive Dual-Bar Daily Calorie & Protein Chart */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase text-[#636366] dark:text-[#98989D] mb-2">
                  <span>Calorie (Orange) & Protein (Green) %</span>
                  {dietStats.focusedDay && (
                    <span className="font-mono text-[#FF9500]">
                      {dietStats.focusedDay.shortLabel}
                    </span>
                  )}
                </div>
                <div className="h-24 flex items-end gap-1.5">
                  {dietStats.dailySeries.map((d) => {
                    const isSelected = d.iso === selectedBarDate;
                    return (
                      <button
                        key={d.iso}
                        type="button"
                        onClick={() => setSelectedBarDate(d.iso)}
                        title={`${d.shortLabel}: ${d.calories} kcal, ${d.protein}g protein`}
                        className="flex-1 flex flex-col items-center gap-1 h-full justify-end cursor-pointer"
                      >
                        <div className="w-full h-16 flex items-end justify-center gap-0.5 bg-black/[0.05] dark:bg-white/[0.05] rounded-t-md px-0.5 overflow-hidden">
                          <div
                            style={{ height: `${Math.max(Math.min(d.calPct, 100), 6)}%` }}
                            className="w-1/2 bg-[#FF9500] rounded-t-xs transition-all"
                          />
                          <div
                            style={{ height: `${Math.max(Math.min(d.proPct, 100), 6)}%` }}
                            className="w-1/2 bg-[#30D158] rounded-t-xs transition-all"
                          />
                        </div>
                        <span
                          className={`text-[9px] font-mono tabular-nums ${
                            isSelected
                              ? 'font-bold text-[#FF9500]'
                              : 'text-[#636366] dark:text-[#98989D]'
                          }`}
                        >
                          {d.shortLabel.split(' ')[1]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Focused Day Macro Split */}
              {dietStats.focusedDay && (
                <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08] grid grid-cols-4 gap-2 text-center font-mono">
                  <div className="p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.04]">
                    <div className="text-[10px] font-sans text-[#636366] dark:text-[#98989D]">
                      Kcal
                    </div>
                    <div className="text-xs font-bold text-[#FF9500]">
                      {dietStats.focusedDay.calories}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.04]">
                    <div className="text-[10px] font-sans text-[#636366] dark:text-[#98989D]">
                      Protein
                    </div>
                    <div className="text-xs font-bold text-[#30D158]">
                      {dietStats.focusedDay.protein}g
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.04]">
                    <div className="text-[10px] font-sans text-[#636366] dark:text-[#98989D]">
                      Carbs
                    </div>
                    <div className="text-xs font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">
                      {dietStats.focusedDay.carbs}g
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.04]">
                    <div className="text-[10px] font-sans text-[#636366] dark:text-[#98989D]">
                      Fiber
                    </div>
                    <div className="text-xs font-bold text-[#34B38A]">
                      {dietStats.focusedDay.fiber}g
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CHART 3: MY WORKOUT VOLUME & EFFORT */}
          {showSection('workout') && (
            <div className="apple-subtile p-4 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-[#30D158]" />
                  <div>
                    <div className="text-xs font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">
                      My Workout Volume & Intensity
                    </div>
                    <div className="text-[11px] text-[#636366] dark:text-[#98989D]">
                      {workoutStats.totalSets} total sets ·{' '}
                      {workoutStats.totalVolume.toLocaleString()} lbs lifted
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[#FF9500]">
                  {workoutStats.failurePct}% Failure
                </span>
              </div>

              {/* Effort State Split Bar (To Failure vs In Control) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#30D158] font-medium">
                    In Control ({workoutStats.controlCount} exercises)
                  </span>
                  <span className="text-[#FF9500] font-medium">
                    Taken to Failure ({workoutStats.failureCount} exercises)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-black/[0.08] dark:bg-white/[0.08] flex overflow-hidden">
                  <div
                    style={{
                      width: `${
                        workouts.length > 0 ? 100 - workoutStats.failurePct : 0
                      }%`,
                    }}
                    className="h-full bg-[#30D158] transition-all"
                  />
                  <div
                    style={{ width: `${workoutStats.failurePct}%` }}
                    className="h-full bg-[#FF9500] transition-all"
                  />
                </div>
              </div>

              {/* Volume Lifted Bar Chart */}
              <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase text-[#636366] dark:text-[#98989D] mb-2">
                  <span>Daily Training Volume Lifted</span>
                  {workoutStats.focusedDay && (
                    <span className="font-mono text-[#30D158]">
                      {workoutStats.focusedDay.shortLabel}:{' '}
                      {workoutStats.focusedDay.volume.toLocaleString()} vol (
                      {workoutStats.focusedDay.sets} sets)
                    </span>
                  )}
                </div>
                <div className="h-24 flex items-end gap-1.5">
                  {workoutStats.dailySeries.map((d) => {
                    const isSelected = d.iso === selectedBarDate;
                    const pct = Math.round((d.volume / workoutStats.maxVolume) * 100);
                    return (
                      <button
                        key={d.iso}
                        type="button"
                        onClick={() => setSelectedBarDate(d.iso)}
                        title={`${d.shortLabel}: ${d.volume.toLocaleString()} vol (${d.sets} sets)`}
                        className="flex-1 flex flex-col items-center gap-1 h-full justify-end cursor-pointer"
                      >
                        <div className="w-full h-16 bg-black/[0.05] dark:bg-white/[0.05] rounded-t-md flex items-end overflow-hidden">
                          <div
                            style={{ height: `${d.volume > 0 ? Math.max(pct, 14) : 5}%` }}
                            className={`w-full rounded-t-md transition-all ${
                              d.volume > 0
                                ? 'bg-gradient-to-t from-[#1E6F56] to-[#30D158]'
                                : 'bg-black/10 dark:bg-white/10'
                            }`}
                          />
                        </div>
                        <span
                          className={`text-[9px] font-mono tabular-nums ${
                            isSelected
                              ? 'font-bold text-[#30D158]'
                              : 'text-[#636366] dark:text-[#98989D]'
                          }`}
                        >
                          {d.shortLabel.split(' ')[1]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* CHART 4: MY HEALTH & BODYWEIGHT TREND */}
          {showSection('health') && (
            <div className="apple-subtile p-4 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-[#FF453A]" />
                  <div>
                    <div className="text-xs font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">
                      My Health & Bodyweight Curve
                    </div>
                    <div className="text-[11px] text-[#636366] dark:text-[#98989D]">
                      Readiness Index, bodyweight trend & recovery
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-[#34B38A]">
                    {healthStats.compositeHealthScore}/100
                  </div>
                  <div className="text-[10px] text-[#636366] dark:text-[#98989D]">
                    Health Score
                  </div>
                </div>
              </div>

              {/* SVG Bodyweight Trend Line Chart */}
              <div className="p-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-[#34B38A]" />
                    <span>Bodyweight Progression</span>
                  </span>
                  {latestWeight ? (
                    <span className="font-mono font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">
                      {latestWeight.bodyWeight} {latestWeight.bodyWeightUnit}{' '}
                      <span
                        className={`text-[10px] ${
                          healthStats.weightDelta <= 0 ? 'text-[#30D158]' : 'text-[#FF9500]'
                        }`}
                      >
                        ({healthStats.weightDelta > 0 ? '+' : ''}
                        {healthStats.weightDelta})
                      </span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#636366] dark:text-[#98989D]">
                      No weigh-ins yet
                    </span>
                  )}
                </div>

                {healthStats.sortedMetrics.length > 0 ? (
                  <svg viewBox="0 0 260 70" className="w-full h-16 overflow-visible">
                    {(() => {
                      const pts = healthStats.sortedMetrics.slice(-7);
                      const range = Math.max(
                        healthStats.maxWeight - healthStats.minWeight,
                        1
                      );
                      const coords = pts.map((m, idx) => {
                        const x =
                          pts.length === 1 ? 130 : (idx / (pts.length - 1)) * 236 + 12;
                        const y =
                          58 - ((m.bodyWeight - healthStats.minWeight) / range) * 44;
                        return { x, y, m };
                      });
                      const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');
                      return (
                        <>
                          {coords.length > 1 && (
                            <polyline
                              fill="none"
                              stroke="#34B38A"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={polylinePoints}
                            />
                          )}
                          {coords.map((c) => (
                            <g key={c.m.date}>
                              <circle
                                cx={c.x}
                                cy={c.y}
                                r="4"
                                className="fill-[#1E6F56] stroke-[#34B38A] stroke-2"
                              />
                              <text
                                x={c.x}
                                y={c.y - 7}
                                textAnchor="middle"
                                className="fill-[#636366] dark:fill-[#AEAEB2] text-[8px] font-mono"
                              >
                                {c.m.bodyWeight}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                ) : (
                  <div className="py-3 text-center text-[11px] text-[#636366] dark:text-[#98989D]">
                    Log your daily body weight in the Workouts section to plot your trend line.
                  </div>
                )}
              </div>

              {/* 3 Health Pillar Sub-scores */}
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.04]">
                  <div className="text-[10px] font-sans text-[#636366] dark:text-[#98989D]">
                    Nutrition
                  </div>
                  <div className="text-xs font-bold text-[#30D158]">
                    {healthStats.proteinAdherence}%
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.04]">
                  <div className="text-[10px] font-sans text-[#636366] dark:text-[#98989D]">
                    Training
                  </div>
                  <div className="text-xs font-bold text-[#34B38A]">
                    {healthStats.workoutConsistency}%
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.04]">
                  <div className="text-[10px] font-sans text-[#636366] dark:text-[#98989D]">
                    Mindfulness
                  </div>
                  <div className="text-xs font-bold text-[#FF9F0A]">
                    {healthStats.journalConsistency}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CHART 5: MY EXPENDITURE COVERAGE */}
          {showSection('expenses') && (
            <div className="apple-subtile p-4 rounded-2xl space-y-4 md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#FF9F0A]" />
                  <div>
                    <div className="text-xs font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">
                      My Expenditure Coverage & Category Breakdown
                    </div>
                    <div className="text-[11px] text-[#636366] dark:text-[#98989D]">
                      Covered vs. remaining expenses to cover across categories
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-[#30D158] font-bold">
                    Covered: ${expenseStats.coveredAmount.toFixed(2)}
                  </span>
                  <span className="text-[#FF9F0A] font-bold">
                    To Cover: ${expenseStats.pendingAmount.toFixed(2)}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#1E6F56]/20 text-[#34B38A] font-bold">
                    {expenseStats.coveragePct}% Covered
                  </span>
                </div>
              </div>

              {/* Overall Coverage Progress Bar */}
              <div className="w-full h-3 rounded-full bg-black/[0.08] dark:bg-white/[0.08] flex overflow-hidden">
                <div
                  style={{ width: `${expenseStats.coveragePct}%` }}
                  className="h-full bg-gradient-to-r from-[#1E6F56] to-[#30D158] transition-all duration-500"
                />
                <div
                  style={{
                    width: `${
                      expenseStats.totalAmount > 0 ? 100 - expenseStats.coveragePct : 0
                    }%`,
                  }}
                  className="h-full bg-[#FF9F0A]/80 transition-all duration-500"
                />
              </div>

              {/* Category Breakdown Horizontal Bars */}
              {expenseStats.categories.length === 0 ? (
                <div className="py-4 text-center text-xs text-[#636366] dark:text-[#98989D]">
                  No expenses logged yet — add expenses in the Expenses section to track coverage by category.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {expenseStats.categories.map((cat) => {
                    const coveredWidth = Math.round(
                      (cat.covered / expenseStats.maxCategoryTotal) * 100
                    );
                    const pendingWidth = Math.round(
                      (cat.pending / expenseStats.maxCategoryTotal) * 100
                    );
                    return (
                      <div
                        key={cat.category}
                        className="p-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                            {cat.category}
                          </span>
                          <span className="font-mono tabular-nums text-[#636366] dark:text-[#98989D]">
                            ${cat.covered.toFixed(0)} / ${cat.total.toFixed(0)}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-black/[0.08] dark:bg-white/[0.08] flex overflow-hidden">
                          <div
                            style={{ width: `${coveredWidth}%` }}
                            className="h-full bg-[#30D158]"
                          />
                          <div
                            style={{ width: `${pendingWidth}%` }}
                            className="h-full bg-[#FF9F0A]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. ANDROID HOME SCREEN WIDGETS PICKER & GALLERY */}
      <AndroidWidgetsGallery
        selectedDate={selectedDate}
        tasks={tasks}
        onToggleTask={onToggleTask}
        workouts={workouts}
        bodyMetrics={bodyMetrics}
        dietEntries={dietEntries}
        nutritionGoals={nutritionGoals}
        expenses={expenses}
        onToggleExpenseCovered={onToggleExpenseCovered}
        onOpenStandaloneWidget={onOpenStandaloneWidget}
      />

      {/* 5. Optional Google Keep & Workspace Import Drawer */}
      <div className="apple-bento overflow-hidden">
        <button
          type="button"
          onClick={() => setShowKeepImport((prev) => !prev)}
          className="w-full p-4 flex items-center justify-between text-left cursor-pointer"
        >
          <div>
            <div className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
              Google Keep & Workspace Lists
            </div>
            <div className="text-xs text-[#636366] dark:text-[#98989D]">
              Import existing checklists from Google Keep, Tasks, Calendar, or Gmail
            </div>
          </div>
          {showKeepImport ? (
            <ChevronUp className="w-4 h-4 text-[#636366] dark:text-[#98989D]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#636366] dark:text-[#98989D]" />
          )}
        </button>

        {showKeepImport && (
          <div className="p-4 pt-0 border-t border-black/[0.06] dark:border-white/[0.08]">
            <WorkspaceIntegrationPanel
              user={user}
              needsAuth={needsAuth}
              onAuthChange={onAuthChange}
              selectedDate={selectedDate}
              tasksForSelectedDate={tasks.filter((t) => t.date === selectedDate)}
              onImportTasks={onImportTasks}
              onAttachMeetToTask={onAttachMeetToTask}
              onAttachContactToTask={onAttachContactToTask}
              requestConfirmation={requestConfirmation}
            />
          </div>
        )}
      </div>
    </div>
  );
};
