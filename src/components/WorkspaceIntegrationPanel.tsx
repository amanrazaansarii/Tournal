import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Check,
  Calendar,
  Mail,
  Users,
  Video,
  Download,
  Upload,
  LogOut,
  FileText,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { TaskItem, ConfirmDialogState } from '../types';
import {
  googleSignIn,
  logout,
  fetchGoogleKeepNotes,
  fetchGoogleTaskLists,
  pushTaskToGoogleTasks,
  fetchGoogleCalendarEvents,
  createGoogleCalendarTimeBlock,
  fetchRecentGmailMessages,
  fetchGoogleContacts,
  createGoogleMeetSpace,
} from '../services/workspaceAuth';

interface WorkspaceIntegrationPanelProps {
  user: User | null;
  needsAuth: boolean;
  onAuthChange: (user: User | null, needsAuth: boolean) => void;
  selectedDate: string;
  tasksForSelectedDate: TaskItem[];
  onImportTasks: (newTasks: Omit<TaskItem, 'id' | 'createdAt'>[]) => void;
  onAttachMeetToTask: (taskId: string, meetUri: string) => void;
  onAttachContactToTask: (taskId: string, name: string, email: string) => void;
  requestConfirmation: (dialog: Omit<ConfirmDialogState, 'isOpen'>) => void;
}

const SAMPLE_KEEP_LIST_EXPORT = `[ ] Renew gym membership & chalk block
[ ] Order cold-pressed olive oil and organic eggs
[ ] Schedule quarterly bloodwork panel at 09:00
[x] Backup local project archives`;

