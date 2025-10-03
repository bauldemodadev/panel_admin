import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDGhFCPg8TW6xBQ3XI6pHgFWvRSjTodJ0Y",
  authDomain: "bauldemoda-85feb.firebaseapp.com",
  projectId: "bauldemoda-85feb",
  storageBucket: "bauldemoda-85feb.firebasestorage.app",
  messagingSenderId: "490957367615",
  appId: "1:490957367615:web:c6cb468289e4377a9a0b8a",
  measurementId: "G-2FKCGF2Y4Z"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };

export async function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logoutFirebase() {
  return signOut(auth);
}

export function onAuthStateChangedFirebase(callback) {
  return onAuthStateChanged(auth, callback);
}

// Subir clientes iniciales a Firestore
export async function uploadInitialClientes(clientes) {
  const snapshot = await getDocs(collection(db, "clientes"));
  if (!snapshot.empty) return; // Ya existen clientes
  for (const cliente of clientes) {
    await addDoc(collection(db, "clientes"), cliente);
  }
} 