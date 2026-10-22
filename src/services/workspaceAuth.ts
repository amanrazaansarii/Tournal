import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/meetings.space.created',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

let isSigningIn = false;
// In-memory access token cache per workspace-integration skill requirement
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Workspace access token.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// 1. Google Keep API (Enterprise Workspace API + Structured Note/List Fetcher)
export async function fetchGoogleKeepNotes(): Promise<{
  notes: Array<{
    id: string;
    title: string;
    items: Array<{ text: string; checked: boolean }>;
  }>;
  enterpriseNotice?: string;
}> {
  const token = await getAccessToken();
  if (!token) throw new Error('AUTH_REQUIRED');

  const res = await fetch('https://keep.googleapis.com/v1/notes?pageSize=20', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    // Consumer @gmail.com accounts cannot authorize the Enterprise-only Keep API scope directly.
    return {
      notes: [],
      enterpriseNotice:
        'Google Keep REST API is restricted by Google to Workspace Enterprise domains with Admin delegation. Use the Google Tasks Live Sync below or paste/upload a Google Keep checklist export to import immediately.',
    };
  }

  const data = await res.json();
  const rawNotes = data.notes || [];
  return {
    notes: rawNotes.map((n: any) => ({
      id: n.name || String(Math.random()),
      title: n.title || 'Untitled Keep Note',
      items: n.body?.list?.listItems
        ? n.body.list.listItems.map((li: any) => ({
            text: li.text?.text || '',
            checked: Boolean(li.checked),
          }))
        : n.body?.text?.text
          ? n.body.text.text
              .split('\n')
              .filter(Boolean)
              .map((line: string) => ({ text: line, checked: false }))
          : [],
    })),
  };
}

// 2. Google Tasks API
export async function fetchGoogleTaskLists(): Promise<
  Array<{
    id: string;
    title: string;
    tasks: Array<{ id: string; title: string; notes?: string; completed: boolean; due?: string }>;
  }>
> {
  const token = await getAccessToken();
  if (!token) throw new Error('AUTH_REQUIRED');

  const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listsRes.ok) {
    const err = await listsRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to fetch Google Task lists');
  }
  const listsData = await listsRes.json();
  const taskLists = listsData.items || [];

  const detailed = await Promise.all(
    taskLists.slice(0, 5).map(async (list: any) => {
      const tasksRes = await fetch(
        `https://tasks.googleapis.com/tasks/v1/lists/${list.id}/tasks?showCompleted=true&maxResults=30`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const tasksData = tasksRes.ok ? await tasksRes.json() : { items: [] };
      return {
        id: list.id,
        title: list.title,
        tasks: (tasksData.items || [])
          .filter((t: any) => t.title && t.title.trim())
          .map((t: any) => ({
            id: t.id,
            title: t.title,
            notes: t.notes || '',
            completed: t.status === 'completed',
            due: t.due ? t.due.split('T')[0] : undefined,
          })),
      };
    })
  );

  return detailed;
}

export async function pushTaskToGoogleTasks(
  listId: string,
  title: string,
  notes: string,
  dueDateISO: string
): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('AUTH_REQUIRED');

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      notes,
      due: `${dueDateISO}T12:00:00.000Z`,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to create task in Google Tasks');
  }
}

// 3. Google Calendar API
export async function fetchGoogleCalendarEvents(dateISO: string): Promise<
  Array<{
    id: string;
    summary: string;
    startTime: string;
    endTime: string;
    htmlLink?: string;
  }>
> {
  const token = await getAccessToken();
  if (!token) throw new Error('AUTH_REQUIRED');

  const startOfDay = new Date(`${dateISO}T00:00:00`).toISOString();
  const endOfDay = new Date(`${dateISO}T23:59:59`).toISOString();

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    startOfDay
  )}&timeMax=${encodeURIComponent(endOfDay)}&singleEvents=true&orderBy=startTime`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to fetch Google Calendar events');
  }
  const data = await res.json();
  return (data.items || []).map((ev: any) => {
    const startRaw = ev.start?.dateTime || ev.start?.date || '';
    const endRaw = ev.end?.dateTime || ev.end?.date || '';
    const formatTime = (iso: string) => {
      if (!iso.includes('T')) return 'All Day';
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };
    return {
      id: ev.id,
      summary: ev.summary || '(Untitled Event)',
      startTime: formatTime(startRaw),
      endTime: formatTime(endRaw),
      htmlLink: ev.htmlLink,
    };
  });
}

export async function createGoogleCalendarTimeBlock(
  dateISO: string,
  title: string,
  notes: string,
  startTimeHHMM: string,
  durationMinutes: number
): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('AUTH_REQUIRED');

  const startDate = new Date(`${dateISO}T${startTimeHHMM || '09:00'}:00`);
  const endDate = new Date(startDate.getTime() + (durationMinutes || 30) * 60000);

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: `[Tournal] ${title}`,
        description: notes,
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to create Google Calendar event');
  }
  const data = await res.json();
  return data.htmlLink || '';
}

// 4. Gmail API (Fetch recent actionable messages)
export async function fetchRecentGmailMessages(): Promise<
  Array<{ id: string; subject: string; from: string; snippet: string }>
> {
  const token = await getAccessToken();
  if (!token) throw new Error('AUTH_REQUIRED');

  const listRes = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=6&q=is:inbox',
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!listRes.ok) {
    const err = await listRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to fetch Gmail messages');
  }
  const listData = await listRes.json();
  const messages = listData.messages || [];

  const details = await Promise.all(
    messages.map(async (m: any) => {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!msgRes.ok) return null;
      const msgData = await msgRes.json();
      const headers = msgData.payload?.headers || [];
      const subject =
        headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      return {
        id: m.id,
        subject,
        from: from.replace(/<.*>/, '').trim() || from,
        snippet: msgData.snippet || '',
      };
    })
  );

  return details.filter(Boolean) as Array<{
    id: string;
    subject: string;
    from: string;
    snippet: string;
  }>;
}

// 5. Google Contacts (People API)
export async function fetchGoogleContacts(): Promise<
  Array<{ resourceName: string; name: string; email: string }>
> {
  const token = await getAccessToken();
  if (!token) throw new Error('AUTH_REQUIRED');

  const res = await fetch(
    'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses&pageSize=25',
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to fetch Google Contacts');
  }
  const data = await res.json();
  return (data.connections || [])
    .map((c: any) => ({
      resourceName: c.resourceName,
      name: c.names?.[0]?.displayName || c.emailAddresses?.[0]?.value || 'Contact',
      email: c.emailAddresses?.[0]?.value || '',
    }))
    .filter((c: any) => c.name);
}

// 6. Google Meet API (Create instant meeting space for a task)
export async function createGoogleMeetSpace(): Promise<{
  meetingUri: string;
  meetingCode: string;
}> {
  const token = await getAccessToken();
  if (!token) throw new Error('AUTH_REQUIRED');

  const res = await fetch('https://meet.googleapis.com/v2/spaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to create Google Meet space');
  }
  const data = await res.json();
  return {
    meetingUri: data.meetingUri || '',
    meetingCode: data.meetingCode || '',
  };
}