export const WorkspaceIntegrationPanel: React.FC<WorkspaceIntegrationPanelProps> = ({
  user,
  needsAuth,
  onAuthChange,
  selectedDate,
  tasksForSelectedDate,
  onImportTasks,
  onAttachMeetToTask,
  onAttachContactToTask,
  requestConfirmation,
}) => {
  const [activeServiceTab, setActiveServiceTab] = useState<
    'keep' | 'tasks' | 'calendar' | 'gmail' | 'contacts_meet'
  >('keep');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [keepNotes, setKeepNotes] = useState<
    Array<{ id: string; title: string; items: Array<{ text: string; checked: boolean }> }>
  >([]);
  const [keepNotice, setKeepNotice] = useState<string | null>(null);
  const [keepPasteTitle, setKeepPasteTitle] = useState('Google Keep List');
  const [keepPasteText, setKeepPasteText] = useState(SAMPLE_KEEP_LIST_EXPORT);

  const [taskLists, setTaskLists] = useState<
    Array<{
      id: string;
      title: string;
      tasks: Array<{ id: string; title: string; notes?: string; completed: boolean }>;
    }>
  >([]);

  const [calendarEvents, setCalendarEvents] = useState<
    Array<{ id: string; summary: string; startTime: string; endTime: string; htmlLink?: string }>
  >([]);

  const [gmailMessages, setGmailMessages] = useState<
    Array<{ id: string; subject: string; from: string; snippet: string }>
  >([]);

  const [contacts, setContacts] = useState<
    Array<{ resourceName: string; name: string; email: string }>
  >([]);
  const [selectedTaskIdForAction, setSelectedTaskIdForAction] = useState<string>('');

  useEffect(() => {
    if (tasksForSelectedDate.length > 0 && !selectedTaskIdForAction) {
      setSelectedTaskIdForAction(tasksForSelectedDate[0].id);
    }
  }, [tasksForSelectedDate, selectedTaskIdForAction]);

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const res = await googleSignIn();
      if (res) {
        onAuthChange(res.user, false);
        setStatusMessage(`Connected as ${res.user.email}`);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    onAuthChange(null, true);
    setStatusMessage('Signed out of Google Workspace.');
  };

  const handleLoadActiveService = async () => {
    if (needsAuth) return;
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      if (activeServiceTab === 'keep') {
        const res = await fetchGoogleKeepNotes();
        setKeepNotes(res.notes);
        setKeepNotice(res.enterpriseNotice || null);
      } else if (activeServiceTab === 'tasks') {
        const lists = await fetchGoogleTaskLists();
        setTaskLists(lists);
      } else if (activeServiceTab === 'calendar') {
        const evs = await fetchGoogleCalendarEvents(selectedDate);
        setCalendarEvents(evs);
      } else if (activeServiceTab === 'gmail') {
        const msgs = await fetchRecentGmailMessages();
        setGmailMessages(msgs);
      } else if (activeServiceTab === 'contacts_meet') {
        const cts = await fetchGoogleContacts();
        setContacts(cts);
      }
    } catch (err: any) {
      if (err?.message === 'AUTH_REQUIRED') {
        onAuthChange(null, true);
      } else {
        setErrorMessage(err?.message || 'Failed to load Google data.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportKeepTextList = () => {
    const lines = keepPasteText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const parsedTasks: Omit<TaskItem, 'id' | 'createdAt'>[] = lines.map((line) => {
      const isChecked =
        line.startsWith('[x]') || line.startsWith('[X]') || line.startsWith('✓');
      const cleanedTitle = line
        .replace(/^(\[x\]|\[X\]|\[\s?\]|[-•*✓])\s*/, '')
        .trim();
      return {
        date: selectedDate,
        title: cleanedTitle || line,
        notes: `Imported from ${keepPasteTitle}`,
        priority: 'medium',
        completed: isChecked,
        startTime: '',
        durationMinutes: 30,
        reminderMinutesBefore: 5,
        source: 'keep',
      };
    });

    onImportTasks(parsedTasks);
    setStatusMessage(`Imported ${parsedTasks.length} items into ${selectedDate}.`);
  };

  const handleKeepJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        const title = json.title || file.name.replace('.json', '');
        const items: Omit<TaskItem, 'id' | 'createdAt'>[] = [];

        if (Array.isArray(json.listContent)) {
          json.listContent.forEach((item: any) => {
            if (item.text) {
              items.push({
                date: selectedDate,
                title: item.text,
                notes: `Google Keep (${title})`,
                priority: 'medium',
                completed: Boolean(item.isChecked),
                startTime: '',
                durationMinutes: 30,
                reminderMinutesBefore: 5,
                source: 'keep',
              });
            }
          });
        } else if (json.textContent) {
          String(json.textContent)
            .split('\n')
            .filter(Boolean)
            .forEach((line) => {
              items.push({
                date: selectedDate,
                title: line.trim(),
                notes: `Google Keep (${title})`,
                priority: 'medium',
                completed: false,
                startTime: '',
                durationMinutes: 30,
                reminderMinutesBefore: 5,
                source: 'keep',
              });
            });
        }

        if (items.length > 0) {
          onImportTasks(items);
          setStatusMessage(`Imported ${items.length} items from ${file.name}.`);
        } else {
          setErrorMessage('No items found in JSON file.');
        }
      } catch {
        setErrorMessage('Invalid Keep JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handlePushLocalTasksToGoogleTasks = (listId: string, listTitle: string) => {
    const uncompleted = tasksForSelectedDate.filter((t) => !t.completed);
    if (uncompleted.length === 0) {
      setErrorMessage('No uncompleted tasks on this date to export.');
      return;
    }

    requestConfirmation({
      title: `Export ${uncompleted.length} task(s) to Google Tasks?`,
      description: `This will create ${uncompleted.length} new task item(s) inside your Google Tasks list "${listTitle}" for ${selectedDate}.`,
      confirmLabel: 'Export',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          for (const t of uncompleted) {
            await pushTaskToGoogleTasks(listId, t.title, t.notes, selectedDate);
          }
          setStatusMessage(`Exported ${uncompleted.length} tasks to "${listTitle}".`);
          await handleLoadActiveService();
        } catch (err: any) {
          setErrorMessage(err?.message || 'Failed to push tasks.');
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const handleSyncTaskToCalendar = (task: TaskItem) => {
    requestConfirmation({
      title: `Add "${task.title}" to Google Calendar?`,
      description: `Creates a ${task.durationMinutes || 30}m event at ${
        task.startTime || '09:00'
      } on ${selectedDate}.`,
      confirmLabel: 'Add Event',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await createGoogleCalendarTimeBlock(
            selectedDate,
            task.title,
            task.notes,
            task.startTime || '09:00',
            task.durationMinutes || 30
          );
          setStatusMessage(`Added "${task.title}" to Google Calendar.`);
          if (activeServiceTab === 'calendar') {
            await handleLoadActiveService();
          }
        } catch (err: any) {
          setErrorMessage(err?.message || 'Failed to create event.');
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const handleCreateMeetForTask = (taskId: string) => {
    const targetTask = tasksForSelectedDate.find((t) => t.id === taskId);
    if (!targetTask) return;

    requestConfirmation({
      title: `Create Google Meet for "${targetTask.title}"?`,
      description: 'Creates a Google Meet link and attaches it to this task.',
      confirmLabel: 'Create Meet',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          const space = await createGoogleMeetSpace();
          if (space.meetingUri) {
            onAttachMeetToTask(taskId, space.meetingUri);
            setStatusMessage(`Attached Meet (${space.meetingCode}) to task.`);
          }
        } catch (err: any) {
          setErrorMessage(err?.message || 'Failed to create Meet space.');
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-8">
      {/* Account Connection Row */}
      <div className="apple-bento p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
            Google Workspace Sync
          </div>
          <div className="text-xs font-medium text-[#48484A] dark:text-[#AEAEB2]">
            {user?.email ? `Connected as ${user.email}` : 'Keep, Tasks, Calendar, Gmail, Contacts & Meet'}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {needsAuth || !user ? (
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="gsi-material-button"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">Sign in with Google</span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSignOut}
              className="min-h-[38px] px-4 py-1.5 rounded-full apple-subtile text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Segmented Service Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 p-1 apple-subtile rounded-full">
          {(
            [
              ['keep', 'Keep'],
              ['tasks', 'Tasks'],
              ['calendar', 'Calendar'],
              ['gmail', 'Gmail'],
              ['contacts_meet', 'Contacts & Meet'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveServiceTab(id)}
              className={`min-h-[34px] px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                activeServiceTab === id
                  ? 'apple-btn-primary'
                  : 'text-[#2C2C2E] dark:text-[#E5E5EA] hover:bg-black/[0.06] dark:hover:bg-white/[0.1]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {!needsAuth && user && (
          <button
            type="button"
            onClick={handleLoadActiveService}
            disabled={isLoading}
            className="min-h-[36px] px-4 py-1.5 rounded-full apple-btn-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="bg-[#248A3D]/15 dark:bg-[#30D158]/20 text-[#1E7A34] dark:text-[#30D158] rounded-2xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-[#FF3B30]/15 text-[#D70015] dark:text-[#FF453A] rounded-2xl px-4 py-2.5 text-xs font-semibold">
          {errorMessage}
        </div>
      )}

      {/* KEEP IMPORT */}
      {activeServiceTab === 'keep' && (
        <div className="apple-bento p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
              Import from Google Keep
            </span>
            <label className="px-3.5 py-1.5 rounded-full apple-subtile text-xs font-semibold text-[#1E6F56] dark:text-[#34B38A] flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Keep .json</span>
              <input
                type="file"
                accept=".json"
                onChange={handleKeepJsonFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {keepNotice && (
            <p className="text-xs font-medium text-[#48484A] dark:text-[#AEAEB2]">{keepNotice}</p>
          )}

          {keepNotes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {keepNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-3.5 apple-subtile space-y-2"
                >
                  <div className="font-bold text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {note.title}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onImportTasks(
                        note.items.map((it) => ({
                          date: selectedDate,
                          title: it.text,
                          notes: `From Keep: ${note.title}`,
                          priority: 'medium',
                          completed: it.checked,
                          startTime: '',
                          durationMinutes: 30,
                          reminderMinutesBefore: 5,
                          source: 'keep',
                        }))
                      );
                      setStatusMessage(`Imported "${note.title}".`);
                    }}
                    className="px-3.5 py-1 rounded-full apple-btn-primary text-xs font-semibold cursor-pointer"
                  >
                    Import
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 pt-2 border-t border-black/[0.08] dark:border-white/[0.08]">
            <input
              type="text"
              value={keepPasteTitle}
              onChange={(e) => setKeepPasteTitle(e.target.value)}
              placeholder="List Title"
              className="w-full apple-subtile px-3.5 py-2 text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7]"
            />
            <textarea
              rows={4}
              value={keepPasteText}
              onChange={(e) => setKeepPasteText(e.target.value)}
              className="w-full apple-subtile p-3.5 text-xs font-mono text-[#1D1D1F] dark:text-[#F5F5F7]"
            />
            <button
              type="button"
              onClick={handleImportKeepTextList}
              className="min-h-[40px] px-4 py-2 rounded-full apple-btn-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Import Checklist to {selectedDate}</span>
            </button>
          </div>
        </div>
      )}

      {/* GOOGLE TASKS */}
      {activeServiceTab === 'tasks' && (
        <div className="apple-bento p-5 space-y-4">
          {taskLists.length === 0 ? (
            <div className="py-8 text-center text-xs font-medium text-[#48484A] dark:text-[#AEAEB2] space-y-2">
              <FileText className="w-5 h-5 mx-auto text-[#48484A] dark:text-[#AEAEB2]" />
              <div>Tap &ldquo;Sync&rdquo; above to load your Google Tasks lists.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {taskLists.map((list) => (
                <div
                  key={list.id}
                  className="p-4 apple-subtile space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {list.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onImportTasks(
                            list.tasks.map((t) => ({
                              date: selectedDate,
                              title: t.title,
                              notes: t.notes || '',
                              priority: 'medium',
                              completed: t.completed,
                              startTime: '',
                              durationMinutes: 30,
                              reminderMinutesBefore: 5,
                              source: 'google_tasks',
                            }))
                          );
                          setStatusMessage(`Imported ${list.tasks.length} tasks.`);
                        }}
                        className="px-3 py-1 rounded-full apple-btn-primary text-xs font-semibold cursor-pointer"
                      >
                        Import All
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePushLocalTasksToGoogleTasks(list.id, list.title)}
                        className="px-3 py-1 rounded-full bg-black/[0.06] dark:bg-white/[0.1] text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] cursor-pointer"
                      >
                        Export Today
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GOOGLE CALENDAR */}
      {activeServiceTab === 'calendar' && (
        <div className="apple-bento p-5 space-y-4">
          <div className="text-xs font-bold text-[#3A3A3C] dark:text-[#D1D1D6]">
            Push {selectedDate} Tasks to Google Calendar
          </div>
          <div className="divide-y divide-black/[0.08] dark:divide-white/[0.08]">
            {tasksForSelectedDate.map((t) => (
              <div key={t.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {t.title} ({t.startTime || '09:00'})
                </span>
                <button
                  type="button"
                  disabled={needsAuth}
                  onClick={() => handleSyncTaskToCalendar(t)}
                  className="px-3.5 py-1.5 rounded-full apple-btn-primary font-semibold disabled:opacity-40 shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Add Event</span>
                </button>
              </div>
            ))}
          </div>

          {calendarEvents.length > 0 && (
            <div className="pt-3 border-t border-black/[0.08] dark:border-white/[0.08] space-y-2">
              <div className="text-xs font-bold text-[#3A3A3C] dark:text-[#D1D1D6]">
                Calendar Events
              </div>
              {calendarEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between text-xs py-1.5"
                >
                  <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {ev.summary} · {ev.startTime}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onImportTasks([
                        {
                          date: selectedDate,
                          title: ev.summary,
                          notes: 'From Google Calendar',
                          priority: 'high',
                          completed: false,
                          startTime: ev.startTime !== 'All Day' ? ev.startTime : '09:00',
                          durationMinutes: 45,
                          reminderMinutesBefore: 10,
                          source: 'local',
                        },
                      ])
                    }
                    className="text-[#1E6F56] dark:text-[#34B38A] font-semibold cursor-pointer"
                  >
                    + Add to Tasks
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GMAIL */}
      {activeServiceTab === 'gmail' && (
        <div className="apple-bento p-5 space-y-3">
          {gmailMessages.length === 0 ? (
            <div className="py-8 text-center text-xs font-medium text-[#48484A] dark:text-[#AEAEB2] space-y-2">
              <Mail className="w-5 h-5 mx-auto text-[#48484A] dark:text-[#AEAEB2]" />
              <div>Tap &ldquo;Sync&rdquo; above to load recent Gmail messages.</div>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.08] dark:divide-white/[0.08]">
              {gmailMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                      {msg.subject}
                    </div>
                    <div className="text-[#48484A] dark:text-[#AEAEB2] truncate">{msg.from}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onImportTasks([
                        {
                          date: selectedDate,
                          title: msg.subject,
                          notes: `From ${msg.from}`,
                          priority: 'high',
                          completed: false,
                          startTime: '11:00',
                          durationMinutes: 25,
                          reminderMinutesBefore: 5,
                          source: 'gmail',
                        },
                      ]);
                      setStatusMessage('Added email as task.');
                    }}
                    className="px-3.5 py-1.5 rounded-full apple-btn-primary font-semibold shrink-0 cursor-pointer"
                  >
                    + Task
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTACTS & MEET */}
      {activeServiceTab === 'contacts_meet' && (
        <div className="apple-bento p-5 space-y-4">
          {tasksForSelectedDate.length > 0 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#3A3A3C] dark:text-[#D1D1D6]">
                Target Task:
              </span>
              <select
                value={selectedTaskIdForAction}
                onChange={(e) => setSelectedTaskIdForAction(e.target.value)}
                className="apple-subtile px-3.5 py-1.5 text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]"
              >
                {tasksForSelectedDate.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-black/[0.08] dark:border-white/[0.08]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
              <Video className="w-4 h-4 text-[#1E6F56] dark:text-[#34B38A]" />
              <span>Attach Google Meet Link</span>
            </div>
            <button
              type="button"
              disabled={needsAuth || !selectedTaskIdForAction}
              onClick={() => handleCreateMeetForTask(selectedTaskIdForAction)}
              className="px-4 py-1.5 rounded-full apple-btn-primary text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              Create Meet
            </button>
          </div>

          {contacts.length > 0 && (
            <div className="pt-3 border-t border-black/[0.08] dark:border-white/[0.08] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#3A3A3C] dark:text-[#D1D1D6]">
                <Users className="w-3.5 h-3.5" />
                <span>Contacts</span>
              </div>
              {contacts.map((c) => (
                <div
                  key={c.resourceName}
                  className="flex items-center justify-between text-xs py-1.5"
                >
                  <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{c.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedTaskIdForAction) return;
                      onAttachContactToTask(selectedTaskIdForAction, c.name, c.email);
                      setStatusMessage(`Tagged ${c.name}.`);
                    }}
                    className="text-[#1E6F56] dark:text-[#34B38A] font-semibold cursor-pointer"
                  >
                    Tag
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
