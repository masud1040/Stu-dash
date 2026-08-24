import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import config from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
  databaseId: config.firestoreDatabaseId || '(default)'
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, config.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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

export async function clearFullDatabase() {
  try {
    // Clear 'users' collection
    const usersSnap = await getDocs(collection(db, 'users'));
    const userDeletes = usersSnap.docs.map((d) => deleteDoc(doc(db, 'users', d.id)));
    await Promise.all(userDeletes);

    // Clear 'user_data' collection
    const userDataSnap = await getDocs(collection(db, 'user_data'));
    const dataDeletes = userDataSnap.docs.map((d) => deleteDoc(doc(db, 'user_data', d.id)));
    await Promise.all(dataDeletes);

    // Clear local storage
    localStorage.clear();
    console.log('Full database and local storage cleared successfully.');
    return true;
  } catch (err) {
    console.error('Error clearing database:', err);
    localStorage.clear();
    return false;
  }
}

