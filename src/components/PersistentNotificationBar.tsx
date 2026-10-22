import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  Circle,
  Clock,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  ListChecks,
} from 'lucide-react';
import { TaskItem, AppSettings } from '../types';
import {
  requestOSNotificationPermission,
  sendPersistentTaskNotification,
  playReminderChime,
  triggerHapticFeedback,
} from '../services/notificationEngine';

interface PersistentNotificationBarProps {
  tasksForSelectedDate: TaskItem[];
  onToggleTask: (taskId: string) => void;
  selectedDate: string;
  settings: AppSettings;
}

export const PersistentNotificationBar: React.FC<PersistentNotificationBarProps> = ({
  tasksForSelectedDate,
  onToggleTask,
  selectedDate,
  settings,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );
  const [pipSupported, setPipSupported] = useState(false);

  const sortedTasks = [...tasksForSelectedDate].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const pWeight = { high: 3, medium: 2, low: 1 };
    if (pWeight[a.priority] !== pWeight[b.priority]) {
      return pWeight[b.priority] - pWeight[a.priority];
    }
    return (a.startTime || '99:99').localeCompare(b.startTime || '99:99');
  });

  useEffect(() => {
    if (activeIndex >= sortedTasks.length) {
      setActiveIndex(0);
    }
  }, [sortedTasks.length, activeIndex]);

  useEffect(() => {
    setPipSupported(Boolean((window as any).documentPictureInPicture));
  }, []);

  if (!settings.showPersistentBar) return null;

  const currentTask = sortedTasks[activeIndex] || null;
  const completedCount = tasksForSelectedDate.filter((t) => t.completed).length;
  const totalCount = tasksForSelectedDate.length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handlePushToNotificationBar = async () => {
    if (!currentTask) return;
    if (notifPermission !== 'granted') {
      const perm = await requestOSNotificationPermission();
      setNotifPermission(perm);
      if (perm !== 'granted') return;
    }
    playReminderChime(settings);
    await sendPersistentTaskNotification(currentTask, onToggleTask, settings);
  };

  const handleOpenFloatingNotificationBar = async () => {
    const docPip = (window as any).documentPictureInPicture;
    if (!docPip) {
      await handlePushToNotificationBar();
      return;
    }
    try {
      const pipWin = await docPip.requestWindow({ width: 380, height: 210 });
      const renderPip = () => {
        pipWin.document.head.innerHTML = `
          <style>
            body {
              margin: 0;
              padding: 12px 14px;
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
              background: #141418;
              color: #F5F5F7;
            }
            .hdr { font-size: 11px; color: #AEAEB2; margin-bottom: 8px; display: flex; justify-content: space-between; }
            .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; border-radius: 12px; background: #24242B; margin-bottom: 6px; }
            .ttl { font-size: 13px; font-weight: 500; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .done { text-decoration: line-through; color: #AEAEB2; }
            button { background: #1E6F56; color: #fff; border: none; border-radius: 999px; padding: 6px 12px; font-size: 11px; font-weight: 600; cursor: pointer; }
            button.checked { background: #34343E; color: #AEAEB2; }
          </style>
        `;
        pipWin.document.body.innerHTML = `
          <div class="hdr"><span>TASKS · ${selectedDate}</span><span>Tap to Check</span></div>
          <div id="list"></div>
        `;
        const listEl = pipWin.document.getElementById('list');
        if (listEl) {
          sortedTasks.slice(0, 3).forEach((t) => {
            const row = pipWin.document.createElement('div');
            row.className = 'row';
            const span = pipWin.document.createElement('span');
            span.className = `ttl ${t.completed ? 'done' : ''}`;
            span.textContent = t.title;
            const btn = pipWin.document.createElement('button');
            btn.className = t.completed ? 'checked' : '';
            btn.textContent = t.completed ? '✓ Done' : 'Check';
            btn.onclick = () => {
              onToggleTask(t.id);
              setTimeout(renderPip, 80);
            };
            row.appendChild(span);
            row.appendChild(btn);
            listEl.appendChild(row);
          });
        }
      };
      renderPip();
    } catch {
      await handlePushToNotificationBar();
    }
  };

  return (
    <div
      role="region"
      aria-label="Active Task Notification Strip"
      className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-3"
    >
      <div className="w-full apple-dynamic-island rounded-2xl px-3.5 py-2.5 transition-all">
        <div className="flex items-center justify-between gap-3">
          {currentTask ? (
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback(settings);
                  onToggleTask(currentTask.id);
                }}
                aria-label={currentTask.completed ? 'Uncheck task' : 'Complete task'}
                className="w-7 h-7 rounded-lg apple-subtile hover:bg-black/[0.08] dark:hover:bg-white/[0.14] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              >
                {currentTask.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-[#1E6F56] dark:text-[#34B38A]" />
                ) : (
                  <Circle className="w-4 h-4 text-[#1E6F56] dark:text-[#34B38A]" />
                )}
              </button>

              <span
                className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                  currentTask.completed
                    ? 'bg-[#1E6F56]/15 text-[#1E6F56] dark:text-[#34B38A]'
                    : currentTask.priority === 'high'
                      ? 'bg-[#C85A32]/15 text-[#B84A24] dark:text-[#E87A52]'
                      : 'apple-subtile text-[#3A3A3C] dark:text-[#D1D1D6]'
                }`}
              >
                {currentTask.completed ? 'Done' : `P${currentTask.priority === 'high' ? '1' : currentTask.priority === 'medium' ? '2' : '3'} Next`}
              </span>

              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="min-w-0 flex-1 text-left flex items-center gap-2 text-xs cursor-pointer"
              >
                <span
                  className={`truncate font-semibold ${
                    currentTask.completed
                      ? 'line-through text-[#515154] dark:text-[#A1A1A6]'
                      : 'text-[#1D1D1F] dark:text-[#F5F5F7]'
                  }`}
                >
                  {currentTask.title}
                </span>
                {currentTask.startTime && (
                  <span className="font-mono tabular-nums text-[11px] font-medium text-[#48484A] dark:text-[#AEAEB2] shrink-0 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#1E6F56] dark:text-[#34B38A]" />
                    {currentTask.startTime}
                  </span>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-medium text-[#48484A] dark:text-[#AEAEB2] py-0.5 pl-1">
              <ListChecks className="w-4 h-4 text-[#1E6F56] dark:text-[#34B38A]" />
              <span>No active tasks scheduled for {selectedDate}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden sm:flex items-center gap-2 mr-1">
              <div className="w-14 h-1.5 rounded-full bg-black/[0.08] dark:bg-white/[0.12] overflow-hidden">
                <div
                  style={{ width: `${completionPct}%` }}
                  className="h-full rounded-full bg-[#1E6F56] dark:bg-[#34B38A] transition-all duration-300"
                />
              </div>
              <span className="text-[11px] font-mono tabular-nums font-semibold text-[#3A3A3C] dark:text-[#D1D1D6]">
                {completedCount}/{totalCount}
              </span>
            </div>

            {sortedTasks.length > 1 && (
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((prev) => (prev - 1 + sortedTasks.length) % sortedTasks.length)
                  }
                  aria-label="Previous task"
                  className="p-1 rounded-lg text-[#48484A] dark:text-[#AEAEB2] hover:text-[#1D1D1F] dark:hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveIndex((prev) => (prev + 1) % sortedTasks.length)}
                  aria-label="Next task"
                  className="p-1 rounded-lg text-[#48484A] dark:text-[#AEAEB2] hover:text-[#1D1D1F] dark:hover:text-white cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handlePushToNotificationBar}
              disabled={!currentTask}
              title="Send to OS Notification Bar"
              className="w-7 h-7 rounded-lg apple-subtile hover:bg-black/[0.08] dark:hover:bg-white/[0.14] flex items-center justify-center disabled:opacity-40 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-[#1E6F56] dark:text-[#34B38A]" />
            </button>

            {pipSupported && (
              <button
                type="button"
                onClick={handleOpenFloatingNotificationBar}
                title="Pop out mini notification bar"
                className="w-7 h-7 rounded-lg apple-subtile hover:bg-black/[0.08] dark:hover:bg-white/[0.14] flex items-center justify-center cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#1E6F56] dark:text-[#34B38A]" />
              </button>
            )}
          </div>
        </div>

        {expanded && currentTask && (
          <div className="mt-2 pt-2 border-t border-black/[0.08] dark:border-white/[0.1] flex items-center justify-between gap-2 text-[11px] text-[#48484A] dark:text-[#AEAEB2] px-1">
            <span className="font-medium">
              Priority: {currentTask.priority.toUpperCase()} · Duration:{' '}
              {currentTask.durationMinutes || 30}m
            </span>
            <button
              type="button"
              onClick={handlePushToNotificationBar}
              className="text-[#1E6F56] dark:text-[#34B38A] font-semibold hover:underline cursor-pointer"
            >
              Push to System Notification Bar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
