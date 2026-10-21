export interface MatchRecord {
  id: string;
  opponent: string;
  opponentType: 'ai' | 'player';
  opponentRating: number;
  opponentAvatar?: string;
  result: 'win' | 'loss' | 'draw';
  deltaScore: number;
  movesCount: number;
  date: string;
  fen?: string;
  gameType?: 'rapid' | 'blitz' | 'bullet' | 'ai';
}

const DEFAULT_HISTORY: MatchRecord[] = [
  {
    id: 'h1',
    opponent: 'Wally',
    opponentType: 'ai',
    opponentRating: 1800,
    result: 'loss',
    deltaScore: -12,
    movesCount: 28,
    date: 'Today',
    gameType: 'ai',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
  },
  {
    id: 'h2',
    opponent: 'jonaspld',
    opponentType: 'player',
    opponentRating: 275,
    result: 'win',
    deltaScore: +30,
    movesCount: 22,
    date: 'Yesterday',
    gameType: 'rapid',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
  },
  {
    id: 'h3',
    opponent: 'IBO-KITB',
    opponentType: 'player',
    opponentRating: 292,
    result: 'win',
    deltaScore: +25,
    movesCount: 34,
    date: '2 days ago',
    gameType: 'rapid',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R b KQkq - 0 5',
  },
  {
    id: 'h4',
    opponent: 'MACHT_005',
    opponentType: 'player',
    opponentRating: 354,
    result: 'loss',
    deltaScore: -15,
    movesCount: 19,
    date: '3 days ago',
    gameType: 'rapid',
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5',
  },
];

const STORAGE_KEY = 'chess_match_history';

export function getMatchHistory(): MatchRecord[] {
  if (typeof window === 'undefined') return DEFAULT_HISTORY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_HISTORY));
      return DEFAULT_HISTORY;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_HISTORY;
  }
}

export function saveMatchRecord(record: Omit<MatchRecord, 'id' | 'date'>): MatchRecord {
  const current = getMatchHistory();
  const newRecord: MatchRecord = {
    ...record,
    id: `m_${Date.now()}`,
    date: 'Just now',
  };
  const updated = [newRecord, ...current].slice(0, 50); // keep last 50 matches
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return newRecord;
}
