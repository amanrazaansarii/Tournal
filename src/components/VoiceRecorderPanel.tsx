import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Keyboard } from 'lucide-react';
import { VoiceTableBlock, VoiceChartBlock } from '../types';

interface VoiceRecorderPanelProps {
  mode: 'tasks' | 'journal' | 'workout' | 'table_chart';
  defaultDate: string;
  existingJournalText?: string;
  placeholderLabel?: string;
  onTasksParsed?: (
    tasks: Array<{
      title: string;
      notes: string;
      priority: 'high' | 'medium' | 'low';
      startTime: string;
      durationMinutes: number;
      reminderMinutesBefore: number;
    }>,
    targetDate: string,
    transcript: string
  ) => void;
  onJournalParsed?: (result: {
    transcript: string;
    suggestedTitle: string;
    structuredContent: string;
    keyTakeaways: string[];
    intentEdits: string[];
    generatedTable?: VoiceTableBlock;
    generatedChart?: VoiceChartBlock;
  }) => void;
  onTableChartParsed?: (result: {
    transcript: string;
    table?: VoiceTableBlock;
    chart?: VoiceChartBlock;
  }) => void;
  onWorkoutParsed?: (result: {
    transcript: string;
    bodyWeight: number;
    bodyWeightUnit: 'lbs' | 'kg';
    exercises: Array<{
      exerciseName: string;
      weight: number;
      weightUnit: 'lbs' | 'kg';
      sets: number;
      reps: number;
      effortState: 'to_failure' | 'in_control';
      notes: string;
    }>;
  }) => void;
}

const VOICE_PLACEHOLDERS: Record<'tasks' | 'journal' | 'workout' | 'table_chart', string> = {
  tasks: 'Describe your tasks (e.g., task name, time, duration, and priority)...',
  journal: 'Speak or type your daily reflection, points, or request a table/chart...',
  table_chart: 'Describe the table or chart you want to generate from your metrics...',
  workout: 'Log your exercises, sets, reps, weights, and effort state...',
};

