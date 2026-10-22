import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  CheckCircle2,
  Circle,
  Flame,
  Beef,
  Dumbbell,
  Receipt,
  Sparkles,
  Check,
  Pin,
  Maximize2,
  Minimize2,
  Layers,
  Share2,
} from 'lucide-react';
import {
  TaskItem,
  WorkoutExercise,
  DailyBodyMetric,
  DietEntry,
  NutritionGoals,
  ExpenseEntry,
} from '../types';

export type AndroidWidgetId =
  | 'tasks_4x2'
  | 'macros_2x2'
  | 'workout_4x2'
  | 'expenses_2x2'
  | 'command_4x3';

export type WidgetVisualStyle = 'ios_dark' | 'ios_frosted' | 'emerald_tint';

interface AndroidWidgetsGalleryProps {
  selectedDate: string;
  tasks: TaskItem[];
  onToggleTask?: (taskId: string) => void;
  workouts: WorkoutExercise[];
  bodyMetrics: DailyBodyMetric[];
  dietEntries: DietEntry[];
  nutritionGoals: NutritionGoals;
  expenses: ExpenseEntry[];
  onToggleExpenseCovered?: (id: string) => void;
  standaloneWidgetId?: AndroidWidgetId | null;
  onExitStandaloneWidget?: () => void;
  onOpenStandaloneWidget?: (widgetId: AndroidWidgetId) => void;
}

const PINNED_WIDGETS_STORAGE_KEY = 'tournal_pinned_android_widgets_v1';
const WIDGET_STYLE_STORAGE_KEY = 'tournal_android_widget_style_v1';

