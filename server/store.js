import { defaultProfile } from './data.js';

const memory = new Map();
async function firestore() {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) return null;
  const { getFirestore } = await import('firebase-admin/firestore');
  return getFirestore();
}
export async function getProfile(id = 'demo') {
  const db = await firestore();
  if (!db) return structuredClone(memory.get(id) || defaultProfile);
  const snap = await db.collection('profiles').doc(id).get();
  return snap.exists ? { ...defaultProfile, ...snap.data() } : structuredClone(defaultProfile);
}
export async function saveProfile(id = 'demo', profile) {
  const db = await firestore();
  if (!db) { memory.set(id, structuredClone(profile)); return; }
  await db.collection('profiles').doc(id).set(profile, { merge: true });
}
