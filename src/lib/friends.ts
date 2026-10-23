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
 * Merges root user document friends list, subcollection friends, and local cache.
 */
export async function getRealFriends(myUid: string): Promise<Friend[]> {
  if (!myUid) return [];
  const db = getFirebaseDb();
  const friendsMap = new Map<string, Friend>();

  // 1. Load from local cache for instant zero-latency baseline
  const cached = getCachedFriends(myUid);
  for (const f of cached) {
    const id = f?.uid || f?.id;
    if (id) friendsMap.set(id, f);
  }

  // 2. Load from root user document (users/{myUid}.friends array)
  try {
    const userSnap = await getDoc(doc(db, 'users', myUid));
    if (userSnap.exists()) {
      const data = userSnap.data();
      if (Array.isArray(data.friends)) {
        for (const item of data.friends) {
          const uid = item?.uid || item?.id;
          if (uid) {
            friendsMap.set(uid, {
              id: uid,
              uid,
              username: item.username || 'Player',
              userTag: item.userTag || `#${uid.slice(-4).toUpperCase()}`,
              rating: item.rating ?? 0,
              status: item.status || 'Online',
              country: item.country || '🌐',
              addedAt: item.addedAt || Date.now(),
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('Friends root document read warning:', e);
  }

  // 3. Load from subcollection users/{myUid}/friends (if rules permit)
  try {
    const snap = await getDocs(collection(db, 'users', myUid, 'friends'));
    for (const d of snap.docs) {
      const data = d.data() as any;
      const uid = data?.uid || d.id;
      if (uid) {
        friendsMap.set(uid, {
          id: uid,
          uid,
          username: data.username || 'Player',
          userTag: data.userTag || `#${uid.slice(-4).toUpperCase()}`,
          rating: data.rating ?? 0,
          status: data.status || 'Online',
          country: data.country || '🌐',
          addedAt: data.addedAt || Date.now(),
        });
      }
    }
  } catch (e) {
    console.warn('Friends subcollection read warning:', e);
  }

  const friends = Array.from(friendsMap.values());

  // Dynamically check online status based on recent heartbeat
  try {
    await Promise.all(
      friends.slice(0, 15).map(async (f) => {
        try {
          const uSnap = await getDoc(doc(db, 'users', f.uid));
          if (uSnap.exists()) {
            const uData = uSnap.data();
            const lastActive = uData.lastActive || 0;
            const isOnline = Date.now() - lastActive < 75000;
            f.status = isOnline ? 'Online' : 'Offline';
            if (uData.rating !== undefined) f.rating = uData.rating;
          }
        } catch {}
      })
    );
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`chess_friends_${myUid}`, JSON.stringify(friends));
    } catch {}
  }
  return friends;
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
 * Saves to local cache, user document, and subcollection with graceful fallbacks.
 */
export async function addRealFriend(myUid: string, friendProfile: UserProfile): Promise<Friend> {
  const friendUid = friendProfile.uid || (friendProfile as any).id;
  if (!friendUid) {
    throw new Error('Invalid player: missing UID');
  }

  const friend: Friend = {
    id: friendUid,
    uid: friendUid,
    username: friendProfile.username || 'Player',
    userTag: friendProfile.userTag || `#${friendUid.slice(-4).toUpperCase()}`,
    rating: friendProfile.rating ?? Math.min(1000, (friendProfile.wins || 0) * 30),
    status: 'Online',
    country: '🌐',
    addedAt: Date.now(),
  };

  // 1. Immediately update local storage so user UI updates with 0 lag
  const current = getCachedFriends(myUid);
  const updated = [friend, ...current.filter(f => (f.uid || f.id) !== friendUid)];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`chess_friends_${myUid}`, JSON.stringify(updated));
    } catch {}
  }

  // 2. Persist to Firestore:
  const db = getFirebaseDb();

  // Save to root user document: users/{myUid}.friends
  // (Succeeds under default `match /users/{uid} { allow write: if request.auth.uid == uid }`)
  try {
    await setDoc(doc(db, 'users', myUid), {
      friends: updated,
    }, { merge: true });
  } catch (err) {
    console.warn('Saving friends array to user document failed:', err);
  }

  // 3. Also try writing to subcollection: users/{myUid}/friends/{friendUid}
  try {
    await setDoc(doc(db, 'users', myUid, 'friends', friendUid), friend);
  } catch (err) {
    console.warn('Saving friend to subcollection failed (may require recursive rules):', err);
  }

  return friend;
}

/**
 * Removes a friend from the user's friends list in Firebase Firestore.
 */
export async function removeRealFriend(myUid: string, friendUid: string): Promise<void> {
  const current = getCachedFriends(myUid);
  const updated = current.filter(f => (f.uid || f.id) !== friendUid);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`chess_friends_${myUid}`, JSON.stringify(updated));
    } catch {}
  }

  const db = getFirebaseDb();
  // 1. Update user document
  try {
    await setDoc(doc(db, 'users', myUid), {
      friends: updated,
    }, { merge: true });
  } catch (e) {
    console.warn('Failed to update friends list in user document:', e);
  }

  // 2. Try delete from subcollection
  try {
    await deleteDoc(doc(db, 'users', myUid, 'friends', friendUid));
  } catch (e) {
    console.warn('Failed to delete friend from subcollection:', e);
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
  const seenUids = new Set<string>();
  if (currentUid) seenUids.add(currentUid);

  // 1. Exact or compressed username lookup
  try {
    const snap = await getDoc(doc(db, 'usernames', compressed));
    if (snap.exists()) {
      const targetUid = snap.data().uid;
      if (targetUid && !seenUids.has(targetUid)) {
        seenUids.add(targetUid);
        const userDoc = await getDoc(doc(db, 'users', targetUid));
        if (userDoc.exists()) {
          const uData = userDoc.data();
          const uid = targetUid;
          results.push({
            uid,
            username: uData.username || snap.data().username || trimmed,
            userTag: uData.userTag || `#${uid.slice(-4).toUpperCase()}`,
            email: uData.email || '',
            rating: uData.rating ?? 0,
            wins: uData.wins || 0,
            losses: uData.losses || 0,
            draws: uData.draws || 0,
            gamesPlayed: uData.gamesPlayed || 0,
            createdAt: uData.createdAt || '',
          });
          return results;
        }
      }
    }
  } catch (e) {
    console.warn('Exact username search warning:', e);
  }

  // 2. Scan recent registered users
  try {
    const qSnap = await getDocs(collection(db, 'users'));
    for (const d of qSnap.docs) {
      const data = d.data();
      const uid = data.uid || d.id;
      if (!uid || seenUids.has(uid)) continue;

      const username = (data.username || '').toString();
      const userTag = (data.userTag || `#${uid.slice(-4).toUpperCase()}`).toString();

      if (
        username.toLowerCase().includes(trimmed.toLowerCase()) ||
        userTag.toLowerCase().includes(trimmed.toLowerCase())
      ) {
        seenUids.add(uid);
        results.push({
          uid,
          username,
          userTag,
          email: data.email || '',
          rating: data.rating ?? 0,
          wins: data.wins || 0,
          losses: data.losses || 0,
          draws: data.draws || 0,
          gamesPlayed: data.gamesPlayed || 0,
          createdAt: data.createdAt || '',
        });
      }
      if (results.length >= 10) break;
    }
  } catch (e) {
    console.warn('Scan users search warning:', e);
  }

  return results;
}