export const AndroidWidgetsGallery: React.FC<AndroidWidgetsGalleryProps> = ({
  selectedDate,
  tasks,
  onToggleTask,
  workouts,
  bodyMetrics,
  dietEntries,
  nutritionGoals,
  expenses,
  onToggleExpenseCovered,
  standaloneWidgetId,
  onExitStandaloneWidget,
  onOpenStandaloneWidget,
}) => {
  const [pinnedWidgets, setPinnedWidgets] = useState<AndroidWidgetId[]>(() => {
    try {
      const raw = localStorage.getItem(PINNED_WIDGETS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return ['tasks_4x2', 'macros_2x2', 'command_4x3'];
  });

  const [widgetStyle, setWidgetStyle] = useState<WidgetVisualStyle>(() => {
    try {
      const saved = localStorage.getItem(WIDGET_STYLE_STORAGE_KEY) as WidgetVisualStyle;
      if (saved === 'ios_dark' || saved === 'ios_frosted' || saved === 'emerald_tint') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'ios_dark';
  });

  const [copiedWidgetId, setCopiedWidgetId] = useState<AndroidWidgetId | null>(null);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(PINNED_WIDGETS_STORAGE_KEY, JSON.stringify(pinnedWidgets));
    } catch {
      // ignore
    }
  }, [pinnedWidgets]);

  useEffect(() => {
    try {
      localStorage.setItem(WIDGET_STYLE_STORAGE_KEY, widgetStyle);
    } catch {
      // ignore
    }
  }, [widgetStyle]);

  const togglePinWidget = (id: AndroidWidgetId) => {
    setPinnedWidgets((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCopyWidgetShortcut = (id: AndroidWidgetId) => {
    const url = `${window.location.origin}/?widget=${id}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedWidgetId(id);
    setTimeout(() => setCopiedWidgetId(null), 1800);
  };

  // Data for widgets on selectedDate
  const dayTasks = tasks
    .filter((t) => t.date === selectedDate)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const weight = { high: 3, medium: 2, low: 1 };
      return weight[b.priority] - weight[a.priority];
    });
  const doneDayTasks = dayTasks.filter((t) => t.completed).length;

  const dayDiet = dietEntries.filter((d) => d.date === selectedDate);
  const dayCalories = Math.round(dayDiet.reduce((acc, d) => acc + d.calories, 0));
  const dayProtein =
    Math.round(dayDiet.reduce((acc, d) => acc + d.proteinGrams, 0) * 10) / 10;
  const calPct = Math.min(
    Math.round((dayCalories / Math.max(nutritionGoals.targetCalories, 1)) * 100),
    100
  );
  const proPct = Math.min(
    Math.round((dayProtein / Math.max(nutritionGoals.targetProteinGrams, 1)) * 100),
    100
  );

  const dayWorkouts = workouts.filter((w) => w.date === selectedDate);
  const totalSets = dayWorkouts.reduce((acc, w) => acc + w.sets, 0);
  const totalVolume = dayWorkouts.reduce((acc, w) => acc + w.weight * w.sets * w.reps, 0);
  const latestMetric = bodyMetrics.find((m) => m.date === selectedDate) || bodyMetrics[0];

  const pendingExpenses = expenses
    .filter((e) => !e.isCovered)
    .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate));
  const totalPendingAmount = pendingExpenses.reduce((acc, e) => acc + e.amount, 0);

  const getSurfaceClass = () => {
    if (widgetStyle === 'ios_frosted') {
      return 'bg-[#F2F2F7]/95 text-[#1C1C1E] border border-black/[0.1] shadow-md';
    }
    if (widgetStyle === 'emerald_tint') {
      return 'bg-gradient-to-br from-[#132A23] to-[#0D1A16] text-[#F2F2F7] border border-[#34B38A]/30 shadow-lg';
    }
    return 'bg-[#1C1C1E]/95 text-[#F2F2F7] border border-white/[0.12] shadow-lg';
  };

  const getSubtleTextClass = () =>
    widgetStyle === 'ios_frosted' ? 'text-[#636366]' : 'text-[#98989D]';

  const getPillSurfaceClass = () =>
    widgetStyle === 'ios_frosted'
      ? 'bg-black/[0.05] border border-black/[0.06]'
      : 'bg-white/[0.06] border border-white/[0.08]';

  const renderWidgetContent = (id: AndroidWidgetId) => {
    switch (id) {
      case 'tasks_4x2':
        return (
          <div className={`rounded-[24px] p-4 ${getSurfaceClass()} flex flex-col justify-between min-h-[168px]`}>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#1E6F56] text-white flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold tracking-tight">Today&apos;s Tasks</div>
                  <div className={`text-[10px] ${getSubtleTextClass()}`}>
                    Android 4×2 Checklist Widget
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono tabular-nums font-bold text-[#34B38A]">
                {doneDayTasks}/{dayTasks.length}
              </span>
            </div>

            {dayTasks.length === 0 ? (
              <div className={`text-xs ${getSubtleTextClass()} py-4 text-center`}>
                All clear for {selectedDate}
              </div>
            ) : (
              <div className="space-y-1.5">
                {dayTasks.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onToggleTask?.(t.id)}
                    className={`w-full px-3 py-1.5 rounded-xl ${getPillSurfaceClass()} flex items-center justify-between gap-2 text-left cursor-pointer`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {t.completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#34B38A] shrink-0" />
                      ) : (
                        <Circle className={`w-3.5 h-3.5 ${getSubtleTextClass()} shrink-0`} />
                      )}
                      <span
                        className={`text-xs font-medium truncate ${
                          t.completed ? 'line-through opacity-55' : ''
                        }`}
                      >
                        {t.title}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold shrink-0 ${
                        t.priority === 'high'
                          ? 'text-[#FF453A]'
                          : t.priority === 'medium'
                            ? 'text-[#FF9F0A]'
                            : getSubtleTextClass()
                      }`}
                    >
                      {t.priority === 'high' ? 'P1' : t.priority === 'medium' ? 'P2' : 'P3'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 'macros_2x2':
        return (
          <div className={`rounded-[24px] p-4 ${getSurfaceClass()} flex flex-col justify-between min-h-[168px]`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-[#FF9500]" />
                <span className="text-xs font-bold tracking-tight">Nutrition</span>
              </div>
              <span className={`text-[10px] font-mono ${getSubtleTextClass()}`}>2×2</span>
            </div>

            <div className="space-y-2.5 my-2">
              <div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className={getSubtleTextClass()}>Calories</span>
                  <span className="font-mono font-bold tabular-nums">
                    {dayCalories} / {nutritionGoals.targetCalories}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/20 dark:bg-white/10 mt-1 overflow-hidden">
                  <div
                    style={{ width: `${calPct}%` }}
                    className="h-full rounded-full bg-[#FF9500] transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <Beef className="w-3 h-3 text-[#30D158]" />
                    <span className={getSubtleTextClass()}>Protein</span>
                  </span>
                  <span className="font-mono font-bold tabular-nums text-[#30D158]">
                    {dayProtein}g / {nutritionGoals.targetProteinGrams}g
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/20 dark:bg-white/10 mt-1 overflow-hidden">
                  <div
                    style={{ width: `${proPct}%` }}
                    className="h-full rounded-full bg-[#30D158] transition-all"
                  />
                </div>
              </div>
            </div>

            <div className={`text-[10px] font-mono ${getSubtleTextClass()} flex justify-between`}>
              <span>{Math.max(nutritionGoals.targetCalories - dayCalories, 0)} kcal left</span>
              <span>
                {Math.max(
                  Math.round((nutritionGoals.targetProteinGrams - dayProtein) * 10) / 10,
                  0
                )}
                g pro left
              </span>
            </div>
          </div>
        );

      case 'workout_4x2':
        return (
          <div className={`rounded-[24px] p-4 ${getSurfaceClass()} flex flex-col justify-between min-h-[168px]`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#30D158]/20 text-[#30D158] flex items-center justify-center">
                  <Dumbbell className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold tracking-tight">Workout & Mass</div>
                  <div className={`text-[10px] ${getSubtleTextClass()}`}>Android 4×2 Ledger</div>
                </div>
              </div>
              {latestMetric && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#1E6F56]/25 text-[#34B38A]">
                  {latestMetric.bodyWeight} {latestMetric.bodyWeightUnit}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 my-2">
              <div className={`p-2.5 rounded-xl ${getPillSurfaceClass()}`}>
                <div className={`text-[10px] ${getSubtleTextClass()}`}>Exercises</div>
                <div className="text-base font-bold font-mono tabular-nums mt-0.5">
                  {dayWorkouts.length}
                </div>
              </div>
              <div className={`p-2.5 rounded-xl ${getPillSurfaceClass()}`}>
                <div className={`text-[10px] ${getSubtleTextClass()}`}>Total Sets</div>
                <div className="text-base font-bold font-mono tabular-nums mt-0.5">
                  {totalSets}
                </div>
              </div>
              <div className={`p-2.5 rounded-xl ${getPillSurfaceClass()}`}>
                <div className={`text-[10px] ${getSubtleTextClass()}`}>Volume</div>
                <div className="text-base font-bold font-mono tabular-nums mt-0.5">
                  {totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}k` : '0'}
                </div>
              </div>
            </div>

            <div className={`text-[11px] ${getSubtleTextClass()} truncate`}>
              {dayWorkouts.length > 0
                ? `Latest: ${dayWorkouts[0].exerciseName} (${dayWorkouts[0].weight} ${dayWorkouts[0].weightUnit} × ${dayWorkouts[0].reps})`
                : 'No sets logged yet for today'}
            </div>
          </div>
        );

      case 'expenses_2x2':
        return (
          <div className={`rounded-[24px] p-4 ${getSurfaceClass()} flex flex-col justify-between min-h-[168px]`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#FF9F0A]" />
                <span className="text-xs font-bold tracking-tight">Bills to Cover</span>
              </div>
              <span className={`text-[10px] font-mono ${getSubtleTextClass()}`}>2×2</span>
            </div>

            <div className="my-1.5">
              <div className={`text-[10px] ${getSubtleTextClass()}`}>Remaining Due</div>
              <div className="text-xl font-bold font-mono tabular-nums text-[#FF9F0A]">
                ${totalPendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {pendingExpenses.length > 0 ? (
              <button
                type="button"
                onClick={() => onToggleExpenseCovered?.(pendingExpenses[0].id)}
                className={`w-full px-2.5 py-1.5 rounded-xl ${getPillSurfaceClass()} flex items-center justify-between gap-2 text-left cursor-pointer`}
              >
                <span className="text-xs font-medium truncate">{pendingExpenses[0].name}</span>
                <span className="text-[10px] font-mono text-[#FF9F0A] shrink-0">
                  ${pendingExpenses[0].amount}
                </span>
              </button>
            ) : (
              <div className="text-xs text-[#30D158] font-medium">All expenses covered!</div>
            )}
          </div>
        );

      case 'command_4x3':
        return (
          <div className={`rounded-[26px] p-4 sm:p-5 ${getSurfaceClass()} space-y-3.5`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#2A8568] to-[#195E48] text-white flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold tracking-tight">
                    Daily Command Center Widget (4×3)
                  </div>
                  <div className={`text-[10px] ${getSubtleTextClass()}`}>{selectedDate}</div>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#1E6F56]/25 text-[#34B38A]">
                LIVE SYNC
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className={`p-2.5 rounded-xl ${getPillSurfaceClass()}`}>
                <div className={`text-[10px] ${getSubtleTextClass()}`}>Tasks Done</div>
                <div className="text-sm font-bold font-mono tabular-nums mt-0.5">
                  {doneDayTasks}/{dayTasks.length}
                </div>
              </div>
              <div className={`p-2.5 rounded-xl ${getPillSurfaceClass()}`}>
                <div className={`text-[10px] ${getSubtleTextClass()}`}>Calories</div>
                <div className="text-sm font-bold font-mono tabular-nums text-[#FF9500] mt-0.5">
                  {dayCalories} kcal
                </div>
              </div>
              <div className={`p-2.5 rounded-xl ${getPillSurfaceClass()}`}>
                <div className={`text-[10px] ${getSubtleTextClass()}`}>Protein</div>
                <div className="text-sm font-bold font-mono tabular-nums text-[#30D158] mt-0.5">
                  {dayProtein}g
                </div>
              </div>
              <div className={`p-2.5 rounded-xl ${getPillSurfaceClass()}`}>
                <div className={`text-[10px] ${getSubtleTextClass()}`}>Bills Due</div>
                <div className="text-sm font-bold font-mono tabular-nums text-[#FF9F0A] mt-0.5">
                  ${Math.round(totalPendingAmount)}
                </div>
              </div>
            </div>

            {dayTasks.length > 0 && (
              <div className="space-y-1.5">
                <div className={`text-[10px] font-semibold uppercase ${getSubtleTextClass()}`}>
                  Priority Execution Queue
                </div>
                {dayTasks.slice(0, 2).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onToggleTask?.(t.id)}
                    className={`w-full px-3 py-1.5 rounded-xl ${getPillSurfaceClass()} flex items-center justify-between gap-2 text-left cursor-pointer`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {t.completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#34B38A] shrink-0" />
                      ) : (
                        <Circle className={`w-3.5 h-3.5 ${getSubtleTextClass()} shrink-0`} />
                      )}
                      <span
                        className={`text-xs font-medium truncate ${
                          t.completed ? 'line-through opacity-55' : ''
                        }`}
                      >
                        {t.title}
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono ${getSubtleTextClass()}`}>
                      {t.startTime || 'Anytime'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  // If rendered in standalone full-screen Android widget mode (?widget=...)
  if (standaloneWidgetId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0D0E11] text-[#F2F2F7]">
        <div className="w-full max-w-md space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#34B38A]" />
              <span className="text-xs font-bold tracking-tight">
                Android Home Screen Widget View
              </span>
            </div>
            {onExitStandaloneWidget && (
              <button
                type="button"
                onClick={onExitStandaloneWidget}
                className="px-3 py-1.5 rounded-full apple-subtile text-xs font-semibold text-[#34B38A] flex items-center gap-1.5 cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Open Full App</span>
              </button>
            )}
          </div>

          {renderWidgetContent(standaloneWidgetId)}
        </div>
      </div>
    );
  }

  const widgetCatalog: {
    id: AndroidWidgetId;
    title: string;
    sizeBadge: string;
    description: string;
    spanClass: string;
  }[] = [
    {
      id: 'tasks_4x2',
      title: 'Priority Tasks Checklist',
      sizeBadge: '4×2 Android Widget',
      description: 'Interactive checklist to check off P1/P2/P3 tasks directly from your home screen.',
      spanClass: 'sm:col-span-2',
    },
    {
      id: 'macros_2x2',
      title: 'Calorie & Protein Progress',
      sizeBadge: '2×2 Android Widget',
      description: 'Compact dual-bar nutrition meter tracking daily kcal and protein target completion.',
      spanClass: 'sm:col-span-1',
    },
    {
      id: 'expenses_2x2',
      title: 'Expenses & Deadlines Due',
      sizeBadge: '2×2 Android Widget',
      description: 'At-a-glance pending bills counter with one-tap coverage toggle.',
      spanClass: 'sm:col-span-1',
    },
    {
      id: 'workout_4x2',
      title: 'Workout Volume & Bodyweight',
      sizeBadge: '4×2 Android Widget',
      description: 'Displays daily sets, total volume lifted, and latest morning weigh-in.',
      spanClass: 'sm:col-span-2',
    },
    {
      id: 'command_4x3',
      title: 'All-in-One Daily Command Center',
      sizeBadge: '4×3 Android Widget',
      description: 'Full home screen dashboard uniting tasks, calories, protein, and expenses.',
      spanClass: 'sm:col-span-2',
    },
  ];

  return (
    <div className="apple-bento p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#1E6F56] dark:text-[#34B38A]" />
            <h3 className="text-base font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">
              Android Home Screen Widgets
            </h3>
          </div>
          <p className="text-xs text-[#636366] dark:text-[#98989D]">
            Pick, customize, and pin live interactive widgets for your Android device home pages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'ios_dark', label: 'Dark Glass' },
              { id: 'ios_frosted', label: 'Frosted Light' },
              { id: 'emerald_tint', label: 'Emerald Tint' },
            ] as const
          ).map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setWidgetStyle(st.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                widgetStyle === st.id
                  ? 'apple-btn-primary text-white'
                  : 'apple-subtile text-[#636366] dark:text-[#98989D]'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Pinned Widgets Preview Deck */}
      {pinnedWidgets.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#1E6F56] dark:text-[#34B38A] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Your Active Home Screen Deck ({pinnedWidgets.length} selected)</span>
            </span>
            <button
              type="button"
              onClick={() => setShowAndroidGuide((prev) => !prev)}
              className="text-xs font-semibold text-[#1E6F56] dark:text-[#34B38A] hover:underline cursor-pointer"
            >
              {showAndroidGuide ? 'Hide Pinning Steps' : 'How to Place on Android Home Screen'}
            </button>
          </div>

          {showAndroidGuide && (
            <div className="apple-subtile p-4 text-xs space-y-2 text-[#3A3A3C] dark:text-[#D1D1D6]">
              <div className="font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">
                Placing Widgets on Your Android Home Screen:
              </div>
              <ol className="list-decimal list-inside space-y-1 leading-relaxed">
                <li>
                  Tap <strong>&ldquo;Launch Widget View&rdquo;</strong> on any widget below, then tap your Android browser menu (⋮) and choose <strong>&ldquo;Add to Home screen&rdquo;</strong> or <strong>&ldquo;Install app&rdquo;</strong>.
                </li>
                <li>
                  Once installed on Android, <strong>long-press the app icon</strong> on your home screen to reveal the 4 quick-launch widget shortcuts (Tasks 4×2, Macros 2×2, Workout 4×2, Command 4×3) and drag any of them onto your home page.
                </li>
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Widget Variations Picker Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {widgetCatalog.map((item) => {
          const isPinned = pinnedWidgets.includes(item.id);
          return (
            <div
              key={item.id}
              className={`${item.spanClass} apple-subtile p-4 rounded-2xl space-y-3 border ${
                isPinned
                  ? 'border-[#1E6F56]/45 dark:border-[#34B38A]/45'
                  : 'border-transparent'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">
                      {item.title}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#1E6F56]/15 text-[#1E6F56] dark:text-[#34B38A]">
                      {item.sizeBadge}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#636366] dark:text-[#98989D] mt-0.5">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => togglePinWidget(item.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                      isPinned
                        ? 'apple-btn-primary text-white'
                        : 'bg-black/[0.06] dark:bg-white/[0.08] text-[#1C1C1E] dark:text-[#F2F2F7]'
                    }`}
                  >
                    {isPinned ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Selected</span>
                      </>
                    ) : (
                      <>
                        <Pin className="w-3.5 h-3.5" />
                        <span>Select</span>
                      </>
                    )}
                  </button>

                  {onOpenStandaloneWidget && (
                    <button
                      type="button"
                      onClick={() => onOpenStandaloneWidget(item.id)}
                      title="Launch standalone widget mode to pin to Android Home Screen"
                      className="px-2.5 py-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] text-xs font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] hover:bg-black/[0.1] dark:hover:bg-white/[0.14] flex items-center gap-1 cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-[#1E6F56] dark:text-[#34B38A]" />
                      <span className="hidden sm:inline">Launch Widget View</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopyWidgetShortcut(item.id)}
                    title="Copy direct widget link"
                    className="p-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] text-[#636366] dark:text-[#98989D] hover:text-[#1C1C1E] dark:hover:text-white cursor-pointer"
                  >
                    {copiedWidgetId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-[#30D158]" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Live Interactive Widget Surface Preview */}
              {renderWidgetContent(item.id)}
            </div>
          );
        })}
      </div>
    </div>
  );
};
