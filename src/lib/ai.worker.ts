import { Chess } from 'chess.js';
import { getAIMove } from './chessAI';

self.onmessage = (e: MessageEvent<{ fen: string; depth: number }>) => {
  const { fen, depth } = e.data;
  try {
    const chess = new Chess(fen);
    const move = getAIMove(chess, depth);
    self.postMessage({ success: true, move });
  } catch (err: any) {
    self.postMessage({ success: false, error: err?.message || 'AI computation failed' });
  }
};
