import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';

/**
 * Updates the user's heartbeat in Firestore so friends can see they are online.
 */
export async function updatePresenceHeartbeat(uid: string): Promise<void> {
  if (!uid) return;
  const db = getFirebaseDb();
  try {
    await setDoc(doc(db, 'users', uid), {
      lastActive: Date.now(),
      isOnline: true,
    }, { merge: true });
  } catch {}
}

/**
 * Checks whether a timestamp indicates the player is currently online (within 60 seconds).
 */
export function isUserOnline(lastActive?: number): boolean {
  if (!lastActive) return false;
  return Date.now() - lastActive < 60000;
}
