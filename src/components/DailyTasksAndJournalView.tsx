import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Bell,
  Plus,
  Trash2,
  Search,
  X,
  Video,
  User as UserIcon,
  BarChart3,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import {
  TaskItem,
  TaskPriority,
  JournalEntry,
  VoiceTableBlock,
  VoiceChartBlock,
  AppSettings,
} from '../types';
import { VoiceRecorderPanel } from './VoiceRecorderPanel';
import { IOSSwipeToDeleteRow } from './IOSSwipeToDeleteRow';
import {
  sendPersistentTaskNotification,
  playReminderChime,
  triggerHapticFeedback,
} from '../services/notificationEngine';

interface DailyTasksAndJournalViewProps {
  viewFilter: 'tasks_only' | 'journal_only';
  selectedDate: string;
  onChangeDate: (date: string) => void;
  tasks: TaskItem[];
  onAddTask: (task: Omit<TaskItem, 'id' | 'createdAt'>) => void;
  onAddMultipleTasks: (tasks: Omit<TaskItem, 'id' | 'createdAt'>[]) => void;
  onToggleTask: (taskId: string) => void;
  onUpdateTaskPriority: (taskId: string, priority: TaskPriority) => void;
  onUpdateTaskTimeFoundation: (
    taskId: string,
    startTime: string,
    durationMinutes: number,
    reminderMinutesBefore: number
  ) => void;
  onReassignTasksDate: (fromDate: string, toDate: string) => void;
  onDeleteTask: (taskId: string) => void;
  journals: JournalEntry[];
  onSaveJournal: (entry: Omit<JournalEntry, 'id' | 'updatedAt'>) => void;
  settings: AppSettings;
  onOpenAskAI?: () => void;
}

