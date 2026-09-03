import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, deleteDoc, Firestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import defaultConfig from '../../firebase-applet-config.json';

export interface FirebaseConfigType {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  firestoreDatabaseId?: string;
  databaseId?: string;
}

export const SUPER_ADMIN_EMAIL = 'saifulalammasudmn@gmail.com';

function getActiveConfig(): { config: FirebaseConfigType; isCustom: boolean } {
  try {
    const custom = localStorage.getItem('custom_firebase_config');
    if (custom) {
      const parsed = JSON.parse(custom);
      if (parsed.apiKey && parsed.projectId) {
        return {
          config: {
            apiKey: parsed.apiKey,
            authDomain: parsed.authDomain || `${parsed.projectId}.firebaseapp.com`,
            projectId: parsed.projectId,
            storageBucket: parsed.storageBucket || `${parsed.projectId}.firebasestorage.app`,
            messagingSenderId: parsed.messagingSenderId || '',
            appId: parsed.appId || '',
            databaseId: parsed.databaseId || parsed.firestoreDatabaseId || '(default)'
          },
          isCustom: true
        };
      }
    }
  } catch (e) {
    console.warn('Error reading custom firebase config:', e);
  }

  return {
    config: {
      apiKey: defaultConfig.apiKey,
      authDomain: defaultConfig.authDomain,
      projectId: defaultConfig.projectId,
      storageBucket: defaultConfig.storageBucket,
      messagingSenderId: defaultConfig.messagingSenderId,
      appId: defaultConfig.appId,
      databaseId: defaultConfig.firestoreDatabaseId || '(default)'
    },
    isCustom: false
  };
}

const active = getActiveConfig();

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(active.config);
} else {
  app = getApp();
}

export const db: Firestore = getFirestore(app, active.config.databaseId || '(default)');
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export function isCustomFirebaseActive(): boolean {
  return getActiveConfig().isCustom;
}

export function getCurrentFirebaseInfo() {
  const current = getActiveConfig();
  return {
    projectId: current.config.projectId,
    authDomain: current.config.authDomain,
    isCustom: current.isCustom,
    adminEmail: SUPER_ADMIN_EMAIL,
    databaseId: current.config.databaseId || '(default)'
  };
}

export function saveCustomFirebaseConfig(configObj: FirebaseConfigType): boolean {
  try {
    if (!configObj.apiKey || !configObj.projectId) {
      throw new Error('API Key and Project ID are required');
    }
    localStorage.setItem('custom_firebase_config', JSON.stringify(configObj));
    return true;
  } catch (err) {
    console.error('Failed to save custom firebase config:', err);
    return false;
  }
}

export function resetToDefaultFirebase(): void {
  localStorage.removeItem('custom_firebase_config');
}

export async function testFirestoreConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
  const start = Date.now();
  try {
    const testDocRef = doc(db, '_connection_test', 'ping');
    await setDoc(testDocRef, { timestamp: new Date().toISOString(), ping: 'ok' }, { merge: true });
    const snap = await getDoc(testDocRef);
    const latency = Date.now() - start;
    if (snap.exists()) {
      return { success: true, message: `Connected successfully! (Latency: ${latency}ms)`, latencyMs: latency };
    }
    return { success: true, message: 'Connected to Firestore successfully.', latencyMs: latency };
  } catch (err: any) {
    console.error('Firestore connection test failed:', err);
    return { success: false, message: err?.message || 'Connection failed. Please verify API key & security rules.' };
  }
}

// Helper for Firestore Sync
export async function syncUserDataToFirestore(userId: string, data: any) {
  try {
    const docRef = doc(db, 'users', userId);
    await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error('Error syncing user data:', err);
  }
}

export async function getUserDataFromFirestore(userId: string) {
  try {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.error('Error getting user data:', err);
  }
  return null;
}

