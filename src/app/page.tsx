'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import AuthModal from '@/components/AuthModal';
import ProfileModal from '@/components/ProfileModal';
import AIGame from '@/components/AIGame';
import OnlineGame from '@/components/OnlineGame';
import Leaderboard from '@/components/Leaderboard';
import FriendsModal from '@/components/FriendsModal';
import PuzzleModal from '@/components/PuzzleModal';
import LearnModal from '@/components/LearnModal';
import GameModeModal from '@/components/GameModeModal';
import MatchReviewModal from '@/components/MatchReviewModal';
import { getRealFriends, getCachedFriends, type Friend } from '@/lib/friends';
import { getRealMatchHistory, getCachedMatchHistory, saveRealMatchRecord, type MatchRecord } from '@/lib/gameHistory';
import {
  onAuthChange, getProfileById, logout,
  updateStats, userWithTier, getTier,
  type UserProfile,
} from '@/lib/api';

type Screen = 'home' | 'ai' | 'online';
type NavTab = 'home' | 'puzzles' | 'learn' | 'watch' | 'more';

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>('home');
  const [user, setUser] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('chess_user_session');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });

  // Modal visibility states
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showPuzzles, setShowPuzzles] = useState(false);
  const [showLearn, setShowLearn] = useState(false);
  const [showGameMode, setShowGameMode] = useState(false);
  const [selectedReview, setSelectedReview] = useState<MatchRecord | null>(null);

  // App state
  const [pendingMode, setPendingMode] = useState<Screen | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('home');

  // Real Friends & History data states (Strictly authentic data from Firebase)
  const [friends, setFriends] = useState<Friend[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedUser = localStorage.getItem('chess_user_session');
        if (cachedUser) {
          const parsed = JSON.parse(cachedUser);
          if (parsed?.uid) return getCachedFriends(parsed.uid);
        }
      } catch {}
    }
    return [];
  });
  const [history, setHistory] = useState<MatchRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedUser = localStorage.getItem('chess_user_session');
        if (cachedUser) {
          const parsed = JSON.parse(cachedUser);
          if (parsed?.uid) return getCachedMatchHistory(parsed.uid);
        }
      } catch {}
    }
    return [];
  });

  // Listen to Firebase auth state
  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getProfileById(firebaseUser.uid, firebaseUser);
          const fullUser = userWithTier(profile);
          setUser(fullUser);
          localStorage.setItem('chess_user_session', JSON.stringify(fullUser));
        } catch {
          const fallbackTag = `#${firebaseUser.uid.slice(-4).toUpperCase()}`;
          const fallbackName = firebaseUser.displayName?.replace(/\s+/g, '').toLowerCase() || firebaseUser.email?.split('@')[0] || 'player';
          const fallback = userWithTier({
            uid: firebaseUser.uid,
            username: fallbackName,
            userTag: fallbackTag,
            email: firebaseUser.email || '',
            wins: 0, losses: 0, draws: 0, gamesPlayed: 0, rating: 0,
            createdAt: new Date().toISOString(),
          });
          setUser(fallback);
          localStorage.setItem('chess_user_session', JSON.stringify(fallback));
        }
      } else {
        setUser(null);
        localStorage.removeItem('chess_user_session');
      }
    });
    return () => unsub();
  }, []);

  // Sync real friends and match history from Firebase when user logs in
  useEffect(() => {
    if (user?.uid) {
      getRealFriends(user.uid).then(setFriends);
      getRealMatchHistory(user.uid).then(setHistory);
    } else {
      setFriends([]);
      setHistory([]);
    }
  }, [user?.uid]);

  function showToast(msg: string) {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  }

  function handleAuthSuccess(profile: UserProfile) {
    const fullUser = userWithTier(profile);
    setUser(fullUser);
    localStorage.setItem('chess_user_session', JSON.stringify(fullUser));
    setShowAuth(false);
    showToast(`Welcome, ${profile.username} ${fullUser.userTag}! 👋`);
    if (pendingMode) { setScreen(pendingMode); setPendingMode(null); }
  }

  function handlePlayMode(mode: Screen) {
    if (!user) { setPendingMode(mode); setShowAuth(true); return; }
    setScreen(mode);
  }

  async function handleLogout() {
    await logout();
    localStorage.removeItem('chess_user_session');
    setUser(null);
    setScreen('home');
    setFriends([]);
    setHistory([]);
    showToast('Signed out successfully');
  }

  async function handleGameEnd(result: 'win' | 'loss' | 'draw', movesCount: number = 0) {
    let delta = 0;
    if (result === 'win') {
      delta = movesCount < 10 ? 40 : movesCount < 30 ? 30 : 25;
    } else if (result === 'loss') {
      delta = movesCount < 6 ? -10 : -15;
    }

    if (user?.uid) {
      // Persist authentic game to Firebase Firestore
      const saved = await saveRealMatchRecord(user.uid, {
        opponent: screen === 'ai' ? 'Adaptive AI' : 'Online Rival',
        opponentType: screen === 'ai' ? 'ai' : 'player',
        opponentRating: screen === 'ai' ? 1200 : (user?.rating || 400),
        result,
        deltaScore: delta,
        movesCount,
        gameType: screen === 'ai' ? 'ai' : 'rapid',
      });
      setHistory(prev => [saved, ...prev]);

      try {
        const { deltaScore } = await updateStats(user.uid, result, movesCount);
        const fresh = await getProfileById(user.uid);
        const fullUser = userWithTier(fresh);
        setUser(fullUser);
        localStorage.setItem('chess_user_session', JSON.stringify(fullUser));
        if (result === 'win')  showToast(`🏆 Victory! (+${deltaScore} pts) Rank: ${getTier(fresh.wins).name}`);
        else if (result === 'draw') showToast('🤝 Draw accepted! 0 points deducted.');
        else showToast(`Match lost (${deltaScore} pts). Keep practicing!`);
      } catch {}
    }
  }

  function handleChallengeFriend(friend: Friend) {
    showToast(`⚔️ Challenging ${friend.username}… Launching arena!`);
    handlePlayMode('online');
  }

  function handleNavClick(tab: NavTab) {
    setActiveTab(tab);
    if (tab === 'home') {
      setScreen('home');
    } else if (tab === 'puzzles') {
      setShowPuzzles(true);
    } else if (tab === 'learn') {
      setShowLearn(true);
    } else if (tab === 'watch') {
      setShowLeaderboard(true);
    } else if (tab === 'more') {
      if (user) setShowProfile(true);
      else setShowAuth(true);
    }
  }

  const rating = user?.rating ?? 301;
  const tier = user ? getTier(rating) : { name: 'Pawn', emoji: '♙' };

  return (
    <div className={`app-layout ${screen !== 'home' ? 'in-game-layout' : ''}`}>
      {/* Toast Notification */}
      {notification && <div className="notification-toast">{notification}</div>}

      {/* In-Game Screens */}
      {screen === 'ai' && user && (
        <AIGame user={user} onGameEnd={handleGameEnd} onBack={() => setScreen('home')} />
      )}

      {screen === 'online' && user && (
        <OnlineGame user={user} onGameEnd={handleGameEnd} onBack={() => setScreen('home')} />
      )}

      {/* Main Home Screen Dashboard (Chess.com Mobile Native Layout) */}
      {screen === 'home' && (
        <div className="chess-app-shell">
          {/* Top Bar Header */}
          <header className="dash-top-bar">
            {/* Left: User Avatar + Level Pill */}
            <div
              className="dash-user-pill"
              onClick={() => {
                if (user) setShowProfile(true);
                else setShowAuth(true);
              }}
              role="button"
              tabIndex={0}
            >
              <div className="dash-user-avatar" suppressHydrationWarning>
                {tier.emoji}
              </div>
              <span className="dash-user-name" suppressHydrationWarning>
                {user ? user.username : 'Sign In'}
              </span>
            </div>

            {/* Right: Diamonds Counter & Friends Icon */}
            <div className="dash-top-right">
              <div
                className="dash-stat-badge"
                onClick={() => setShowLeaderboard(true)}
                title="Your Rating Points"
                suppressHydrationWarning
              >
                <span>💎</span>
                <span suppressHydrationWarning>{rating}</span>
              </div>

              <button
                className="dash-icon-btn"
                onClick={() => setShowFriends(true)}
                title="Friends"
                aria-label="Friends"
                suppressHydrationWarning
              >
                <span>👥</span>
                {friends.length > 0 && (
                  <span className="dash-count-bubble" suppressHydrationWarning>{friends.length}</span>
                )}
              </button>
            </div>
          </header>

          <main style={{ flex: 1 }}>
            {/* 1. Featured / Puzzles Banner (Matches Image 1) */}
            <section className="dash-featured-banner">
              <div>
                <div className="dash-featured-title">
                  <span>🧩</span>
                  <span>Puzzles</span>
                </div>
                <div className="dash-featured-progress">
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    493
                  </span>
                  <div className="dash-progress-track">
                    <div className="dash-progress-fill" />
                  </div>
                </div>
              </div>

              <button
                className="dash-featured-btn"
                onClick={() => setShowPuzzles(true)}
              >
                Solve!
              </button>
            </section>

            {/* 2. Stats Section (Matches Image 1) */}
            <section className="dash-section">
              <div className="dash-section-header">
                <span className="dash-section-title">Stats</span>
                <button className="dash-view-all" onClick={() => setShowLeaderboard(true)}>
                  View All
                </button>
              </div>

              <div className="dash-horizontal-scroll">
                {/* Rapid */}
                <div className="dash-stat-card" onClick={() => handlePlayMode('online')}>
                  <div className="dash-stat-icon">⏱️</div>
                  <div className="dash-stat-val">{rating}</div>
                  <div className="dash-stat-lbl">Rapid</div>
                </div>

                {/* Bullet */}
                <div className="dash-stat-card" onClick={() => handlePlayMode('online')}>
                  <div className="dash-stat-icon">🚀</div>
                  <div className="dash-stat-val">Bullet</div>
                  <div className="dash-stat-lbl">Play 4 Games</div>
                </div>

                {/* Blitz */}
                <div className="dash-stat-card" onClick={() => handlePlayMode('online')}>
                  <div className="dash-stat-icon">⚡</div>
                  <div className="dash-stat-val">Blitz</div>
                  <div className="dash-stat-lbl">Play 5 Games</div>
                </div>

                {/* AI Games */}
                <div className="dash-stat-card" onClick={() => handlePlayMode('ai')}>
                  <div className="dash-stat-icon">🤖</div>
                  <div className="dash-stat-val">vs AI</div>
                  <div className="dash-stat-lbl">{user?.gamesPlayed ?? 0} Played</div>
                </div>
              </div>
            </section>

            {/* 3. Friends Section (Matches Image 1 & 2) */}
            <section className="dash-section">
              <div className="dash-section-header">
                <div className="dash-section-title">
                  <span>Friends</span>
                  <span className="dash-section-count">{friends.length}</span>
                </div>
                <button className="dash-view-all" onClick={() => setShowFriends(true)}>
                  View All
                </button>
              </div>

              <div className="dash-horizontal-scroll">
                {friends.length === 0 ? (
                  <div
                    className="dash-friend-card"
                    onClick={() => setShowFriends(true)}
                    style={{
                      cursor: 'pointer',
                      border: '1px dashed rgba(124, 182, 225, 0.4)',
                      background: 'rgba(26, 47, 75, 0.35)',
                      minWidth: '160px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1rem 0.8rem',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '1.6rem', marginBottom: '0.2rem' }}>👥</div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      No Friends Yet
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Tap to add real players
                    </div>
                  </div>
                ) : (
                  friends.map((friend) => (
                    <div key={friend.id} className="dash-friend-card">
                      <div className="dash-friend-avatar-wrap">
                        <div className="dash-friend-avatar">♟</div>
                        {friend.status.toLowerCase().includes('online') && (
                          <div className="dash-online-dot" />
                        )}
                      </div>
                      <div className="dash-friend-name">
                        {friend.username} {friend.country}
                      </div>
                      <div className="dash-friend-sub">
                        {friend.status}
                      </div>
                      <button
                        className="dash-friend-btn"
                        onClick={() => handleChallengeFriend(friend)}
                      >
                        Challenge
                      </button>
                    </div>
                  ))
                )}

                {/* Find Friends Card */}
                <div
                  className="dash-find-friends-card"
                  onClick={() => setShowFriends(true)}
                  role="button"
                  tabIndex={0}
                >
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'rgba(124, 182, 225, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    marginBottom: '0.4rem',
                  }}>
                    🔍
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-light)' }}>
                    Find Friends
                  </span>
                </div>
              </div>
            </section>

            {/* 4. Game History Section (Matches Image 2) */}
            <section className="dash-section">
              <div className="dash-section-header">
                <div className="dash-section-title">
                  <span>Game History</span>
                  <span className="dash-section-count">{history.length}</span>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Accuracy
                </span>
              </div>

              <div className="dash-history-list">
                {history.length === 0 ? (
                  <div
                    style={{
                      padding: '1.5rem 1rem',
                      textAlign: 'center',
                      background: 'var(--bg-card)',
                      borderRadius: '14px',
                      border: '1px dashed rgba(124, 182, 225, 0.25)',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ fontSize: '1.8rem', marginBottom: '0.35rem' }}>📜</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      No matches played yet
                    </div>
                    <div>
                      Play vs AI or Online! Each game automatically saves here with full review.
                    </div>
                  </div>
                ) : (
                  history.slice(0, 6).map((match) => (
                    <div key={match.id} className="dash-history-item">
                      <div className="dash-history-left">
                        <div className="dash-history-type-icon">
                          {match.opponentType === 'ai' ? '🤖' : '⏱️'}
                        </div>
                        <div className="dash-history-opp-avatar">
                          ♟
                        </div>
                        <div>
                          <div className="dash-history-opp-name">
                            {match.opponent} <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>({match.opponentRating})</span>
                          </div>
                          <div className="dash-history-opp-sub">
                            {match.date} · {match.movesCount} moves
                          </div>
                        </div>
                      </div>

                      <div className="dash-history-right">
                        <div className={`dash-outcome-badge ${match.result}`}>
                          {match.result === 'win' ? '+' : match.result === 'loss' ? '−' : '='}
                        </div>

                        {/* The Signature Star Review Button from Image 2 */}
                        <button
                          className="dash-review-btn"
                          onClick={() => setSelectedReview(match)}
                          title="Review Match Analysis"
                          aria-label="Review Match"
                        >
                          ⭐
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </main>

          {/* 5. The Big Floating "Play" Button (Matches Image 1 & 2) */}
          <div className="dash-floating-play-container">
            <button
              className="dash-big-play-btn"
              onClick={() => setShowGameMode(true)}
            >
              <span>♟</span>
              <span>Play</span>
            </button>
          </div>

          {/* 6. Native Bottom Navigation Bar (Matches Image 1 & 2) */}
          <nav className="dash-bottom-nav">
            <button
              className={`dash-nav-item ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => handleNavClick('home')}
            >
              <span className="dash-nav-icon">♟</span>
              <span className="dash-nav-label">Home</span>
            </button>

            <button
              className={`dash-nav-item ${activeTab === 'puzzles' ? 'active' : ''}`}
              onClick={() => handleNavClick('puzzles')}
            >
              <span className="dash-nav-icon">🧩</span>
              <span className="dash-nav-label">Puzzles</span>
            </button>

            <button
              className={`dash-nav-item ${activeTab === 'learn' ? 'active' : ''}`}
              onClick={() => handleNavClick('learn')}
            >
              <span className="dash-nav-icon">🎓</span>
              <span className="dash-nav-label">Learn</span>
            </button>

            <button
              className={`dash-nav-item ${activeTab === 'watch' ? 'active' : ''}`}
              onClick={() => handleNavClick('watch')}
            >
              <span className="dash-nav-icon">🏆</span>
              <span className="dash-nav-label">Watch</span>
            </button>

            <button
              className={`dash-nav-item ${activeTab === 'more' ? 'active' : ''}`}
              onClick={() => handleNavClick('more')}
            >
              <span className="dash-nav-icon">☰</span>
              <span className="dash-nav-label">More</span>
            </button>
          </nav>
        </div>
      )}

      {/* Modals */}
      {showAuth && <AuthModal onSuccess={handleAuthSuccess} />}

      {showProfile && user && (
        <ProfileModal
          user={user}
          onUpdateUser={(updated) => {
            const fullUser = userWithTier(updated);
            setUser(fullUser);
            localStorage.setItem('chess_user_session', JSON.stringify(fullUser));
            showToast(`Username updated to ${updated.username}! ✨`);
          }}
          onLogout={handleLogout}
          onClose={() => setShowProfile(false)}
        />
      )}

      {showLeaderboard && (
        <Leaderboard onClose={() => setShowLeaderboard(false)} />
      )}

      {showFriends && (
        <FriendsModal
          currentUser={user}
          onClose={() => {
            setShowFriends(false);
            if (user?.uid) {
              getRealFriends(user.uid).then(setFriends);
            }
          }}
          onChallenge={(friend) => {
            setShowFriends(false);
            handleChallengeFriend(friend);
          }}
          onRequireAuth={() => {
            setShowFriends(false);
            setShowAuth(true);
          }}
        />
      )}

      {showPuzzles && (
        <PuzzleModal
          onClose={() => setShowPuzzles(false)}
          onPuzzleSolved={(bonus) => {
            showToast(`🎉 +${bonus} Rating Points earned!`);
          }}
        />
      )}

      {showLearn && (
        <LearnModal onClose={() => setShowLearn(false)} />
      )}

      {showGameMode && (
        <GameModeModal
          onClose={() => setShowGameMode(false)}
          onSelectMode={(mode) => {
            setShowGameMode(false);
            if (mode === 'ai') handlePlayMode('ai');
            else if (mode === 'online') handlePlayMode('online');
            else if (mode === 'friends') setShowFriends(true);
            else if (mode === 'puzzles') setShowPuzzles(true);
          }}
        />
      )}

      {selectedReview && (
        <MatchReviewModal
          match={selectedReview}
          onClose={() => setSelectedReview(null)}
          onRematch={() => {
            setSelectedReview(null);
            handlePlayMode(selectedReview.opponentType === 'ai' ? 'ai' : 'online');
          }}
        />
      )}
    </div>
  );
}
