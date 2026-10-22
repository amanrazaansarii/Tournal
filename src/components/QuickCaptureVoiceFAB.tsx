import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Keyboard, Check, X } from 'lucide-react';
import {
  TaskItem,
  JournalEntry,
  WorkoutExercise,
  DailyBodyMetric,
  DietEntry,
  ExpenseEntry,
  VoiceTableBlock,
  VoiceChartBlock,
  AppSettings,
} from '../types';

export type QuickCaptureCategory =
  | 'tasks'
  | 'journal'
  | 'workouts'
  | 'diet'
  | 'expenses';

interface QuickCaptureVoiceFABProps {
  activeCategory: QuickCaptureCategory;
  selectedDate: string;
  onChangeDate: (date: string) => void;
  settings: AppSettings;
  journals: JournalEntry[];
  onAddMultipleTasks: (tasks: Omit<TaskItem, 'id' | 'createdAt'>[]) => void;
  onSaveJournal: (entry: Omit<JournalEntry, 'id' | 'updatedAt'>) => void;
  onAddWorkout: (exercise: Omit<WorkoutExercise, 'id' | 'createdAt'>) => void;
  onSaveBodyMetric: (metric: DailyBodyMetric) => void;
  onAddDietEntries: (entries: Omit<DietEntry, 'id' | 'createdAt'>[]) => void;
  onAddExpenses: (items: Omit<ExpenseEntry, 'id' | 'createdAt'>[]) => void;
}

const CATEGORY_LABELS: Record<QuickCaptureCategory, string> = {
  tasks: 'Quick Voice Task',
  journal: 'Quick Voice Journal',
  workouts: 'Quick Voice Workout',
  diet: 'Quick Voice Meal',
  expenses: 'Quick Voice Expense',
};

const CATEGORY_PLACEHOLDERS: Record<QuickCaptureCategory, string> = {
  tasks: 'Describe your task(s), start time, duration, and priority...',
  journal: 'Speak or type your journal reflection or table/chart request...',
  workouts: 'Describe your workout exercises, weight, sets, reps, or body weight...',
  diet: 'What did you eat and in what quantity? (AI calculates calories & macros)...',
  expenses: 'Describe the expense name, amount, category, and deadline...',
};

