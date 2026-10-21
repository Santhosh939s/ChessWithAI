'use client';
import { useState } from 'react';
import { getFriends, addFriend, removeFriend, type Friend } from '@/lib/friends';

interface Props {
  onClose: () => void;
  onChallenge: (friend: Friend) => void;
}

export default function FriendsModal({ onClose, onChallenge }: Props) {
  const [friends, setFriends] = useState<Friend[]>(() => getFriends());
  const [searchQuery, setSearchQuery] = useState('');
  const [newFriendName, setNewFriendName] = useState('');
  const [toast, setToast] = useState('');

  function handleAddFriend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newFriendName.trim();
    if (!trimmed) return;
    const added = addFriend(trimmed);
    setFriends(getFriends());
    setNewFriendName('');
    setToast(`Added ${added.username} to your friends! ✨`);
    setTimeout(() => setToast(''), 3000);
  }

  function handleRemove(id: string, name: string) {
    removeFriend(id);
    setFriends(getFriends());
    setToast(`Removed ${name}`);
    setTimeout(() => setToast(''), 3000);
  }

  const filtered = friends.filter(f =>
    f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.userTag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card friends-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, width: '92%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 className="modal-title" style={{ margin: 0, fontSize: '1.35rem' }}>👥 Friends ({friends.length})</h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Challenge friends or find new opponents</span>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '0.35rem 0.75rem' }}>✕</button>
        </div>

        {toast && (
          <div style={{
            background: 'rgba(124, 182, 225, 0.15)',
            border: '1px solid rgba(124, 182, 225, 0.4)',
            color: 'var(--accent-light)',
            padding: '0.6rem 0.9rem',
            borderRadius: 8,
            fontSize: '0.82rem',
            marginBottom: '1rem',
          }}>
            {toast}
          </div>
        )}

        {/* Add Friend Form */}
        <form onSubmit={handleAddFriend} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <input
            type="text"
            placeholder="Add friend by username…"
            value={newFriendName}
            onChange={e => setNewFriendName(e.target.value)}
            style={{
              flex: 1,
              padding: '0.65rem 0.9rem',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-glass)',
              borderRadius: 10,
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              outline: 'none',
            }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.1rem', fontSize: '0.88rem', fontWeight: 700 }}>
            + Add
          </button>
        </form>

        {/* Search */}
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Search friends…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.85rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-glass)',
              borderRadius: 8,
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Friends List */}
        <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {filtered.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0', fontSize: '0.88rem' }}>
              No friends found. Add one above!
            </p>
          ) : (
            filtered.map(friend => {
              const isOnline = friend.status.toLowerCase().includes('online');
              return (
                <div
                  key={friend.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.9rem',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 12,
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
                    <div style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 10,
                      background: 'rgba(124, 182, 225, 0.2)',
                      border: '1px solid rgba(124, 182, 225, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.3rem',
                    }}>
                      ♟
                    </div>
                    {isOnline && (
                      <span style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: '#10b981',
                        border: '2px solid #14171d',
                      }} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {friend.username} {friend.country}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      ⭐ {friend.rating} · <span style={{ color: isOnline ? '#10b981' : 'var(--text-muted)' }}>{friend.status}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => onChallenge(friend)}
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 800 }}
                    >
                      ⚔️ Challenge
                    </button>
                    <button
                      onClick={() => handleRemove(friend.id, friend.username)}
                      title="Remove friend"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '0.4rem',
                        fontSize: '1rem',
                        borderRadius: 6,
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
