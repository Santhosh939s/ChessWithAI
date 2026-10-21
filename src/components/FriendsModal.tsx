'use client';
import { useState, useEffect } from 'react';
import {
  getRealFriends,
  getCachedFriends,
  addRealFriend,
  removeRealFriend,
  searchRealPlayers,
  type Friend,
} from '@/lib/friends';
import type { UserProfile } from '@/lib/api';

interface Props {
  currentUser: UserProfile | null;
  onClose: () => void;
  onChallenge: (friend: Friend) => void;
  onRequireAuth?: () => void;
}

export default function FriendsModal({ currentUser, onClose, onChallenge, onRequireAuth }: Props) {
  const [friends, setFriends] = useState<Friend[]>(() =>
    currentUser?.uid ? getCachedFriends(currentUser.uid) : []
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [toast, setToast] = useState('');

  // Load latest real friends from Firebase
  useEffect(() => {
    if (currentUser?.uid) {
      getRealFriends(currentUser.uid).then(setFriends);
    }
  }, [currentUser?.uid]);

  // Handle player search against real Firebase accounts
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchRealPlayers(trimmed, currentUser?.uid);
        // Exclude players that are already friends
        const friendUids = new Set(friends.map(f => f.uid));
        setSearchResults(found.filter(u => !friendUids.has(u.uid)));
      } catch (e) {
        console.warn('Player search failed:', e);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUser?.uid, friends]);

  async function handleAddFriend(player: UserProfile) {
    if (!currentUser?.uid) {
      onRequireAuth?.();
      return;
    }
    try {
      const added = await addRealFriend(currentUser.uid, player);
      setFriends(prev => [added, ...prev.filter(f => f.uid !== added.uid)]);
      setSearchResults(prev => prev.filter(u => u.uid !== player.uid));
      setToast(`Added ${player.username} to your friends! ✨`);
      setTimeout(() => setToast(''), 3000);
    } catch {
      setToast('Failed to add friend. Try again.');
      setTimeout(() => setToast(''), 3000);
    }
  }

  async function handleRemove(friendUid: string, name: string) {
    if (!currentUser?.uid) return;
    try {
      await removeRealFriend(currentUser.uid, friendUid);
      setFriends(prev => prev.filter(f => f.uid !== friendUid && f.id !== friendUid));
      setToast(`Removed ${name}`);
      setTimeout(() => setToast(''), 3000);
    } catch {
      setToast('Failed to remove friend');
      setTimeout(() => setToast(''), 3000);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card friends-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, width: '92%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 className="modal-title" style={{ margin: 0, fontSize: '1.35rem' }}>👥 Real Friends ({friends.length})</h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Search real players from Firebase to connect</span>
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

        {!currentUser && (
          <div style={{
            padding: '0.85rem 1rem',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-glass)',
            borderRadius: 12,
            marginBottom: '1.25rem',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
              Sign in to search real players and save friends to your Firebase profile.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                onClose();
                onRequireAuth?.();
              }}
              style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
            >
              Sign In Now
            </button>
          </div>
        )}

        {/* Real User Search Input */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search real players by username…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.7rem 1rem',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-glass)',
                borderRadius: 12,
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
            {searching && (
              <span style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.75rem',
                color: 'var(--accent-light)',
              }}>
                Searching…
              </span>
            )}
          </div>

          {/* Search Results Dropdown/List */}
          {searchResults.length > 0 && (
            <div style={{
              marginTop: '0.5rem',
              background: '#1a1f28',
              border: '1px solid rgba(124, 182, 225, 0.3)',
              borderRadius: 12,
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              maxHeight: 180,
              overflowY: 'auto',
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0.2rem 0.5rem', fontWeight: 700 }}>
                PLAYERS FOUND IN FIREBASE:
              </div>
              {searchResults.map(player => (
                <div
                  key={player.uid}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.75rem',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {player.username} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{player.userTag}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--accent-light)' }}>
                      ⭐ {player.rating ?? Math.min(1000, (player.wins || 0) * 30)} pts
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleAddFriend(player)}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    + Add Friend
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Real Friends List */}
        <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {friends.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem 1rem',
              background: 'rgba(255,255,255,0.02)',
              border: '1px dashed var(--border-glass)',
              borderRadius: 12,
            }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>👥</span>
              <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.9rem', margin: '0 0 0.25rem' }}>
                No friends added yet
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0 }}>
                Type a real player username above to find and connect with them.
              </p>
            </div>
          ) : (
            friends.map(friend => (
              <div
                key={friend.uid || friend.id}
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
                <div style={{ position: 'relative', width: 42, height: 42, flexShrink: 0 }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 10,
                    background: 'rgba(124, 182, 225, 0.2)',
                    border: '1px solid rgba(124, 182, 225, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                  }}>
                    ♟
                  </div>
                  <span style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#10b981',
                    border: '2px solid #14171d',
                  }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {friend.username}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    ⭐ {friend.rating} pts · <span style={{ color: '#10b981' }}>{friend.status}</span>
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
                    onClick={() => handleRemove(friend.uid || friend.id, friend.username)}
                    title="Remove friend"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.4rem',
                      fontSize: '0.95rem',
                      borderRadius: 6,
                    }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
