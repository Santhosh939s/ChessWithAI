import { doc, setDoc, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';

export interface MatchRecord {
  id: string;
  opponent: string;
  opponentType: 'ai' | 'player';
  opponentRating: number;
  result: 'win' | 'loss' | 'draw';
  deltaScore: number;
  movesCount: number;
  date: string;
  createdAt: number;
  fen?: string;
  gameType?: 'rapid' | 'blitz' | 'bullet' | 'ai';
}

/**
 * Loads real match history from Firebase Firestore for the authenticated user.
 * Merges root user document recent matches, subcollection records, and local cache.
 */
export async function getRealMatchHistory(uid: string): Promise<MatchRecord[]> {
  if (!uid) return [];
  const db = getFirebaseDb();
  const matchMap = new Map<string, MatchRecord>();

  // 1. Local cache baseline
  const cached = getCachedMatchHistory(uid);
  for (const m of cached) {
    if (m?.id) matchMap.set(m.id, m);
  }

  // 2. Load from root user document (users/{uid}.recentMatches)
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (Array.isArray(data.recentMatches)) {
        for (const m of data.recentMatches) {
          if (m?.id) matchMap.set(m.id, m);
        }
      }
    }
  } catch (e) {
    console.warn('Recent matches root document read warning:', e);
  }

  // 3. Load from subcollection users/{uid}/matches (if rules permit)
  try {
    const q = query(
      collection(db, 'users', uid, 'matches'),
      orderBy('createdAt', 'desc'),
      limit(40)
    );
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const m = { id: d.id, ...(d.data() as any) } as MatchRecord;
      if (m?.id) matchMap.set(m.id, m);
    }
  } catch (e) {
    console.warn('Matches subcollection read warning:', e);
  }

  const sorted = Array.from(matchMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`chess_matches_${uid}`, JSON.stringify(sorted));
    } catch {}
  }
  return sorted;
}

/**
 * Reads locally cached real match history for fast zero-latency rendering.
 */
export function getCachedMatchHistory(uid?: string): MatchRecord[] {
  if (!uid || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`chess_matches_${uid}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Saves an authentic, completed game to the user's match history in Firebase Firestore.
 */
export async function saveRealMatchRecord(
  uid: string,
  record: Omit<MatchRecord, 'id' | 'createdAt' | 'date'>
): Promise<MatchRecord> {
  const matchId = `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = Date.now();
  const dateFormatted = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const fullRecord: MatchRecord = {
    ...record,
    id: matchId,
    createdAt: now,
    date: dateFormatted,
  };

  // 1. Immediately update local cache
  if (typeof window !== 'undefined' && uid) {
    const cached = getCachedMatchHistory(uid);
    const updated = [fullRecord, ...cached.filter(m => m.id !== matchId)].slice(0, 50);
    try {
      localStorage.setItem(`chess_matches_${uid}`, JSON.stringify(updated));
    } catch {}
  }

  if (uid) {
    const db = getFirebaseDb();
    const current = getCachedMatchHistory(uid);

    // 2. Persist to root user document: users/{uid}.recentMatches
    try {
      await setDoc(doc(db, 'users', uid), {
        recentMatches: current.slice(0, 30),
      }, { merge: true });
    } catch (e) {
      console.warn('Failed to save match to user document:', e);
    }

    // 3. Also try subcollection: users/{uid}/matches/{matchId}
    try {
      await setDoc(doc(db, 'users', uid, 'matches', matchId), fullRecord);
    } catch (e) {
      console.warn('Failed to save match to subcollection:', e);
    }
  }

  return fullRecord;
}
