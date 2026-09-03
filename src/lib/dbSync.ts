import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth, SUPER_ADMIN_EMAIL } from './firebase';

export async function fetchCloudData(email: string, key: string, defaultValue: any) {
  // Always check localStorage first for instantaneous load
  const local = localStorage.getItem(key);
  let localData = defaultValue;
  if (local) {
    try {
      localData = JSON.parse(local);
    } catch (e) {
      localData = local;
    }
  }

  // Resolve target user email
  let targetEmail = auth.currentUser?.email || email;
  if (!targetEmail || targetEmail.includes('guest')) {
    const storedUser = localStorage.getItem('student_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed?.email && !parsed.email.includes('guest')) {
          targetEmail = parsed.email;
        }
      } catch (e) {}
    }
  }

  // If user is not authenticated in Firebase or is in guest mode, use local storage safely
  if (!auth.currentUser || !targetEmail || targetEmail.includes('guest')) {
    return localData;
  }

  try {
    const docRef = doc(db, 'user_data', targetEmail);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data[key] !== undefined) {
        localStorage.setItem(key, typeof data[key] === 'object' ? JSON.stringify(data[key]) : String(data[key]));
        return data[key];
      }
    }
  } catch (err: any) {
    console.warn(`Firestore read fallback for ${key}:`, err?.message || err);
  }
  return localData;
}

export async function saveCloudData(email: string, key: string, value: any) {
  // 1. Always save to localStorage for instant UI updates and offline resilience
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.warn(`Local storage save error for ${key}:`, e);
  }

  // 2. Resolve target email
  let targetEmail = auth.currentUser?.email || email;
  if (!targetEmail || targetEmail.includes('guest')) {
    const storedUser = localStorage.getItem('student_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed?.email && !parsed.email.includes('guest')) {
          targetEmail = parsed.email;
        }
      } catch (e) {}
    }
  }

  // 3. Only sync to Firestore if the user is authenticated with Firebase and has a valid account
  if (!auth.currentUser || !targetEmail || targetEmail.includes('guest')) {
    return;
  }

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


