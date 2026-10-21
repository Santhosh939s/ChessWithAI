'use client';
import ChessBoard from './ChessBoard';
import type { MatchRecord } from '@/lib/gameHistory';

interface Props {
  match: MatchRecord;
  onClose: () => void;
  onRematch?: () => void;
}

export default function MatchReviewModal({ match, onClose, onRematch }: Props) {
  const isWin = match.result === 'win';
  const isLoss = match.result === 'loss';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card match-review-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, width: '92%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.25rem' }}>⭐</span>
              <h2 className="modal-title" style={{ margin: 0, fontSize: '1.25rem' }}>Match Analysis</h2>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{match.date} · {match.movesCount} moves</span>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '0.35rem 0.75rem' }}>✕</button>
        </div>

        {/* Outcome Badge Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.9rem 1.1rem',
          borderRadius: 12,
          marginBottom: '1rem',
          background: isWin ? 'rgba(16, 185, 129, 0.12)' : isLoss ? 'rgba(244, 63, 94, 0.12)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${isWin ? 'rgba(16, 185, 129, 0.3)' : isLoss ? 'rgba(244, 63, 94, 0.3)' : 'var(--border-glass)'}`,
        }}>
          <div>
            <div style={{
              fontWeight: 800,
              fontSize: '1rem',
              color: isWin ? '#10b981' : isLoss ? '#f43f5e' : 'var(--text-primary)',
            }}>
              {isWin ? '🏆 Victory' : isLoss ? '😔 Defeat' : '🤝 Draw'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              vs {match.opponent} ({match.opponentRating})
            </div>
          </div>

          <div style={{
            fontSize: '1.1rem',
            fontWeight: 800,
            color: match.deltaScore > 0 ? '#10b981' : match.deltaScore < 0 ? '#f43f5e' : 'var(--text-muted)',
          }}>
            {match.deltaScore > 0 ? `+${match.deltaScore}` : match.deltaScore} pts
          </div>
        </div>

        {/* Board View */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <ChessBoard
            fen={match.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}
            playerColor="w"
            disabled={true}
          />
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            style={{ flex: 1, padding: '0.65rem' }}
          >
            Close
          </button>
          {onRematch && (
            <button
              className="btn btn-primary"
              onClick={() => {
                onClose();
                onRematch();
              }}
              style={{ flex: 1.5, padding: '0.65rem', fontWeight: 800 }}
            >
              ⚔️ Play Rematch
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
