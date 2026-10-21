'use client';
import { useState, useCallback } from 'react';
import ChessBoard from './ChessBoard';
import { PUZZLES, getPuzzleIndex, advancePuzzle } from '@/lib/puzzles';

interface Props {
  onClose: () => void;
  onPuzzleSolved?: (ratingBonus: number) => void;
}

export default function PuzzleModal({ onClose, onPuzzleSolved }: Props) {
  const [currentIndex, setCurrentIndex] = useState(() => getPuzzleIndex());
  const puzzle = PUZZLES[currentIndex] || PUZZLES[0];

  const [fen, setFen] = useState(puzzle.fen);
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const resetPuzzle = useCallback((idx: number) => {
    const p = PUZZLES[idx] || PUZZLES[0];
    setFen(p.fen);
    setSolved(false);
    setFeedback(null);
    setShowHint(false);
  }, []);

  const handleMove = useCallback((move: any) => {
    if (solved) return;
    const expected = puzzle.solution[0];
    if (move.from === expected.from && move.to === expected.to) {
      setSolved(true);
      setFeedback('🎉 Brilliant! Puzzle solved! (+15 Rating)');
      onPuzzleSolved?.(15);
    } else {
      setFeedback('❌ Not quite the right move. Try again!');
      // Reset position after short delay so user can retry
      setTimeout(() => {
        setFen(puzzle.fen);
      }, 700);
    }
  }, [onPuzzleSolved, puzzle.fen, puzzle.solution, solved]);

  function handleNextPuzzle() {
    const next = advancePuzzle();
    setCurrentIndex(next);
    resetPuzzle(next);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card puzzle-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, width: '94%', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 className="modal-title" style={{ margin: 0, fontSize: '1.25rem' }}>🧩 {puzzle.title}</h2>
              <span style={{
                background: 'rgba(124, 182, 225, 0.2)',
                color: 'var(--accent-light)',
                border: '1px solid rgba(124, 182, 225, 0.4)',
                padding: '0.15rem 0.5rem',
                borderRadius: 8,
                fontSize: '0.75rem',
                fontWeight: 800,
              }}>
                ⭐ {puzzle.rating}
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {puzzle.description}
            </p>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '0.3rem 0.65rem' }}>✕</button>
        </div>

        {feedback && (
          <div style={{
            padding: '0.55rem 0.9rem',
            borderRadius: 8,
            marginBottom: '0.75rem',
            fontSize: '0.82rem',
            fontWeight: 700,
            textAlign: 'center',
            background: solved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${solved ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
            color: solved ? '#10b981' : '#f43f5e',
          }}>
            {feedback}
          </div>
        )}

        {/* Puzzle Board */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
          <ChessBoard
            fen={fen}
            playerColor="w"
            onMove={handleMove}
            disabled={solved}
          />
        </div>

        {showHint && (
          <div style={{
            padding: '0.5rem 0.8rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-glass)',
            borderRadius: 8,
            fontSize: '0.8rem',
            color: 'var(--accent-light)',
            marginBottom: '0.75rem',
            textAlign: 'center',
          }}>
            💡 Hint: {puzzle.hint}
          </div>
        )}

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowHint(prev => !prev)}
            style={{ flex: 1, padding: '0.6rem', fontSize: '0.82rem' }}
          >
            {showHint ? 'Hide Hint' : '💡 Need a Hint?'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => resetPuzzle(currentIndex)}
            style={{ flex: 1, padding: '0.6rem', fontSize: '0.82rem' }}
          >
            🔄 Reset
          </button>
          {solved && (
            <button
              className="btn btn-primary"
              onClick={handleNextPuzzle}
              style={{ flex: 1.3, padding: '0.6rem', fontSize: '0.85rem', fontWeight: 800 }}
            >
              Next Puzzle ➔
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
