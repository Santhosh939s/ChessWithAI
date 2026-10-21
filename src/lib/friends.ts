import { doc, setDoc, deleteDoc, collection, getDocs, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { compressUsername, type UserProfile } from './api';

export interface Friend {
  id: string;
  uid: string;
  username: string;
  userTag: string;
  avatar?: string;
  rating: number;
  status: 'online' | 'offline' | string;
  country?: string;
  addedAt?: number;
}

/**
 * Loads real friends from Firebase Firestore for the authenticated user.
 */
export async function getRealFriends(myUid: string): Promise<Friend[]> {
  if (!myUid) return [];
  const db = getFirebaseDb();
  try {
    const snap = await getDocs(collection(db, 'users', myUid, 'friends'));
    const friends: Friend[] = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as any),
    }));
    if (typeof window !== 'undefined') {
      localStorage.setItem(`chess_friends_${myUid}`, JSON.stringify(friends));
    }
    return friends;
  } catch (e) {
    console.warn('Failed to load friends from Firebase:', e);
    return getCachedFriends(myUid);
  }
}

/**
 * Reads locally cached real friends (for zero-latency render while network syncs).
 */
export function getCachedFriends(myUid?: string): Friend[] {
  if (!myUid || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`chess_friends_${myUid}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Adds a real registered player to the user's friends list in Firebase Firestore.
 */
export async function addRealFriend(myUid: string, friendProfile: UserProfile): Promise<Friend> {
  const db = getFirebaseDb();
  const friend: Friend = {
    id: friendProfile.uid,
    uid: friendProfile.uid,
    username: friendProfile.username,
    userTag: friendProfile.userTag || `#${friendProfile.uid.slice(-4).toUpperCase()}`,
    rating: friendProfile.rating ?? Math.min(1000, (friendProfile.wins || 0) * 30),
    status: 'Online',
    country: '🌐',
    addedAt: Date.now(),
  };

  // 1. Write to Firestore subcollection
  await setDoc(doc(db, 'users', myUid, 'friends', friend.uid), friend);

  // 2. Update local cache
  if (typeof window !== 'undefined') {
    const current = getCachedFriends(myUid);
    const updated = [friend, ...current.filter(f => f.uid !== friend.uid)];
    localStorage.setItem(`chess_friends_${myUid}`, JSON.stringify(updated));
  }
  return friend;
}

/**
 * Removes a friend from the user's friends list in Firebase Firestore.
 */
export async function removeRealFriend(myUid: string, friendUid: string): Promise<void> {
  const db = getFirebaseDb();
  try {
    await deleteDoc(doc(db, 'users', myUid, 'friends', friendUid));
  } catch (e) {
    console.warn('Failed to delete friend from Firebase:', e);
  }
  if (typeof window !== 'undefined') {
    const current = getCachedFriends(myUid);
    const updated = current.filter(f => f.uid !== friendUid && f.id !== friendUid);
    localStorage.setItem(`chess_friends_${myUid}`, JSON.stringify(updated));
  }
}

/**
 * Searches real registered users in Firebase by username or tag.
 */
export async function searchRealPlayers(queryStr: string, currentUid?: string): Promise<UserProfile[]> {
  const trimmed = queryStr.trim();
  if (!trimmed) return [];
  const db = getFirebaseDb();
  const compressed = compressUsername(trimmed);

  const results: UserProfile[] = [];

  // 1. Exact or compressed username lookup
  try {
    const snap = await getDoc(doc(db, 'usernames', compressed));
    if (snap.exists()) {
      const targetUid = snap.data().uid;
      if (targetUid !== currentUid) {
        const userDoc = await getDoc(doc(db, 'users', targetUid));
        if (userDoc.exists()) {
          results.push(userDoc.data() as UserProfile);
          return results;
        }
      }
    }
  } catch {}

  // 2. Scan recent registered users
  try {
    const qSnap = await getDocs(collection(db, 'users'));
    for (const d of qSnap.docs) {
      const data = d.data() as UserProfile;
      if (data.uid === currentUid) continue;
      if (
        data.username.toLowerCase().includes(trimmed.toLowerCase()) ||
        data.userTag?.toLowerCase().includes(trimmed.toLowerCase())
      ) {
        if (!results.find(r => r.uid === data.uid)) {
          results.push(data);
        }
      }
      if (results.length >= 8) break;
    }
  } catch {}

  return results;
}
