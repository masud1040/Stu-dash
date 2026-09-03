import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

export const USER_DATA_MODULE_KEYS = [
  'todos',
  'notes',
  'habits',
  'subjects',
  'study_sessions',
  'study_assignments',
  'meetings',
  'resources',
  'study_roadmap_milestones',
  'interview_questions',
  'interview_tags',
  'class_routine',
  'student_cv',
  'passwords_list',
  'study_analytics',
  'notification_settings'
];

export function getDefaultDataForKey(key: string): any {
  switch (key) {
    case 'todos':
    case 'notes':
    case 'habits':
    case 'subjects':
    case 'study_sessions':
    case 'study_assignments':
    case 'meetings':
    case 'resources':
    case 'passwords_list':
      return [];
    case 'interview_tags':
      return ['General', 'Technical', 'Behavioral', 'HR'];
    case 'class_routine':
      return '';
    case 'student_cv':
      return null;
    default:
      return null;
  }
}

// Safely resolve the active user's email. Never defaults to any admin email!
export function resolveTargetEmail(email?: string): string {
  if (email && typeof email === 'string' && !email.includes('guest') && email.includes('@')) {
    return email.trim().toLowerCase();
  }
  if (auth.currentUser?.email) {
    return auth.currentUser.email.trim().toLowerCase();
  }
  try {
    const storedUser = localStorage.getItem('student_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      if (parsed?.email && !parsed.email.includes('guest') && parsed.email.includes('@')) {
        return parsed.email.trim().toLowerCase();
      }
    }
  } catch (e) {}
  return 'guest';
}

// Load a specific user's isolated data from Firestore into their active local session
export async function loadUserDataForUser(userEmail: string): Promise<void> {
  if (!userEmail || userEmail.includes('guest')) return;
  const targetEmail = userEmail.trim().toLowerCase();

  const previousActive = localStorage.getItem('active_user_email');
  if (previousActive && previousActive !== targetEmail) {
    // Account switched: clean out previous user's private data first
    for (const key of USER_DATA_MODULE_KEYS) {
      localStorage.removeItem(key);
    }
  }
  localStorage.setItem('active_user_email', targetEmail);

  if (!auth.currentUser) {
    // If not authenticated in Firebase SDK yet, do not query Firestore
    return;
  }

  try {
    const docRef = doc(db, 'user_data', targetEmail);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      for (const key of USER_DATA_MODULE_KEYS) {
        if (data[key] !== undefined) {
          localStorage.setItem(
            key,
            typeof data[key] === 'object' ? JSON.stringify(data[key]) : String(data[key])
          );
        } else {
          const defaultVal = getDefaultDataForKey(key);
          if (defaultVal !== null) {
            localStorage.setItem(key, JSON.stringify(defaultVal));
          }
        }
      }
    } else {
      // Brand new user in Firestore: initialize with clean empty states
      for (const key of USER_DATA_MODULE_KEYS) {
        const defaultVal = getDefaultDataForKey(key);
        if (defaultVal !== null) {
          localStorage.setItem(key, JSON.stringify(defaultVal));
        }
      }
      // Create initial user doc so Firestore is aware of this user
      await setDoc(
        docRef,
        {
          ownerEmail: targetEmail,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    }
    window.dispatchEvent(new Event('storage'));
  } catch (err: any) {
    console.warn(`Firestore user data load notice for ${targetEmail}:`, err?.message || err);
  }
}

// Clear all active user data from localStorage on logout so no data leaks to next user
export function clearUserLocalData(): void {
  localStorage.removeItem('active_user_email');
  for (const key of USER_DATA_MODULE_KEYS) {
    localStorage.removeItem(key);
  }
  window.dispatchEvent(new Event('storage'));
}

export async function fetchCloudData(email: string, key: string, defaultValue: any) {
  const local = localStorage.getItem(key);
  let localData = defaultValue;
  if (local) {
    try {
      localData = JSON.parse(local);
    } catch (e) {
      localData = local;
    }
  }

  const targetEmail = resolveTargetEmail(email);
  if (!auth.currentUser || !targetEmail || targetEmail === 'guest') {
    return localData;
  }

  try {
    const docRef = doc(db, 'user_data', targetEmail);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data[key] !== undefined) {
        localStorage.setItem(
          key,
          typeof data[key] === 'object' ? JSON.stringify(data[key]) : String(data[key])
        );
        return data[key];
      }
    }
  } catch (err: any) {
    console.warn(`Firestore read notice for ${key}:`, err?.message || err);
  }
  return localData;
}

export async function saveCloudData(email: string, key: string, value: any) {
  // 1. Save to localStorage immediately for responsive UI
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.warn(`Local storage save error for ${key}:`, e);
  }

  // 2. Resolve target email
  const targetEmail = resolveTargetEmail(email);

  // 3. Guest users never write to Firestore
  if (!auth.currentUser || !targetEmail || targetEmail === 'guest') {
    return;
  }

  // 4. Save to Firestore under the user's isolated document
  try {
    const docRef = doc(db, 'user_data', targetEmail);
    await setDoc(
      docRef,
      {
        [key]: value,
        ownerEmail: targetEmail,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.warn(`Firestore permissions notice for ${key}: Data preserved in local storage.`);
    } else {
      console.error(`Error saving ${key} to Firestore:`, err);
    }
  }
}
