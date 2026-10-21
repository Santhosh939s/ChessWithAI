'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { Chess, type Square } from 'chess.js';
import ChessPiece from './ChessPiece';
import PromotionModal from './PromotionModal';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];

interface Props {
  fen?: string;
  playerColor: 'w' | 'b'; // which side the user controls
  onMove?: (move: any) => void; // called when a move is made
  disabled?: boolean;
  lastMove?: { from: string; to: string } | null;
  checkSquare?: string | null;
}

function ChessBoard({ fen, playerColor, onMove, disabled = false, lastMove, checkSquare }: Props) {
  const chess = useMemo(() => new Chess(fen ?? undefined), [fen]);
  const [selected, setSelected] = useState<string | null>(null);
  const [legalSquares, setLegalSquares] = useState<string[]>([]);
  const [legalCaptures, setLegalCaptures] = useState<string[]>([]);
  const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null);

  const computeLegal = useCallback((sq: string) => {
    const moves = chess.moves({ square: sq as Square, verbose: true });
    const targets = moves.map(m => m.to);
    const captures = moves.filter(m => m.flags.includes('c') || m.flags.includes('e')).map(m => m.to);
    setLegalSquares(targets);
    setLegalCaptures(captures);
  }, [chess]);

  const selectSquare = useCallback((sq: string) => {
    if (disabled) return;

    const piece = chess.get(sq as Square);

    // If a square is already selected
    if (selected) {
      // Try to make a move
      if (legalSquares.includes(sq) || legalCaptures.includes(sq)) {
        // Check if promotion
        const move = chess.moves({ verbose: true }).find(
          (m: any) => m.from === selected && m.to === sq
        );
        if (move && move.promotion !== undefined) {
          setPromotion({ from: selected, to: sq });
          return;
        }
        // Execute move
        const result = chess.move({ from: selected, to: sq });
        if (result) {
          onMove?.(result);
          setSelected(null);
          setLegalSquares([]);
          setLegalCaptures([]);
        }
        return;
      }

      // Re-select own piece
      if (piece && piece.color === playerColor && chess.turn() === playerColor) {
        setSelected(sq);
        computeLegal(sq);
        return;
      }

      // Deselect
      setSelected(null);
      setLegalSquares([]);
      setLegalCaptures([]);
      return;
    }

    // Fresh selection — must be own piece on own turn
    if (piece && piece.color === playerColor && chess.turn() === playerColor) {
      setSelected(sq);
      computeLegal(sq);
    }
  }, [chess, selected, legalSquares, legalCaptures, playerColor, disabled, onMove, computeLegal]);

  function handlePromotion(piece: string) {
    if (!promotion) return;
    const result = chess.move({ from: promotion.from, to: promotion.to, promotion: piece });
    if (result) onMove?.(result);
    setPromotion(null);
    setSelected(null);
    setLegalSquares([]);
    setLegalCaptures([]);
  }

  // Flip board if player is black
  const ranks = playerColor === 'b' ? [...RANKS].reverse() : RANKS;
  const files = playerColor === 'b' ? [...FILES].reverse() : FILES;

  const board = chess.board();

  return (
    <>
      <div className="board-wrapper">
        <div className="board-container">
          <div className="board-grid">
            {ranks.map((rank, ri) =>
              files.map((file, fi) => {
                const sq = `${file}${rank}`;
                const isLight = (ri + fi) % 2 === 0;
                const rankIdx = 8 - parseInt(rank);
                const fileIdx = file.charCodeAt(0) - 97;
                const piece = board[rankIdx]?.[fileIdx];

                const isSelected = selected === sq;
                const isLegal = legalSquares.includes(sq);
                const isCapture = legalCaptures.includes(sq);
                const isLastFrom = lastMove?.from === sq;
                const isLastTo = lastMove?.to === sq;
                const isCheck = checkSquare === sq;

                // Show coordinates inside boundary squares like Chess.com
                const showRankLabel = fi === 0;
                const showFileLabel = ri === 7;

                let squareClass = `square ${isLight ? 'light' : 'dark'}`;
                if (isSelected) squareClass += ' selected';
                if (isCheck) squareClass += ' in-check';
                else if (isLastFrom) squareClass += ' last-move-from';
                else if (isLastTo)   squareClass += ' last-move-to';
                if (isLegal && !isCapture) squareClass += ' legal-move';
                if (isCapture)             squareClass += ' legal-capture';

                return (
                  <div
                    key={sq}
                    id={`sq-${sq}`}
                    className={squareClass}
                    onClick={() => selectSquare(sq)}
                    role="button"
                    aria-label={sq}
                  >
                    {/* Corner Rank Label */}
                    {showRankLabel && (
                      <span className={`sq-coord sq-rank ${isLight ? 'dark-text' : 'light-text'}`}>
                        {rank}
                      </span>
                    )}

                    {/* Corner File Label */}
                    {showFileLabel && (
                      <span className={`sq-coord sq-file ${isLight ? 'dark-text' : 'light-text'}`}>
                        {file}
                      </span>
                    )}

                    {piece && (
                      <ChessPiece
                        type={piece.type}
                        color={piece.color}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {promotion && (
        <PromotionModal color={playerColor} onSelect={handlePromotion} />
      )}
    </>
  );
}

// Memoize ChessBoard with custom comparator: only re-render when actual board state changes.
// Clocks ticking, parent timer updates, and unrelated parent state changes will NOT re-render the board.
export default React.memo(ChessBoard, (prev, next) => {
  return (
    prev.fen === next.fen &&
    prev.playerColor === next.playerColor &&
    prev.disabled === next.disabled &&
    prev.checkSquare === next.checkSquare &&
    prev.lastMove?.from === next.lastMove?.from &&
    prev.lastMove?.to === next.lastMove?.to
  );
});
