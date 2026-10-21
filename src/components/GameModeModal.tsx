'use client';

interface Props {
  onClose: () => void;
  onSelectMode: (mode: 'ai' | 'online' | 'friends' | 'puzzles') => void;
}

export default function GameModeModal({ onClose, onSelectMode }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card play-mode-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, width: '92%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 className="modal-title" style={{ margin: 0, fontSize: '1.35rem' }}>♟️ Choose Game Mode</h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Select how you want to play today</span>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '0.35rem 0.75rem' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Option 1: AI */}
          <button
            onClick={() => onSelectMode('ai')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.1rem',
              background: 'linear-gradient(135deg, rgba(124, 182, 225, 0.12) 0%, rgba(255,255,255,0.03) 100%)',
              border: '1px solid rgba(124, 182, 225, 0.3)',
              borderRadius: 14,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(124, 182, 225, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
            }}>
              🤖
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Play vs AI</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Adaptive computer opponent from Pawn to Grandmaster
              </div>
            </div>
            <span style={{ fontSize: '1.2rem', color: 'var(--accent-light)' }}>➔</span>
          </button>

          {/* Option 2: Online */}
          <button
            onClick={() => onSelectMode('online')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.1rem',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(255,255,255,0.03) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 14,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
            }}>
              ⚡
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Quick Online Match</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Auto-match with real online players in real-time
              </div>
            </div>
            <span style={{ fontSize: '1.2rem', color: '#10b981' }}>➔</span>
          </button>

          {/* Option 3: Play with Friend */}
          <button
            onClick={() => onSelectMode('friends')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.1rem',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(255,255,255,0.03) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 14,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(245, 158, 11, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
            }}>
              👥
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Play a Friend</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Challenge friends from your list or share room codes
              </div>
            </div>
            <span style={{ fontSize: '1.2rem', color: '#f59e0b' }}>➔</span>
          </button>

          {/* Option 4: Puzzles */}
          <button
            onClick={() => onSelectMode('puzzles')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.1rem',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(255,255,255,0.03) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: 14,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(139, 92, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
            }}>
              🧩
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Puzzles & Tactics</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Train tactical vision and level up your rating
              </div>
            </div>
            <span style={{ fontSize: '1.2rem', color: '#a78bfa' }}>➔</span>
          </button>
        </div>
      </div>
    </div>
  );
}
