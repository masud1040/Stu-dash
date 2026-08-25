import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, SUPER_ADMIN_EMAIL } from './firebase';

export async function fetchCloudData(email: string, key: string, defaultValue: any) {
  const targetEmail = (!email || email.includes('guest')) ? SUPER_ADMIN_EMAIL : email;

  try {
    const docRef = doc(db, 'user_data', targetEmail);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data[key] !== undefined) {
        // Also keep local storage updated
        localStorage.setItem(key, typeof data[key] === 'object' ? JSON.stringify(data[key]) : String(data[key]));
        return data[key];
      }
    }
  } catch (err) {
    console.warn(`Firestore read fallback for ${key}:`, err);
  }
  const local = localStorage.getItem(key);
  return local ? JSON.parse(local) : defaultValue;
}

export async function saveCloudData(email: string, key: string, value: any) {
  // Always save to localStorage for offline access & instant UI updates
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event('storage'));

  const targetEmail = (!email || email.includes('guest')) ? SUPER_ADMIN_EMAIL : email;

  try {
    const docRef = doc(db, 'user_data', targetEmail);
    await setDoc(docRef, { [key]: value, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error(`Error saving ${key} to Firestore:`, err);
  }
}

