'use client';
import { useState } from 'react';

interface Props {
  onClose: () => void;
}

const LESSONS = [
  {
    id: 'moves',
    title: '♟️ Piece Movements',
    content: [
      { piece: 'Pawn (♙)', rule: 'Moves 1 square forward (or 2 squares on initial rank). Captures 1 square diagonally forward.' },
      { piece: 'Knight (♘)', rule: 'Moves in an L-shape (2 squares one way, 1 square perpendicular). Can leap over other pieces.' },
      { piece: 'Bishop (♗)', rule: 'Moves any number of squares diagonally on its own color.' },
      { piece: 'Rook (♖)', rule: 'Moves any number of squares horizontally or vertically.' },
      { piece: 'Queen (♕)', rule: 'Combines the power of Rook and Bishop: any distance diagonally, horizontally, or vertically.' },
      { piece: 'King (♔)', rule: 'Moves 1 square in any direction. The game is won by checkmating the enemy King.' },
    ],
  },
  {
    id: 'special',
    title: '🛡️ Castling & Promotion',
    content: [
      { piece: 'Castling (O-O / O-O-O)', rule: 'A special move allowing the King and Rook to move together for King safety.' },
      { piece: 'Pawn Promotion', rule: 'When a pawn reaches the 8th rank, it can immediately promote to a Queen, Rook, Bishop, or Knight.' },
      { piece: 'Check & Checkmate', rule: 'Check means the King is under attack. Checkmate means the King cannot escape attack and the game is won!' },
      { piece: 'Simplified Pawns', rule: 'In our engine, en passant is disabled so pawns moving two squares are safe from ghost captures.' },
    ],
  },
  {
    id: 'openings',
    title: '⚡ Essential Opening Principles',
    content: [
      { piece: '1. Control the Center', rule: 'Occupy squares e4, d4, e5, d5 with pawns and pieces early.' },
      { piece: '2. Develop Minor Pieces', rule: 'Bring out Knights and Bishops before launching early Queen attacks.' },
      { piece: '3. King Safety', rule: 'Castle early to tuck your King into safety behind a wall of pawns.' },
      { piece: '4. Don\'t Move the Same Piece Twice', rule: 'Develop all your army before starting complicated attacks.' },
    ],
  },
];

export default function LearnModal({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState('moves');

  const current = LESSONS.find(l => l.id === activeTab) || LESSONS[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card learn-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, width: '92%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 className="modal-title" style={{ margin: 0, fontSize: '1.35rem' }}>🎓 Chess Academy</h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Rules, tactics, and master tips</span>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '0.35rem 0.75rem' }}>✕</button>
        </div>

        {/* Tab Headers */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: 4 }}>
          {LESSONS.map(l => (
            <button
              key={l.id}
              onClick={() => setActiveTab(l.id)}
              className="btn"
              style={{
                flex: 1,
                padding: '0.55rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                background: activeTab === l.id ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                color: activeTab === l.id ? '#ffffff' : 'var(--text-secondary)',
                border: activeTab === l.id ? 'none' : '1px solid var(--border-glass)',
              }}
            >
              {l.title}
            </button>
          ))}
        </div>

        {/* Lesson Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 360, overflowY: 'auto' }}>
          {current.content.map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: '0.8rem 1rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-glass)',
                borderRadius: 10,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-light)', marginBottom: 4 }}>
                {item.piece}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {item.rule}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
