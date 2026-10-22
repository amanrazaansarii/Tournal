// Service Worker for Tournal Persistent Actionable Task Notifications
const channel = new BroadcastChannel('tournal-notification-actions');

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const data = notification.data || {};
  const taskId = data.taskId;
  const action = event.action;

  notification.close();

  if (action === 'toggle-complete' || action === 'mark-done') {
    channel.postMessage({
      type: 'TOGGLE_TASK_FROM_NOTIFICATION',
      taskId,
      completed: true,
    });
  } else if (action === 'mark-undone') {
    channel.postMessage({
      type: 'TOGGLE_TASK_FROM_NOTIFICATION',
      taskId,
      completed: false,
    });
  } else if (action === 'snooze-10m') {
    channel.postMessage({
      type: 'SNOOZE_TASK_FROM_NOTIFICATION',
      taskId,
      minutes: 10,
    });
  } else {
    // Default body click: focus existing window or toggle if requested
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'NOTIFICATION_BODY_CLICKED',
            taskId,
          });
          if ('focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
    );
  }
});