export const DailyTasksAndJournalView: React.FC<DailyTasksAndJournalViewProps> = ({
  viewFilter,
  selectedDate,
  onChangeDate,
  tasks,
  onAddTask,
  onAddMultipleTasks,
  onToggleTask,
  onUpdateTaskPriority,
  onUpdateTaskTimeFoundation,
  onReassignTasksDate,
  onDeleteTask,
  journals,
  onSaveJournal,
  settings,
  onOpenAskAI,
}) => {
  // Real-time search query at the top of Tasks section
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [showMoveDateTools, setShowMoveDateTools] = useState(false);

  // Task creation form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('high');
  const [newTaskStartTime, setNewTaskStartTime] = useState('09:00');
  const [newTaskDuration, setNewTaskDuration] = useState<number>(45);
  const [newTaskReminder, setNewTaskReminder] = useState<number>(
    settings.defaultReminderMinutes ?? 5
  );
  const [batchTargetDate, setBatchTargetDate] = useState<string>(selectedDate);
  const [batchDateConfirmToast, setBatchDateConfirmToast] = useState(false);

  // Journal editor state for selected date
  const currentJournal = journals.find((j) => j.date === selectedDate);
  const [journalTitle, setJournalTitle] = useState(currentJournal?.title || '');
  const [journalContent, setJournalContent] = useState(currentJournal?.content || '');
  const [journalRawTranscript, setJournalRawTranscript] = useState(
    currentJournal?.rawTranscript || ''
  );
  const [journalTakeaways, setJournalTakeaways] = useState<string[]>(
    currentJournal?.keyTakeaways || []
  );
  const [journalIntentEdits, setJournalIntentEdits] = useState<string[]>(
    currentJournal?.intentEdits || []
  );
  const [journalTables, setJournalTables] = useState<VoiceTableBlock[]>(
    currentJournal?.tables || []
  );
  const [journalCharts, setJournalCharts] = useState<VoiceChartBlock[]>(
    currentJournal?.charts || []
  );
  const [sessionType, setSessionType] = useState<
    'morning_setup' | 'evening_reflection' | 'midday_note'
  >(currentJournal?.sessionType || 'evening_reflection');
  const [journalSavedToast, setJournalSavedToast] = useState(false);

  React.useEffect(() => {
    setBatchTargetDate(selectedDate);
    const found = journals.find((j) => j.date === selectedDate);
    if (found) {
      setJournalTitle(found.title);
      setJournalContent(found.content);
      setJournalRawTranscript(found.rawTranscript);
      setJournalTakeaways(found.keyTakeaways || []);
      setJournalIntentEdits(found.intentEdits || []);
      setJournalTables(found.tables || []);
      setJournalCharts(found.charts || []);
      setSessionType(found.sessionType);
    } else {
      setJournalTitle('');
      setJournalContent('');
      setJournalRawTranscript('');
      setJournalTakeaways([]);
      setJournalIntentEdits([]);
      setJournalTables([]);
      setJournalCharts([]);
    }
  }, [selectedDate, journals]);

  // Filter tasks by selected date AND real-time keyword search
  const normalizedQuery = taskSearchQuery.trim().toLowerCase();
  const tasksForDate = tasks
    .filter((t) => t.date === selectedDate)
    .filter((t) => {
      if (!normalizedQuery) return true;
      return (
        t.title.toLowerCase().includes(normalizedQuery) ||
        (t.notes && t.notes.toLowerCase().includes(normalizedQuery)) ||
        (t.contactName && t.contactName.toLowerCase().includes(normalizedQuery)) ||
        t.priority.toLowerCase().includes(normalizedQuery)
      );
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const weight = { high: 3, medium: 2, low: 1 };
      if (weight[a.priority] !== weight[b.priority]) {
        return weight[b.priority] - weight[a.priority];
      }
      return (a.startTime || '99:99').localeCompare(b.startTime || '99:99');
    });

  const handleManualTaskAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onAddTask({
      date: selectedDate,
      title: newTaskTitle.trim(),
      notes: newTaskNotes.trim(),
      priority: newTaskPriority,
      completed: false,
      startTime: newTaskStartTime,
      durationMinutes: newTaskDuration,
      reminderMinutesBefore: newTaskReminder,
      source: 'local',
    });
    setNewTaskTitle('');
    setNewTaskNotes('');
    setShowAddTaskForm(false);
  };

  const handleAssignListedTasksToDate = () => {
    if (!batchTargetDate) return;
    if (batchTargetDate !== selectedDate) {
      onReassignTasksDate(selectedDate, batchTargetDate);
      onChangeDate(batchTargetDate);
    }
    setBatchDateConfirmToast(true);
    setTimeout(() => {
      setBatchDateConfirmToast(false);
      setShowMoveDateTools(false);
    }, 1500);
  };

  const persistJournalState = (
    overrides?: Partial<{
      title: string;
      content: string;
      rawTranscript: string;
      keyTakeaways: string[];
      intentEdits: string[];
      tables: VoiceTableBlock[];
      charts: VoiceChartBlock[];
    }>
  ) => {
    onSaveJournal({
      date: selectedDate,
      title: (overrides?.title ?? journalTitle).trim() || `Entry · ${selectedDate}`,
      content: overrides?.content ?? journalContent,
      rawTranscript: overrides?.rawTranscript ?? journalRawTranscript,
      keyTakeaways: overrides?.keyTakeaways ?? journalTakeaways,
      intentEdits: overrides?.intentEdits ?? journalIntentEdits,
      tables: overrides?.tables ?? journalTables,
      charts: overrides?.charts ?? journalCharts,
      sessionType,
    });
    setJournalSavedToast(true);
    setTimeout(() => setJournalSavedToast(false), 1800);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-8">
      {/* VIEW 1: TASKS SECTION */}
      {viewFilter === 'tasks_only' && (
        <div className="space-y-4">
          {/* 1. Unified Planner Search & Command Bar: Full-width search bar on top, Vertical Ask AI button below on the right */}
          <div className="apple-bento p-3.5 sm:p-4 space-y-2.5">
            {/* Full-Width Horizontal Search Bar */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-[#48484A] dark:text-[#AEAEB2] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={taskSearchQuery}
                onChange={(e) => setTaskSearchQuery(e.target.value)}
                placeholder="Search tasks by keyword, note, or priority..."
                aria-label="Search tasks by keyword"
                className="w-full h-10 pl-10 pr-9 rounded-xl apple-subtile text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#515154] dark:placeholder:text-[#A1A1A6] focus:outline-none focus:border-[#1E6F56] transition-colors"
              />
              {taskSearchQuery && (
                <button
                  type="button"
                  onClick={() => setTaskSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-[#48484A] dark:text-[#AEAEB2] hover:text-[#1D1D1F] dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Area Below Search Bar: Left-side Voice & Task Actions + Right-side Vertical Ask AI Button */}
            <div className="flex items-stretch justify-between gap-2.5 sm:gap-3">
              <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                <VoiceRecorderPanel
                  mode="tasks"
                  defaultDate={selectedDate}
                  placeholderLabel="Voice Add Tasks"
                  onTasksParsed={(parsedTasks, targetDate) => {
                    const effectiveDate = targetDate || selectedDate;
                    if (effectiveDate !== selectedDate) {
                      onChangeDate(effectiveDate);
                    }
                    onAddMultipleTasks(
                      parsedTasks.map((pt) => ({
                        date: effectiveDate,
                        title: pt.title,
                        notes: pt.notes || '',
                        priority:
                          pt.priority === 'high' || pt.priority === 'low'
                            ? pt.priority
                            : 'medium',
                        completed: false,
                        startTime: pt.startTime || '',
                        durationMinutes: pt.durationMinutes || 30,
                        reminderMinutesBefore:
                          pt.reminderMinutesBefore ?? settings.defaultReminderMinutes,
                        source: 'voice',
                      }))
                    );
                  }}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddTaskForm((prev) => !prev)}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-full apple-subtile text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.08] dark:hover:bg-white/[0.14] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-[#1E6F56] dark:text-[#34B38A]" />
                    <span>New Task</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowMoveDateTools((prev) => !prev)}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-full apple-subtile text-xs font-semibold text-[#2C2C2E] dark:text-[#E5E5EA] hover:bg-black/[0.08] dark:hover:bg-white/[0.14] flex items-center gap-1 cursor-pointer"
                  >
                    <span>Set Date</span>
                    {showMoveDateTools ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Right Side Below Search Bar: Vertical Ask AI Button Utilizing Vertical Space */}
              {onOpenAskAI && (
                <button
                  type="button"
                  onClick={onOpenAskAI}
                  aria-label="Open Ask AI Assistant"
                  title="Ask AI about your tasks, journals, workouts, diet & expenses"
                  className="w-14 sm:w-16 shrink-0 self-stretch rounded-2xl apple-btn-primary text-white flex flex-col items-center justify-center gap-1.5 py-2 px-1.5 shadow-xs cursor-pointer transition-transform active:scale-95"
                >
                  <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider leading-tight text-center">
                    Ask AI
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Optional Date Assignment Sheet (after listing tasks) */}
          {showMoveDateTools && (
            <div className="p-4 apple-bento flex flex-wrap items-center justify-between gap-3 overflow-hidden">
              <span className="text-xs font-medium text-[#3A3A3C] dark:text-[#D1D1D6]">
                Assign listed tasks to date:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative inline-flex items-center gap-1.5 h-8 px-3 rounded-lg apple-subtile text-xs font-semibold font-mono tabular-nums text-[#1C1C1E] dark:text-[#F2F2F7] cursor-pointer overflow-hidden">
                  <span>{batchTargetDate}</span>
                  <input
                    type="date"
                    value={batchTargetDate}
                    onChange={(e) => {
                      if (e.target.value) setBatchTargetDate(e.target.value);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleAssignListedTasksToDate}
                  className="h-8 px-3.5 rounded-lg apple-btn-primary text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {batchDateConfirmToast ? '✓ Applied' : 'Apply Date'}
                </button>
              </div>
            </div>
          )}

          {/* Collapsible Manual Add Task Sheet */}
          {showAddTaskForm && (
            <form
              onSubmit={handleManualTaskAdd}
              className="p-5 apple-bento space-y-3.5"
            >
              <input
                type="text"
                required
                placeholder="Task title..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="w-full apple-subtile px-4 py-2.5 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#515154] dark:placeholder:text-[#A1A1A6] focus:outline-none focus:border-[#1E6F56]"
              />

              <input
                type="text"
                placeholder="Notes or sub-bullets (optional)..."
                value={newTaskNotes}
                onChange={(e) => setNewTaskNotes(e.target.value)}
                className="w-full apple-subtile px-4 py-2 text-xs text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#515154] dark:placeholder:text-[#A1A1A6]"
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-[#48484A] dark:text-[#AEAEB2] mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                    className="w-full apple-subtile px-3 py-2 text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]"
                  >
                    <option value="high">High (P1)</option>
                    <option value="medium">Medium (P2)</option>
                    <option value="low">Low (P3)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#48484A] dark:text-[#AEAEB2] mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newTaskStartTime}
                    onChange={(e) => setNewTaskStartTime(e.target.value)}
                    className="w-full apple-subtile px-3 py-2 text-xs font-semibold font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#48484A] dark:text-[#AEAEB2] mb-1">
                    Duration
                  </label>
                  <select
                    value={newTaskDuration}
                    onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                    className="w-full apple-subtile px-3 py-2 text-xs font-semibold font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]"
                  >
                    <option value={15}>15m</option>
                    <option value={30}>30m</option>
                    <option value={45}>45m</option>
                    <option value={60}>60m</option>
                    <option value={90}>90m</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#48484A] dark:text-[#AEAEB2] mb-1">
                    Reminder
                  </label>
                  <select
                    value={newTaskReminder}
                    onChange={(e) => setNewTaskReminder(Number(e.target.value))}
                    className="w-full apple-subtile px-3 py-2 text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]"
                  >
                    <option value={0}>At start</option>
                    <option value={5}>5m prior</option>
                    <option value={15}>15m prior</option>
                    <option value={30}>30m prior</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddTaskForm(false)}
                  className="px-4 py-2 rounded-full apple-subtile text-xs font-semibold text-[#2C2C2E] dark:text-[#E5E5EA] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full apple-btn-primary text-xs font-semibold cursor-pointer"
                >
                  Save Task
                </button>
              </div>
            </form>
          )}

          {/* 3. Apple Bento Task List */}
          {tasksForDate.length === 0 ? (
            <div className="apple-bento py-12 px-4 text-center space-y-2">
              <div className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                {normalizedQuery
                  ? `No tasks matching "${taskSearchQuery}"`
                  : `No tasks for ${selectedDate}`}
              </div>
              <p className="text-xs text-[#48484A] dark:text-[#AEAEB2]">
                Tap &ldquo;Voice Add Tasks&rdquo; or &ldquo;New Task&rdquo; above to add items.
              </p>
            </div>
          ) : (
            <div className="apple-bento divide-y divide-black/[0.08] dark:divide-white/[0.08] overflow-hidden">
              {tasksForDate.map((task) => (
                <IOSSwipeToDeleteRow
                  key={task.id}
                  onDelete={() => onDeleteTask(task.id)}
                  itemLabel={task.title}
                >
                  <div className="p-5 flex items-start gap-3.5 hover:bg-black/[0.025] dark:hover:bg-white/[0.03] transition-colors">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback(settings);
                      onToggleTask(task.id);
                    }}
                    aria-label={task.completed ? 'Mark task uncompleted' : 'Mark task completed'}
                    className="min-h-[32px] min-w-[32px] -ml-1 flex items-center justify-center text-[#1E6F56] shrink-0 cursor-pointer"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-[#1E6F56] dark:text-[#34B38A]" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#48484A] dark:text-[#AEAEB2]" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-[15px] font-semibold leading-snug ${
                          task.completed
                            ? 'line-through text-[#515154] dark:text-[#A1A1A6]'
                            : 'text-[#1D1D1F] dark:text-[#F5F5F7]'
                        }`}
                      >
                        {task.title}
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        <select
                          value={task.priority}
                          onChange={(e) =>
                            onUpdateTaskPriority(task.id, e.target.value as TaskPriority)
                          }
                          aria-label="Priority"
                          className={`text-xs font-bold bg-transparent rounded px-1.5 py-0.5 cursor-pointer ${
                            task.priority === 'high'
                              ? 'text-[#D70015] dark:text-[#FF453A]'
                              : task.priority === 'medium'
                                ? 'text-[#C85A32] dark:text-[#FF9F0A]'
                                : 'text-[#48484A] dark:text-[#AEAEB2]'
                          }`}
                        >
                          <option value="high">P1</option>
                          <option value="medium">P2</option>
                          <option value="low">P3</option>
                        </select>

                        <button
                          type="button"
                          title="Send to Notification Bar"
                          onClick={async () => {
                            playReminderChime(settings);
                            await sendPersistentTaskNotification(task, onToggleTask, settings);
                          }}
                          className="p-1.5 text-[#48484A] dark:text-[#AEAEB2] hover:text-[#1E6F56] dark:hover:text-[#34B38A] cursor-pointer"
                        >
                          <Bell className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.id)}
                          aria-label="Delete task"
                          className="p-1.5 text-[#48484A] dark:text-[#AEAEB2] hover:text-[#D70015] dark:hover:text-[#FF453A] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {task.notes && (
                      <p className="text-xs text-[#3A3A3C] dark:text-[#D1D1D6] whitespace-pre-line leading-relaxed">
                        {task.notes}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#636366] dark:text-[#98989D] pt-0.5">
                      <label className="relative inline-flex items-center gap-1 font-mono tabular-nums text-[#1C1C1E] dark:text-[#F2F2F7] font-semibold cursor-pointer">
                        <Clock className="w-3 h-3 text-[#1E6F56] dark:text-[#34B38A] shrink-0" />
                        <span>{task.startTime || 'Set time'}</span>
                        <input
                          type="time"
                          value={task.startTime || ''}
                          onChange={(e) =>
                            onUpdateTaskTimeFoundation(
                              task.id,
                              e.target.value,
                              task.durationMinutes || 30,
                              task.reminderMinutesBefore ?? 5
                            )
                          }
                          aria-label="Task start time"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </label>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{task.durationMinutes || 30}m</span>

                      {task.contactName && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 text-[#2C2C2E] dark:text-[#E5E5EA]">
                            <UserIcon className="w-3 h-3 text-[#1E6F56] dark:text-[#34B38A]" />
                            {task.contactName}
                          </span>
                        </>
                      )}

                      {task.meetUri && (
                        <>
                          <span aria-hidden="true">·</span>
                          <a
                            href={task.meetUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#1E6F56] dark:text-[#34B38A] hover:underline font-semibold"
                          >
                            <Video className="w-3 h-3" />
                            <span>Meet</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                </IOSSwipeToDeleteRow>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: JOURNAL + VOICE TABLES & CHARTS */}
      {viewFilter === 'journal_only' && (
        <div className="space-y-4">
          {/* Top Voice Controls: Dictate Journal OR Voice Create Table/Chart */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <VoiceRecorderPanel
              mode="journal"
              defaultDate={selectedDate}
              existingJournalText={journalContent}
              placeholderLabel="Dictate Journal"
              onJournalParsed={({
                transcript,
                suggestedTitle,
                structuredContent,
                keyTakeaways,
                intentEdits,
                generatedTable,
                generatedChart,
              }) => {
                const nextTitle = journalTitle.trim() || suggestedTitle;
                const nextContent = journalContent.trim()
                  ? `${journalContent.trim()}\n\n${structuredContent}`
                  : structuredContent;
                const nextTables = generatedTable
                  ? [...journalTables, generatedTable]
                  : journalTables;
                const nextCharts = generatedChart
                  ? [...journalCharts, generatedChart]
                  : journalCharts;

                setJournalTitle(nextTitle);
                setJournalContent(nextContent);
                setJournalRawTranscript(transcript);
                setJournalTakeaways(keyTakeaways);
                setJournalIntentEdits(intentEdits);
                setJournalTables(nextTables);
                setJournalCharts(nextCharts);

                persistJournalState({
                  title: nextTitle,
                  content: nextContent,
                  rawTranscript: transcript,
                  keyTakeaways,
                  intentEdits,
                  tables: nextTables,
                  charts: nextCharts,
                });
              }}
            />

            <VoiceRecorderPanel
              mode="table_chart"
              defaultDate={selectedDate}
              placeholderLabel="Voice Table / Chart"
              onTableChartParsed={({ table, chart }) => {
                const nextTables = table ? [...journalTables, table] : journalTables;
                const nextCharts = chart ? [...journalCharts, chart] : journalCharts;
                setJournalTables(nextTables);
                setJournalCharts(nextCharts);
                persistJournalState({
                  tables: nextTables,
                  charts: nextCharts,
                });
              }}
            />
          </div>

          {/* Main Apple Bento Note Card */}
          <div className="apple-bento p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-black/[0.08] dark:border-white/[0.08]">
              <input
                type="text"
                value={journalTitle}
                onChange={(e) => setJournalTitle(e.target.value)}
                placeholder="Entry Title..."
                className="flex-1 text-lg font-bold bg-transparent text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#515154] dark:placeholder:text-[#A1A1A6] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => persistJournalState()}
                className="min-h-[36px] px-4 py-1.5 rounded-full apple-btn-primary text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              >
                {journalSavedToast ? '✓ Saved' : 'Save'}
              </button>
            </div>

            <textarea
              rows={9}
              value={journalContent}
              onChange={(e) => setJournalContent(e.target.value)}
              placeholder="Speak or type your daily reflection..."
              className="w-full bg-transparent text-[15px] leading-relaxed text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#515154] dark:placeholder:text-[#A1A1A6] focus:outline-none resize-y"
            />
          </div>

          {/* Voice-Generated Charts */}
          {journalCharts.length > 0 && (
            <div className="space-y-3">
              {journalCharts.map((chart) => {
                const maxVal = Math.max(...chart.dataPoints.map((d) => d.value), 1);
                return (
                  <div
                    key={chart.id}
                    className="apple-bento p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-[#1E6F56] dark:text-[#34B38A]" />
                        <h3 className="text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {chart.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = journalCharts.map((c) =>
                              c.id === chart.id
                                ? {
                                    ...c,
                                    chartType:
                                      c.chartType === 'bar'
                                        ? ('line' as const)
                                        : ('bar' as const),
                                  }
                                : c
                            );
                            setJournalCharts(updated);
                            persistJournalState({ charts: updated });
                          }}
                          className="px-3 py-1 rounded-full apple-subtile text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] cursor-pointer"
                        >
                          {chart.chartType === 'bar' ? 'Switch to Line' : 'Switch to Bar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = journalCharts.filter((c) => c.id !== chart.id);
                            setJournalCharts(updated);
                            persistJournalState({ charts: updated });
                          }}
                          aria-label="Delete chart"
                          className="p-1 text-[#48484A] dark:text-[#AEAEB2] hover:text-[#D70015] dark:hover:text-[#FF453A] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {chart.chartType === 'bar' ? (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 items-end min-h-[150px]">
                        {chart.dataPoints.map((dp, i) => {
                          const pct = Math.max(Math.round((dp.value / maxVal) * 100), 8);
                          return (
                            <div key={i} className="flex flex-col items-center gap-1.5">
                              <span className="text-xs font-mono tabular-nums font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                                {dp.value}
                                {chart.unit ? ` ${chart.unit}` : ''}
                              </span>
                              <div className="w-full h-28 apple-subtile flex items-end p-1.5">
                                <div
                                  style={{ height: `${pct}%` }}
                                  className="w-full rounded-xl apple-btn-primary transition-all"
                                />
                              </div>
                              <span className="text-xs font-medium text-[#3A3A3C] dark:text-[#D1D1D6] truncate max-w-full">
                                {dp.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2 pt-2">
                        <svg viewBox="0 0 500 140" className="w-full h-36 overflow-visible">
                          <polyline
                            fill="none"
                            stroke="#1E6F56"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={chart.dataPoints
                              .map((dp, idx) => {
                                const x =
                                  chart.dataPoints.length > 1
                                    ? (idx / (chart.dataPoints.length - 1)) * 440 + 30
                                    : 250;
                                const y = 115 - (dp.value / maxVal) * 90;
                                return `${x},${y}`;
                              })
                              .join(' ')}
                          />
                          {chart.dataPoints.map((dp, idx) => {
                            const x =
                              chart.dataPoints.length > 1
                                ? (idx / (chart.dataPoints.length - 1)) * 440 + 30
                                : 250;
                            const y = 115 - (dp.value / maxVal) * 90;
                            return (
                              <g key={idx}>
                                <circle cx={x} cy={y} r="5" fill="#1E6F56" />
                                <text
                                  x={x}
                                  y={y - 10}
                                  textAnchor="middle"
                                  fill="currentColor"
                                  className="text-[11px] font-mono font-bold fill-[#1D1D1F] dark:fill-[#F5F5F7]"
                                >
                                  {dp.value}
                                </text>
                                <text
                                  x={x}
                                  y={135}
                                  textAnchor="middle"
                                  className="text-[11px] font-medium fill-[#3A3A3C] dark:fill-[#D1D1D6]"
                                >
                                  {dp.label}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Voice-Generated Tables */}
          {journalTables.length > 0 && (
            <div className="space-y-3">
              {journalTables.map((tbl) => (
                <div
                  key={tbl.id}
                  className="apple-bento overflow-hidden"
                >
                  <div className="px-5 py-3.5 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TableIcon className="w-4 h-4 text-[#1E6F56] dark:text-[#34B38A]" />
                      <h3 className="text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {tbl.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = journalTables.filter((t) => t.id !== tbl.id);
                        setJournalTables(updated);
                        persistJournalState({ tables: updated });
                      }}
                      aria-label="Delete table"
                      className="p-1 text-[#48484A] dark:text-[#AEAEB2] hover:text-[#D70015] dark:hover:text-[#FF453A] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-black/[0.08] dark:border-white/[0.08] bg-black/[0.04] dark:bg-white/[0.05] text-[#3A3A3C] dark:text-[#D1D1D6]">
                          {tbl.headers.map((h, i) => (
                            <th key={i} className="py-2.5 px-4 font-bold">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                        {tbl.rows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className="py-2.5 px-4 font-mono tabular-nums font-medium text-[#1D1D1F] dark:text-[#F5F5F7]"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
