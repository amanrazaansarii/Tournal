import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  Square,
  Sparkles,
  Trash2,
  Zap,
  Loader2,
  Plus,
  History,
  MessageSquare,
  X,
} from 'lucide-react';
import {
  TaskItem,
  JournalEntry,
  WorkoutExercise,
  DailyBodyMetric,
  DietEntry,
  NutritionGoals,
  ExpenseEntry,
} from '../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  modelUsed?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

interface AIChatbotViewProps {
  selectedDate: string;
  tasks: TaskItem[];
  journals: JournalEntry[];
  workouts: WorkoutExercise[];
  bodyMetrics: DailyBodyMetric[];
  dietEntries: DietEntry[];
  nutritionGoals: NutritionGoals;
  expenses: ExpenseEntry[];
  onClose?: () => void;
}

const CHAT_SESSIONS_STORAGE_KEY = 'tournal_chat_sessions_v2';
const LEGACY_CHAT_STORAGE_KEY = 'tournal_chat_history_v1';

function createDefaultWelcomeMessage(): ChatMessage {
  return {
    id: `welcome-${Date.now()}`,
    role: 'model',
    text: 'Ask me anything about your tasks, journal reflections, workouts, diet macros, or expenses.',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

function loadInitialSessions(): ChatSession[] {
  try {
    const saved = localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }

    // Migrate legacy single-thread history if present
    const legacy = localStorage.getItem(LEGACY_CHAT_STORAGE_KEY);
    if (legacy) {
      const legacyMsgs: ChatMessage[] = JSON.parse(legacy);
      if (Array.isArray(legacyMsgs) && legacyMsgs.length > 0) {
        const firstUserQ = legacyMsgs.find((m) => m.role === 'user')?.text;
        return [
          {
            id: `session-legacy-${Date.now()}`,
            title: firstUserQ ? firstUserQ.slice(0, 48) : 'Previous Context Chat',
            createdAt: new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
            updatedAt: new Date().toISOString(),
            messages: legacyMsgs,
          },
        ];
      }
    }
  } catch {
    // Ignore storage read errors
  }

  return [
    {
      id: `session-${Date.now()}`,
      title: 'New Context Chat',
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      updatedAt: new Date().toISOString(),
      messages: [createDefaultWelcomeMessage()],
    },
  ];
}

export const AIChatbotView: React.FC<AIChatbotViewProps> = ({
  selectedDate,
  tasks,
  journals,
  workouts,
  bodyMetrics,
  dietEntries,
  nutritionGoals,
  expenses,
  onClose,
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>(loadInitialSessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const init = loadInitialSessions();
    return init[0]?.id || '';
  });
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [speedMode, setSpeedMode] = useState<'standard' | 'fast'>('standard');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  useEffect(() => {
    localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeSessionId]);

  // Collect all previous user questions across all sessions for quick recall
  const previousUserQuestions = sessions
    .flatMap((s) =>
      s.messages
        .filter((m) => m.role === 'user')
        .map((m) => ({
          sessionId: s.id,
          text: m.text,
          timestamp: m.timestamp,
          dateLabel: s.createdAt,
        }))
    )
    .reverse();

  const handleStartNewChat = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'New Context Chat',
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      updatedAt: new Date().toISOString(),
      messages: [createDefaultWelcomeMessage()],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setShowHistoryDrawer(false);
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        const fallback: ChatSession = {
          id: `session-${Date.now()}`,
          title: 'New Context Chat',
          createdAt: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          updatedAt: new Date().toISOString(),
          messages: [createDefaultWelcomeMessage()],
        };
        setActiveSessionId(fallback.id);
        return [fallback];
      }
      if (id === activeSessionId) {
        setActiveSessionId(remaining[0].id);
      }
      return remaining;
    });
  };

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isSending || !activeSession) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const historyForApi = activeSession.messages
      .filter((m) => !m.id.startsWith('welcome-'))
      .map((m) => ({ role: m.role, text: m.text }));

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSession.id) return s;
        const isDefaultTitle = s.title === 'New Context Chat';
        return {
          ...s,
          title: isDefaultTitle ? trimmed.slice(0, 46) : s.title,
          updatedAt: new Date().toISOString(),
          messages: [...s.messages, userMsg],
        };
      })
    );
    setInput('');
    setIsSending(true);

    try {
      const appDataContext = {
        activeSelectedDate: selectedDate,
        todayISO: new Date().toISOString().split('T')[0],
        tasks: tasks.map((t) => ({
          date: t.date,
          title: t.title,
          notes: t.notes,
          priority: t.priority,
          completed: t.completed,
          startTime: t.startTime,
          durationMinutes: t.durationMinutes,
          source: t.source,
          contactName: t.contactName,
        })),
        journals: journals.map((j) => ({
          date: j.date,
          title: j.title,
          content: j.content,
          keyTakeaways: j.keyTakeaways,
          tables: j.tables,
          charts: j.charts,
        })),
        workouts: workouts.map((w) => ({
          date: w.date,
          exerciseName: w.exerciseName,
          weight: `${w.weight} ${w.weightUnit}`,
          sets: w.sets,
          reps: w.reps,
          effortState: w.effortState,
          notes: w.notes,
        })),
        bodyMetrics,
        nutritionGoals,
        dietEntries: dietEntries.map((d) => ({
          date: d.date,
          foodName: d.foodName,
          quantity: d.quantity,
          calories: d.calories,
          proteinGrams: d.proteinGrams,
          fiberGrams: d.fiberGrams,
          carbsGrams: d.carbsGrams,
          fatGrams: d.fatGrams,
        })),
        expenses: expenses.map((e) => ({
          date: e.date,
          name: e.name,
          amount: e.amount,
          currency: e.currency,
          deadlineDate: e.deadlineDate,
          category: e.category,
          description: e.description,
          isCovered: e.isCovered,
        })),
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyForApi,
          appDataContext,
          speedMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get answer');
      }

      const botMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.reply || 'No response generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed,
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? {
                ...s,
                updatedAt: new Date().toISOString(),
                messages: [...s.messages, botMsg],
              }
            : s
        )
      );
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `Sorry, I encountered an error: ${err?.message || 'Unable to reach assistant.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? { ...s, messages: [...s.messages, errMsg] }
            : s
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(input);
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

  const toggleVoiceQuestion = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 200) return;
        setIsTranscribing(true);
        try {
          const base64Audio = await blobToBase64(blob);
          const res = await fetch('/api/voice/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Audio,
              mimeType: recorder.mimeType || 'audio/webm',
            }),
          });
          const data = await res.json();
          if (data.transcript) {
            await sendQuestion(data.transcript);
          }
        } finally {
          setIsTranscribing(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      // Fallback if mic blocked
    }
  };

  const suggestedPrompts = [
    `How much protein & calories did I eat on ${selectedDate}?`,
    `What expenses do I still need to cover?`,
    `What tasks & journal notes do I have on ${selectedDate}?`,
    `Summarize my workouts and weights lifted`,
  ];

  return (
    <div className="max-w-3xl mx-auto flex flex-col space-y-3 pb-8">
      {/* Top Assistant Control Header: Mode + Previous Chats + New Chat */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 apple-subtile rounded-full">
          <button
            type="button"
            onClick={() => setSpeedMode('standard')}
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              speedMode === 'standard'
                ? 'apple-btn-primary'
                : 'text-[#2C2C2E] dark:text-[#E5E5EA] hover:bg-black/[0.06] dark:hover:bg-white/[0.1]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart</span>
          </button>
          <button
            type="button"
            onClick={() => setSpeedMode('fast')}
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              speedMode === 'fast'
                ? 'apple-btn-primary'
                : 'text-[#2C2C2E] dark:text-[#E5E5EA] hover:bg-black/[0.06] dark:hover:bg-white/[0.1]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Fast</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHistoryDrawer((prev) => !prev)}
            className={`min-h-[34px] px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              showHistoryDrawer
                ? 'apple-btn-primary'
                : 'apple-subtile text-[#1C1C1E] dark:text-[#F2F2F7]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Previous Chats ({sessions.length})</span>
          </button>

          <button
            type="button"
            onClick={handleStartNewChat}
            className="min-h-[34px] px-3.5 py-1.5 rounded-full apple-subtile text-xs font-semibold text-[#1E6F56] dark:text-[#34B38A] flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Ask AI"
              className="w-8 h-8 rounded-full apple-subtile flex items-center justify-center text-[#636366] dark:text-[#98989D] hover:text-[#1C1C1E] dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Previous Chats & Questions History Panel */}
      {showHistoryDrawer && (
        <div className="apple-bento p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">
              Previous Chats & Questions History
            </span>
            <span className="text-[11px] font-mono tabular-nums text-[#636366] dark:text-[#98989D]">
              {previousUserQuestions.length} past question(s)
            </span>
          </div>

          <div className="max-h-52 overflow-y-auto divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            {sessions.map((sess) => {
              const isCurrent = sess.id === activeSession.id;
              const userQCount = sess.messages.filter((m) => m.role === 'user').length;
              return (
                <div
                  key={sess.id}
                  className={`py-2.5 px-2 flex items-center justify-between gap-2 rounded-lg ${
                    isCurrent ? 'bg-[#1E6F56]/12 dark:bg-[#34B38A]/15' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSessionId(sess.id);
                      setShowHistoryDrawer(false);
                    }}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#1E6F56] dark:text-[#34B38A] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
                        {sess.title}
                      </div>
                      <div className="text-[10px] font-mono tabular-nums text-[#636366] dark:text-[#98989D]">
                        {sess.createdAt} · {userQCount} question(s)
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSession(sess.id)}
                    aria-label="Delete chat session"
                    className="p-1.5 text-[#636366] dark:text-[#98989D] hover:text-[#FF3B30] cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scrollable Apple Bento Conversation Thread */}
      <div className="min-h-[340px] max-h-[52vh] overflow-y-auto apple-bento p-5 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                  isUser
                    ? 'apple-btn-primary rounded-[20px] rounded-br-md'
                    : 'apple-subtile text-[#1C1C1E] dark:text-[#F2F2F7] rounded-[20px] rounded-bl-md'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[10px] font-mono tabular-nums font-medium text-[#636366] dark:text-[#98989D] mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-start">
            <div className="px-4 py-2.5 rounded-[20px] rounded-bl-md apple-subtile text-xs font-medium text-[#3A3A3C] dark:text-[#D1D1D6] flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1E6F56] dark:text-[#34B38A]" />
              <span>Analyzing your journals, tasks, diet & expenses...</span>
            </div>
          </div>
        )}
        <div ref={threadEndRef} />
      </div>

      {/* Quick Prompt Chips Grounded in User Data */}
      <div className="flex flex-wrap items-center gap-1.5">
        {suggestedPrompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isSending}
            onClick={() => sendQuestion(prompt)}
            className="px-3 py-1.5 rounded-full apple-subtile text-xs font-medium text-[#1C1C1E] dark:text-[#F2F2F7] hover:border-[#1E6F56] cursor-pointer transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Pill Bar */}
      <form
        onSubmit={handleFormSubmit}
        className="flex items-center gap-2 apple-bento rounded-full p-1.5 pl-4"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your tasks, journals, diet, workouts, or expenses..."
          className="flex-1 bg-transparent text-sm text-[#1C1C1E] dark:text-[#F2F2F7] placeholder:text-[#636366] dark:placeholder:text-[#98989D] focus:outline-none"
        />

        <button
          type="button"
          onClick={toggleVoiceQuestion}
          disabled={isTranscribing || isSending}
          title="Ask with voice"
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
            isRecording
              ? 'bg-[#FF3B30] text-white'
              : 'apple-subtile text-[#2C2C2E] dark:text-[#E5E5EA] hover:text-[#1C1C1E] dark:hover:text-white'
          }`}
        >
          {isTranscribing ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#1E6F56]" />
          ) : isRecording ? (
            <Square className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>

        <button
          type="submit"
          disabled={!input.trim() || isSending}
          aria-label="Send message"
          className="w-9 h-9 rounded-full apple-btn-primary flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
