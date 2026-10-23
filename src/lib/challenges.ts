import { doc, setDoc, deleteDoc, updateDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import type { UserProfile } from './api';
import type { Friend } from './friends';

export interface FriendChallenge {
  id: string; // e.g. `challenge_${targetUid}`
  challengerUid: string;
  challengerName: string;
  challengerTag: string;
  challengerRating: number;
  challengerPeerId: string;
  targetUid: string;
  targetName: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  createdAt: number;
}

/**
 * Sends a real-time challenge to a friend.
 * Uses `matchmaking_queue` collection which is already permitted in Firestore rules.
 */
export async function sendFriendChallenge(
  challenger: UserProfile,
  targetFriend: Friend,
  peerId: string
): Promise<string> {
  const db = getFirebaseDb();
  const challengeId = `challenge_${targetFriend.uid}`;
  const challengeDocRef = doc(db, 'matchmaking_queue', challengeId);

  const challengeData: FriendChallenge = {
    id: challengeId,
    challengerUid: challenger.uid,
    challengerName: challenger.username,
    challengerTag: challenger.userTag || `#${challenger.uid.slice(-4).toUpperCase()}`,
    challengerRating: challenger.rating ?? 0,
    challengerPeerId: peerId,
    targetUid: targetFriend.uid,
    targetName: targetFriend.username,
    status: 'pending',
    createdAt: Date.now(),
  };

  await setDoc(challengeDocRef, challengeData);
  return challengeId;
}

/**
 * Listens for state changes on an outgoing challenge (sent by me).
 */
export function listenToOutgoingChallenge(
  challengeId: string,
  onUpdate: (challenge: FriendChallenge) => void
): () => void {
  const db = getFirebaseDb();
  const challengeDocRef = doc(db, 'matchmaking_queue', challengeId);

  return onSnapshot(challengeDocRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data() as FriendChallenge;
      onUpdate(data);
    }
  }, (err) => {
    console.warn('Outgoing challenge listener warning:', err);
  });
}

/**
 * Listens for incoming challenges targeted at the logged-in user.
 */
export function listenToIncomingChallenges(
  myUid: string,
  onChallenge: (challenge: FriendChallenge | null) => void
): () => void {
  if (!myUid) return () => {};
  const db = getFirebaseDb();
  const challengeId = `challenge_${myUid}`;
  const challengeDocRef = doc(db, 'matchmaking_queue', challengeId);

  return onSnapshot(challengeDocRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data() as FriendChallenge;
      const age = Date.now() - (data.createdAt || 0);

      // Only process active pending challenges younger than 40 seconds
      if (data.status === 'pending' && age < 40000) {
        onChallenge(data);
        return;
      }
    }
    onChallenge(null);
  }, (err) => {
    console.warn('Incoming challenge listener warning:', err);
  });
}

/**
 * Responds to an incoming challenge (Accept or Decline).
 */
export async function respondToChallenge(
  challengeId: string,
  accept: boolean
): Promise<void> {
  const db = getFirebaseDb();
  const challengeDocRef = doc(db, 'matchmaking_queue', challengeId);
  try {
    await updateDoc(challengeDocRef, {
      status: accept ? 'accepted' : 'declined',
      respondedAt: Date.now(),
    });
  } catch (err) {
    console.warn('Failed to update challenge response:', err);
  }
}

/**
 * Cancels or clears a challenge document.
 */
export async function clearChallenge(challengeId: string): Promise<void> {
  const db = getFirebaseDb();
  const challengeDocRef = doc(db, 'matchmaking_queue', challengeId);
  try {
    await deleteDoc(challengeDocRef);
  } catch {}
}

export async function cancelFriendChallenge(challengeId: string): Promise<void> {
  return clearChallenge(challengeId);
}

/**
 * Optional subtle sound notification when an incoming challenge arrives.
 */
export function playChallengeNotificationChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.15); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(440.0, now);
    osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  } catch {}
}
