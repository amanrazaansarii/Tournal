import { TaskItem, AppSettings } from '../types';
import { loadSettings } from './localVault';

let swRegistration: ServiceWorkerRegistration | null = null;

export async function initNotificationServiceWorker(
  onTaskToggleFromNotification: (taskId: string, completed?: boolean) => void,
  onTaskSnoozeFromNotification: (taskId: string, minutes: number) => void
): Promise<void> {
  if (typeof window === 'undefined') return;

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel('tournal-notification-actions');
    channel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;
      if (data.type === 'TOGGLE_TASK_FROM_NOTIFICATION' && data.taskId) {
        onTaskToggleFromNotification(data.taskId, data.completed);
      } else if (data.type === 'SNOOZE_TASK_FROM_NOTIFICATION' && data.taskId) {
        onTaskSnoozeFromNotification(data.taskId, data.minutes || 10);
      }
    };
  }

  if ('serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.register('/sw.js');
      navigator.serviceWorker.addEventListener('message', (event) => {
        const data = event.data;
        if (data?.type === 'NOTIFICATION_BODY_CLICKED' && data.taskId) {
          onTaskToggleFromNotification(data.taskId);
        }
      });
    } catch (err) {
      console.warn('Service worker registration skipped:', err);
    }
  }
}

export async function requestOSNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

export function triggerHapticFeedback(settings?: AppSettings): void {
  const cfg = settings || loadSettings();
  if (!cfg.notificationVibration) return;
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate([80, 40, 100]);
    }
  } catch {
    // Ignore if unsupported
  }
}

export function playReminderChime(settings?: AppSettings): void {
  const cfg = settings || loadSettings();
  if (cfg.notificationVibration) {
    triggerHapticFeedback(cfg);
  }
  if (!cfg.notificationSound) return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const freqs = [523.25, 659.25]; // C5 -> E5 clean iOS-style tri-tone chime
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.12);
      gain.gain.setValueAtTime(0.001, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.14, now + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.42);
    });
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

export async function sendPersistentTaskNotification(
  task: TaskItem,
  onToggleCallback: (taskId: string) => void,
  settings?: AppSettings
): Promise<void> {
  const cfg = settings || loadSettings();

  // Respect category settings
  if (task.priority === 'high' && !cfg.categories.highPriorityTasks) return;
  if (task.priority !== 'high' && !cfg.categories.scheduledTasks) return;

  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const priorityLabel =
    task.priority === 'high' ? 'High Priority' : task.priority === 'medium' ? 'Medium' : 'Low';
  const timeInfo = task.startTime
    ? `${task.startTime} (${task.durationMinutes || 30}m)`
    : 'Today';
  const statusPrefix = task.completed ? '✓ Completed' : '○ Active';

  const title = `${statusPrefix}: ${task.title}`;
  const body = `${priorityLabel} · ${timeInfo}${task.notes ? `\n${task.notes}` : ''}`;

  if (swRegistration && 'showNotification' in swRegistration) {
    try {
      await swRegistration.showNotification(title, {
        body,
        tag: `tournal-task-${task.id}`,
        requireInteraction: true,
        silent: !cfg.notificationSound,
        vibrate: cfg.notificationVibration ? [120, 60, 120] : undefined,
        data: { taskId: task.id },
        actions: task.completed
          ? [{ action: 'mark-undone', title: '↺ Uncheck' }]
          : [
              { action: 'mark-done', title: '✓ Complete' },
              { action: 'snooze-10m', title: '⏰ Snooze 10m' },
            ],
      } as any);
      return;
    } catch {
      // Fallback
    }
  }

  const n = new Notification(title, {
    body: `${priorityLabel} · ${timeInfo} — Tap to check/uncheck.`,
    tag: `tournal-task-${task.id}`,
    requireInteraction: true,
    silent: !cfg.notificationSound,
  });
  n.onclick = () => {
    onToggleCallback(task.id);
    n.close();
  };
}