export const QuickCaptureVoiceFAB: React.FC<QuickCaptureVoiceFABProps> = ({
  activeCategory,
  selectedDate,
  onChangeDate,
  settings,
  journals,
  onAddMultipleTasks,
  onSaveJournal,
  onAddWorkout,
  onSaveBodyMetric,
  onAddDietEntries,
  onAddExpenses,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showInputPopover, setShowInputPopover] = useState(false);
  const [manualCommand, setManualCommand] = useState('');
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const triggerToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 2600);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const processCapturePayload = async (payload: {
    base64Audio?: string;
    mimeType?: string;
    rawText?: string;
  }) => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      if (activeCategory === 'tasks') {
        const res = await fetch('/api/voice/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, defaultDate: selectedDate }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Voice task capture failed');
        const effectiveDate = data.targetDate || selectedDate;
        if (effectiveDate !== selectedDate) onChangeDate(effectiveDate);
        const parsed = data.tasks || [];
        onAddMultipleTasks(
          parsed.map((pt: any) => ({
            date: effectiveDate,
            title: pt.title,
            notes: pt.notes || '',
            priority:
              pt.priority === 'high' || pt.priority === 'low' ? pt.priority : 'medium',
            completed: false,
            startTime: pt.startTime || '',
            durationMinutes: pt.durationMinutes || 30,
            reminderMinutesBefore:
              pt.reminderMinutesBefore ?? settings.defaultReminderMinutes,
            source: 'voice',
          }))
        );
        triggerToast(`Added ${parsed.length || 1} task(s)`);
      } else if (activeCategory === 'journal') {
        const existingJournal = journals.find((j) => j.date === selectedDate);
        const res = await fetch('/api/voice/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            defaultDate: selectedDate,
            existingContent: existingJournal?.content || '',
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Voice journal capture failed');

        const genTable: VoiceTableBlock | undefined =
          data.generatedTable?.hasTable && data.generatedTable?.headers?.length
            ? {
                id: `tbl-${Date.now()}`,
                title: data.generatedTable.title || 'Table',
                headers: data.generatedTable.headers,
                rows: data.generatedTable.rows || [],
              }
            : undefined;

        const genChart: VoiceChartBlock | undefined =
          data.generatedChart?.hasChart && data.generatedChart?.dataPoints?.length
            ? {
                id: `chart-${Date.now()}`,
                chartType: data.generatedChart.chartType === 'line' ? 'line' : 'bar',
                title: data.generatedChart.title || 'Chart',
                unit: data.generatedChart.unit || '',
                dataPoints: data.generatedChart.dataPoints,
              }
            : undefined;

        const nextContent = existingJournal?.content?.trim()
          ? `${existingJournal.content.trim()}\n\n${data.structuredContent || ''}`
          : data.structuredContent || '';

        onSaveJournal({
          date: selectedDate,
          title:
            existingJournal?.title?.trim() ||
            data.suggestedTitle ||
            `Entry · ${selectedDate}`,
          content: nextContent,
          rawTranscript: data.transcript || '',
          keyTakeaways: data.keyTakeaways || existingJournal?.keyTakeaways || [],
          intentEdits: data.intentEdits || existingJournal?.intentEdits || [],
          tables: genTable
            ? [...(existingJournal?.tables || []), genTable]
            : existingJournal?.tables || [],
          charts: genChart
            ? [...(existingJournal?.charts || []), genChart]
            : existingJournal?.charts || [],
          sessionType: existingJournal?.sessionType || 'evening_reflection',
        });
        triggerToast('Journal updated via voice');
      } else if (activeCategory === 'workouts') {
        const res = await fetch('/api/voice/workout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, defaultDate: selectedDate }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Voice workout capture failed');

        if (data.bodyWeight && Number(data.bodyWeight) > 0) {
          onSaveBodyMetric({
            date: selectedDate,
            bodyWeight: Number(data.bodyWeight),
            bodyWeightUnit: data.bodyWeightUnit === 'kg' ? 'kg' : 'lbs',
            measuredAt: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: !settings.use24HourTime,
            }),
          });
        }

        const exercises = data.exercises || [];
        exercises.forEach((ex: any) => {
          onAddWorkout({
            date: selectedDate,
            exerciseName: ex.exerciseName || 'Exercise',
            weight: Number(ex.weight) || 0,
            weightUnit: ex.weightUnit === 'kg' ? 'kg' : 'lbs',
            sets: Number(ex.sets) || 1,
            reps: Number(ex.reps) || 1,
            effortState: ex.effortState === 'to_failure' ? 'to_failure' : 'in_control',
            notes: ex.notes || '',
          });
        });
        triggerToast(`Logged ${exercises.length || 1} workout set(s)`);
      } else if (activeCategory === 'diet') {
        const res = await fetch('/api/diet/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            payload.rawText
              ? { foodName: payload.rawText, quantity: '1 serving' }
              : payload
          ),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Voice meal capture failed');
        const items = data.items || [];
        onAddDietEntries(
          items.map((it: any) => ({
            date: selectedDate,
            foodName: it.foodName || 'Meal',
            quantity: it.quantity || '1 serving',
            calories: Number(it.calories) || 0,
            proteinGrams: Number(it.proteinGrams) || 0,
            fiberGrams: Number(it.fiberGrams) || 0,
            carbsGrams: Number(it.carbsGrams) || 0,
            fatGrams: Number(it.fatGrams) || 0,
            sugarGrams: Number(it.sugarGrams) || 0,
            sodiumMg: Number(it.sodiumMg) || 0,
            micronutrientSummary: it.micronutrientSummary || '',
          }))
        );
        triggerToast(`Logged ${items.length || 1} meal item(s)`);
      } else if (activeCategory === 'expenses') {
        const basePayload: any = { ...payload, defaultDate: selectedDate };
        const res = await fetch('/api/voice/expense', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(basePayload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Voice expense capture failed');
        const expList = data.expenses || [];
        onAddExpenses(
          expList.map((ex: any) => ({
            date: selectedDate,
            deadlineDate: ex.deadlineDate || selectedDate,
            name: ex.name || 'Expense',
            amount: Number(ex.amount) || 0,
            currency: ex.currency || 'USD',
            category: ex.category || 'Other',
            description: ex.description || '',
            isCovered: false,
          }))
        );
        triggerToast(`Added ${expList.length || 1} expense(s)`);
      }

      setShowInputPopover(false);
      setManualCommand('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to process voice command');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleOneTapMic = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size < 200) return;
        const base64Audio = await blobToBase64(blob);
        await processCapturePayload({
          base64Audio,
          mimeType: recorder.mimeType || 'audio/webm',
        });
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      // If microphone is unavailable in preview environment, open the quick voice command popover
      setShowInputPopover(true);
    }
  };

  const formatTimer = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-40 flex flex-col items-center sm:items-end gap-2">
      {/* Popover for typing/testing Quick-Capture Voice Command */}
      {showInputPopover && (
        <div className="w-[320px] sm:w-[360px] apple-bento p-4 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">
              {CATEGORY_LABELS[activeCategory]}
            </span>
            <button
              type="button"
              onClick={() => setShowInputPopover(false)}
              className="p-1 text-[#636366] dark:text-[#98989D] hover:text-[#1C1C1E] dark:hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <textarea
            rows={2}
            value={manualCommand}
            onChange={(e) => setManualCommand(e.target.value)}
            placeholder={CATEGORY_PLACEHOLDERS[activeCategory]}
            className="w-full apple-subtile px-3 py-2 text-xs text-[#1C1C1E] dark:text-[#F2F2F7] focus:outline-none focus:border-[#1E6F56]"
          />

          {errorMsg && (
            <div className="text-[11px] text-[#FF3B30] font-medium">{errorMsg}</div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={isProcessing || !manualCommand.trim()}
              onClick={() => processCapturePayload({ rawText: manualCommand })}
              className="h-8 px-4 rounded-full apple-btn-primary text-xs font-semibold disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? 'Processing...' : 'Capture Now'}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Toast */}
      {statusToast && (
        <div className="px-3.5 py-1.5 rounded-full apple-btn-primary text-white text-xs font-semibold shadow-md flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" />
          <span>{statusToast}</span>
        </div>
      )}

      {/* Floating Quick-Capture Microphone Pill */}
      <div className="flex items-center gap-1.5 p-1 rounded-full apple-bento shadow-lg">
        <button
          type="button"
          onClick={handleToggleOneTapMic}
          disabled={isProcessing}
          aria-label={CATEGORY_LABELS[activeCategory]}
          className={`h-10 px-4 rounded-full flex items-center gap-2 text-xs font-bold cursor-pointer transition-all ${
            isRecording
              ? 'bg-[#FF3B30] text-white'
              : 'apple-btn-primary text-white'
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Capturing...</span>
            </>
          ) : isRecording ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="font-mono tabular-nums">
                Stop ({formatTimer(recordingSeconds)})
              </span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>{CATEGORY_LABELS[activeCategory]}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setShowInputPopover((prev) => !prev)}
          title="Quick voice command input"
          aria-label="Open voice command text input"
          className="w-9 h-9 rounded-full apple-subtile flex items-center justify-center text-[#1E6F56] dark:text-[#34B38A] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] cursor-pointer"
        >
          <Keyboard className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