export const VoiceRecorderPanel: React.FC<VoiceRecorderPanelProps> = ({
  mode,
  defaultDate,
  existingJournalText = '',
  placeholderLabel,
  onTasksParsed,
  onJournalParsed,
  onTableChartParsed,
  onWorkoutParsed,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTextSheet, setShowTextSheet] = useState(false);
  const [manualSpeechInput, setManualSpeechInput] = useState('');

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

  const processVoicePayload = async (payload: {
    base64Audio?: string;
    mimeType?: string;
    rawText?: string;
  }) => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const endpoint =
        mode === 'tasks'
          ? '/api/voice/tasks'
          : mode === 'journal'
            ? '/api/voice/journal'
            : mode === 'table_chart'
              ? '/api/voice/table-chart'
              : '/api/voice/workout';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          defaultDate,
          existingContent: existingJournalText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Voice command failed');
      }

      if (mode === 'tasks' && onTasksParsed) {
        onTasksParsed(
          data.tasks || [],
          data.targetDate || defaultDate,
          data.transcript || ''
        );
      } else if (mode === 'journal' && onJournalParsed) {
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

        onJournalParsed({
          transcript: data.transcript || '',
          suggestedTitle: data.suggestedTitle || 'Journal Entry',
          structuredContent: data.structuredContent || '',
          keyTakeaways: data.keyTakeaways || [],
          intentEdits: data.intentEdits || [],
          generatedTable: genTable,
          generatedChart: genChart,
        });
      } else if (mode === 'table_chart' && onTableChartParsed) {
        const genTable: VoiceTableBlock | undefined =
          data.table?.hasTable && data.table?.headers?.length
            ? {
                id: `tbl-${Date.now()}`,
                title: data.table.title || 'Voice Table',
                headers: data.table.headers,
                rows: data.table.rows || [],
              }
            : undefined;

        const genChart: VoiceChartBlock | undefined =
          data.chart?.hasChart && data.chart?.dataPoints?.length
            ? {
                id: `chart-${Date.now()}`,
                chartType: data.chart.chartType === 'line' ? 'line' : 'bar',
                title: data.chart.title || 'Voice Chart',
                unit: data.chart.unit || '',
                dataPoints: data.chart.dataPoints,
              }
            : undefined;

        onTableChartParsed({
          transcript: data.transcript || '',
          table: genTable,
          chart: genChart,
        });
      } else if (mode === 'workout' && onWorkoutParsed) {
        onWorkoutParsed({
          transcript: data.transcript || '',
          bodyWeight: data.bodyWeight || 0,
          bodyWeightUnit: data.bodyWeightUnit === 'kg' ? 'kg' : 'lbs',
          exercises: (data.exercises || []).map((ex: any) => ({
            exerciseName: ex.exerciseName || 'Exercise',
            weight: Number(ex.weight) || 0,
            weightUnit: ex.weightUnit === 'kg' ? 'kg' : 'lbs',
            sets: Number(ex.sets) || 1,
            reps: Number(ex.reps) || 1,
            effortState: ex.effortState === 'to_failure' ? 'to_failure' : 'in_control',
            notes: ex.notes || '',
          })),
        });
      }

      setManualSpeechInput('');
      setShowTextSheet(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to process voice command.');
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size < 200) {
          setErrorMsg('Audio was too brief. Please try again.');
          return;
        }
        const base64Audio = await blobToBase64(blob);
        await processVoicePayload({
          base64Audio,
          mimeType: recorder.mimeType || 'audio/webm',
        });
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      setShowTextSheet(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const formatTimer = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const defaultLabels: Record<'tasks' | 'journal' | 'workout' | 'table_chart', string> = {
    tasks: 'Voice Add Tasks',
    journal: 'Dictate Entry, Table or Chart',
    table_chart: 'Voice Create Table / Chart',
    workout: 'Voice Log Workout',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={isProcessing}
            className="min-h-[40px] px-4 py-1.5 rounded-full apple-btn-primary text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Voice...</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>{placeholderLabel || defaultLabels[mode]}</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="min-h-[40px] px-4 py-1.5 rounded-full bg-[#FF3B30] text-white text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span className="font-mono tabular-nums">Stop ({formatTimer(recordingSeconds)})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowTextSheet((prev) => !prev)}
          disabled={isProcessing}
          title="Type a voice command"
          className="min-h-[40px] min-w-[40px] px-3.5 rounded-full apple-subtile text-[#1D1D1F] dark:text-[#F5F5F7] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-black/[0.08] dark:hover:bg-white/[0.14] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Keyboard className="w-4 h-4 text-[#1E6F56] dark:text-[#34B38A]" />
          <span className="hidden sm:inline">Command Input</span>
        </button>
      </div>

      {showTextSheet && (
        <div className="p-4 apple-bento space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#48484A] dark:text-[#AEAEB2]">
              Enter natural-language command (supports bullets, self-corrections, tables & charts)
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <textarea
              rows={2}
              value={manualSpeechInput}
              onChange={(e) => setManualSpeechInput(e.target.value)}
              placeholder={VOICE_PLACEHOLDERS[mode]}
              className="flex-1 apple-subtile px-3.5 py-2 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#515154] dark:placeholder:text-[#A1A1A6] focus:outline-none focus:border-[#1E6F56]"
            />
            <button
              type="button"
              disabled={isProcessing || !manualSpeechInput.trim()}
              onClick={() => processVoicePayload({ rawText: manualSpeechInput })}
              className="min-h-[40px] px-4 py-2 rounded-full apple-btn-primary text-xs font-semibold disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isProcessing ? 'Running...' : 'Run Command'}
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="text-xs font-medium text-[#D70015] dark:text-[#FF453A] bg-[#FF3B30]/12 rounded-2xl px-3.5 py-2">
          {errorMsg}
        </div>
      )}
    </div>
  );
};
