export interface ChessPuzzle {
  id: string;
  title: string;
  rating: number;
  description: string;
  fen: string;
  solution: { from: string; to: string }[];
  hint: string;
}

export const PUZZLES: ChessPuzzle[] = [
  {
    id: 'p1',
    title: 'Back-Rank Decoy',
    rating: 493,
    description: 'White to move and deliver checkmate in 1 move.',
    fen: '6k1/5ppp/8/8/8/8/8/1R4K1 w - - 0 1',
    solution: [{ from: 'b1', to: 'b8' }],
    hint: 'Look for the unprotected back rank!',
  },
  {
    id: 'p2',
    title: 'Queen Strike',
    rating: 520,
    description: 'White to move and deliver checkmate.',
    fen: 'r1bqk2r/pppp1ppp/2n5/2b1p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5',
    solution: [{ from: 'c4', to: 'f7' }],
    hint: 'Target the weakest square f7!',
  },
  {
    id: 'p3',
    title: 'Royal Knight Fork',
    rating: 610,
    description: 'White to move: Win material by forking King and Queen.',
    fen: 'r1bqk2r/ppppbppp/2n5/4p3/2B1N3/5Q2/PPPP1PPP/RNB1K2R w KQkq - 0 6',
    solution: [{ from: 'f3', to: 'f7' }],
    hint: 'Is there a coordinated double attack on the King?',
  },
  {
    id: 'p4',
    title: 'Smothered Mate Tactic',
    rating: 740,
    description: 'White to move and trap the enemy King.',
    fen: '6k1/5p1p/6p1/8/8/5N2/8/6K1 w - - 0 1',
    solution: [{ from: 'f3', to: 'e5' }],
    hint: 'Centralize your Knight to dominate key squares.',
  },
];

const PUZZLE_STORAGE_KEY = 'chess_puzzle_index';

export function getPuzzleIndex(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(PUZZLE_STORAGE_KEY);
    return raw ? parseInt(raw, 10) % PUZZLES.length : 0;
  } catch {
    return 0;
  }
}

export function advancePuzzle(): number {
  const current = getPuzzleIndex();
  const next = (current + 1) % PUZZLES.length;
  if (typeof window !== 'undefined') {
    localStorage.setItem(PUZZLE_STORAGE_KEY, next.toString());
  }
  return next;
}
