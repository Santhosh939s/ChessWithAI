/**
 * Chess Rules Configuration
 * Strips En Passant target square from FEN so pawns moving two squares forward
 * cannot be captured "en passant" into empty squares.
 */

import { Chess } from 'chess.js';

export function stripEnPassantFen(fen: string): string {
  if (!fen) return fen;
  const parts = fen.split(' ');
  if (parts.length >= 4 && parts[3] !== '-') {
    parts[3] = '-';
    return parts.join(' ');
  }
  return fen;
}

/**
 * Clears the en passant square directly on a Chess instance without wiping move history.
 */
export function clearEnPassant(chess: any): void {
  if (!chess) return;
  if ('_epSquare' in chess) {
    chess._epSquare = -1;
  }
}

/**
 * Creates a new Chess instance guaranteed to have en passant disabled.
 */
export function createCleanChess(fen?: string): Chess {
  const c = new Chess(fen ? stripEnPassantFen(fen) : undefined);
  clearEnPassant(c);
  return c;
}
