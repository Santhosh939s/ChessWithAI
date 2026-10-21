import { doc, setDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
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
 */
export async function getRealMatchHistory(uid: string): Promise<MatchRecord[]> {
  if (!uid) return [];
  const db = getFirebaseDb();
  try {
    const q = query(
      collection(db, 'users', uid, 'matches'),
      orderBy('createdAt', 'desc'),
      limit(40)
    );
    const snap = await getDocs(q);
    const records: MatchRecord[] = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as any),
    }));
    if (typeof window !== 'undefined') {
      localStorage.setItem(`chess_matches_${uid}`, JSON.stringify(records));
    }
    return records;
  } catch (e) {
    console.warn('Failed to load match history from Firebase:', e);
    return getCachedMatchHistory(uid);
  }
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

  // 1. Write real match document to Firestore
  if (uid) {
    try {
      const db = getFirebaseDb();
      await setDoc(doc(db, 'users', uid, 'matches', matchId), fullRecord);
    } catch (e) {
      console.warn('Failed to save match to Firebase:', e);
    }
  }

  // 2. Update local cache
  if (typeof window !== 'undefined' && uid) {
    const cached = getCachedMatchHistory(uid);
    const updated = [fullRecord, ...cached].slice(0, 50);
    localStorage.setItem(`chess_matches_${uid}`, JSON.stringify(updated));
  }

  return fullRecord;
}
