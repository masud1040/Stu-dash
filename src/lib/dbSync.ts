import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function fetchCloudData(email: string, key: string, defaultValue: any) {
  if (!email || email.includes('guest')) {
    const local = localStorage.getItem(key);
    return local ? JSON.parse(local) : defaultValue;
  }
  try {
    const docRef = doc(db, 'user_data', email);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data[key] !== undefined) {
        return data[key];
      }
    }
  } catch (err) {
    console.error(`Error fetching ${key} from Firestore:`, err);
  }
  const local = localStorage.getItem(key);
  return local ? JSON.parse(local) : defaultValue;
}

export async function saveCloudData(email: string, key: string, value: any) {
  // Always save to localStorage for offline access & fallback
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event('storage'));

  if (!email || email.includes('guest')) return;

  try {
    const docRef = doc(db, 'user_data', email);
    await setDoc(docRef, { [key]: value, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error(`Error saving ${key} to Firestore:`, err);
  }
}