// Sync all app local data into Firestore for the current user
export async function syncAllLocalDataToFirestore(userEmail: string): Promise<{ success: boolean; count: number }> {
  const email = (userEmail || auth.currentUser?.email || '').trim().toLowerCase();
  if (!email || email.includes('guest')) {
    throw new Error('Please sign in with your account to sync data to the cloud.');
  }

  const keysToSync = [
    'todos',
    'notes',
    'habits',
    'subjects',
    'study_sessions',
    'study_assignments',
    'meetings',
    'resources',
    'interview_questions',
    'interview_tags',
    'study_roadmap_milestones',
    'passwords_list',
    'shortened_urls',
    'study_analytics',
    'user_profile',
    'notification_settings'
  ];

  const payload: Record<string, any> = {
    updatedAt: new Date().toISOString(),
    ownerEmail: email,
    lastSyncedBy: email
  };

  let count = 0;
  for (const key of keysToSync) {
    const item = localStorage.getItem(key);
    if (item) {
      try {
        payload[key] = JSON.parse(item);
        count++;
      } catch (e) {
        payload[key] = item;
      }
    }
  }

  try {
    const docRef = doc(db, 'user_data', email);
    await setDoc(docRef, payload, { merge: true });

    // Only update system admin metadata if this is the super admin
    if (email === SUPER_ADMIN_EMAIL.toLowerCase()) {
      const adminDocRef = doc(db, 'admin_metadata', 'system');
      await setDoc(adminDocRef, {
        superAdmin: SUPER_ADMIN_EMAIL,
        lastSyncTime: new Date().toISOString(),
        syncedKeys: Object.keys(payload)
      }, { merge: true });
    }

    return { success: true, count };
  } catch (err) {
    console.error('Error syncing local data to Firestore:', err);
    throw err;
  }
}

// Pull all cloud data from Firestore for the current user and populate localStorage
export async function fetchAllCloudDataToLocal(userEmail: string): Promise<{ success: boolean; count: number }> {
  const email = (userEmail || auth.currentUser?.email || '').trim().toLowerCase();
  if (!email || email.includes('guest')) {
    throw new Error('Please sign in with your account to pull data from the cloud.');
  }

  try {
    const docRef = doc(db, 'user_data', email);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      let count = 0;
      for (const [key, val] of Object.entries(data)) {
        if (key !== 'updatedAt' && key !== 'adminEmail' && key !== 'ownerEmail' && key !== 'lastSyncedBy') {
          localStorage.setItem(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
          count++;
        }
      }
      window.dispatchEvent(new Event('storage'));
      return { success: true, count };
    }
    return { success: true, count: 0 };
  } catch (err) {
    console.error('Error pulling cloud data:', err);
    throw err;
  }
}

export async function deleteCurrentUserData(userEmail?: string, userId?: string) {
  try {
    if (userEmail && !userEmail.includes('guest')) {
      const userDocRef = doc(db, 'user_data', userEmail);
      await deleteDoc(userDocRef);
    }
    if (userId) {
      const uRef = doc(db, 'users', userId);
      await deleteDoc(uRef);
    }

    localStorage.clear();
    sessionStorage.clear();
    console.log('User account data deleted successfully.');
    return true;
  } catch (err) {
    console.error('Error deleting user account data:', err);
    localStorage.clear();
    sessionStorage.clear();
    return false;
  }
}

export async function clearFullDatabase() {
  const collectionsToClear = [
    'users',
    'user_data',
    'admin_metadata',
    '_connection_test',
    'tasks',
    'habits',
    'notes',
    'todos',
    'interview_questions',
    'routines',
    'analytics',
    'short_urls',
    'passwords',
    'study_roadmap_milestones'
  ];

  try {
    for (const collName of collectionsToClear) {
      try {
        const snap = await getDocs(collection(db, collName));
        if (!snap.empty) {
          const deletePromises = snap.docs.map((d) => deleteDoc(doc(db, collName, d.id)));
          await Promise.all(deletePromises);
        }
      } catch (err) {
        console.warn(`Could not clear collection ${collName}:`, err);
      }
    }

    // Clear all client storage
    localStorage.clear();
    sessionStorage.clear();
    console.log('Full database and local storage cleared successfully.');
    return true;
  } catch (err) {
    console.error('Error clearing database:', err);
    localStorage.clear();
    sessionStorage.clear();
    return false;
  }
}


