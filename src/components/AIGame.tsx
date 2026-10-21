'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chess, type Move } from 'chess.js';
import ChessBoard from '@/components/ChessBoard';
import TopMoveTicker from '@/components/TopMoveTicker';
import ThemeSelector, { type BoardTheme } from '@/components/ThemeSelector';
import GameOptionsMenu from '@/components/GameOptionsMenu';
import { getAIMove } from '@/lib/chessAI';
import { getTier } from '@/lib/api';
import { stripEnPassantFen, clearEnPassant, createCleanChess } from '@/lib/chessRules';

interface Props {
  user: any;
  onGameEnd: (result: 'win' | 'loss' | 'draw', movesCount?: number) => void;
  onBack: () => void;
}

const INITIAL_TIME = 600; // 10 minutes in seconds

export default function AIGame({ user, onGameEnd, onBack }: Props) {
  const chessRef = useRef<Chess>(createCleanChess());
  const [fen, setFen] = useState(() => createCleanChess().fen());
  const [playerColor] = useState<'w' | 'b'>(() => Math.random() < 0.5 ? 'w' : 'b');
  const [thinking, setThinking] = useState(false);
  const [status, setStatus] = useState('');
  const [gameOver, setGameOver] = useState<'win' | 'loss' | 'draw' | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [checkSquare, setCheckSquare] = useState<string | null>(null);

  // Board color theme state (defaulting to Sky Blue rgb(124,182,225) & rgb(240,240,240))
  const [theme, setTheme] = useState<BoardTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chess_theme') as BoardTheme;
      if (saved && ['skyblue', 'classic-green', 'sapphire', 'amethyst', 'cyber'].includes(saved)) {
        return saved;
      }
    }
    return 'skyblue';
  });
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Move replay state (null = showing live board)
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [reviewMode, setReviewMode] = useState(false);

  function handleSelectTheme(newTheme: BoardTheme) {
    setTheme(newTheme);
    localStorage.setItem('chess_theme', newTheme);
  }

  // 10-Minute Clocks (in seconds)
  const [whiteTime, setWhiteTime] = useState(INITIAL_TIME);
  const [blackTime, setBlackTime] = useState(INITIAL_TIME);

  const tier = getTier(user?.wins ?? 0);
  const aiDepth = tier.depth;
  const aiColor = playerColor === 'w' ? 'b' : 'w';

  function handleTimeout(timedOutColor: 'w' | 'b') {
    const playerWon = timedOutColor === aiColor;
    const result = playerWon ? 'win' : 'loss';
    setStatus(`Time's up! ${playerWon ? 'You win on time! 🏆' : 'AI wins on time!'}`);
    setGameOver(result);
  }

  function findKingSquare(chess: Chess, color: 'w' | 'b'): string | null {
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (p && p.type === 'k' && p.color === color) return p.square;
      }
    }
    return null;
  }

  const updateStatus = useCallback((chess: Chess) => {
    if (chess.isCheckmate()) {
      const playerWon = chess.turn() === aiColor;
      setStatus(`Checkmate! ${playerWon ? 'You win! 🏆' : 'AI wins!'}`);
      const result = playerWon ? 'win' : 'loss';
      setGameOver(result);
    } else if (chess.isStalemate()) {
      setStatus('Stalemate — Draw!'); setGameOver('draw');
    } else if (chess.isInsufficientMaterial()) {
      setStatus('Insufficient material — Draw!'); setGameOver('draw');
    } else if (chess.isThreefoldRepetition()) {
      setStatus('Threefold repetition — Draw!'); setGameOver('draw');
    } else if (chess.isDraw()) {
      setStatus('Draw!'); setGameOver('draw');
    } else if (chess.inCheck()) {
      setCheckSquare(findKingSquare(chess, chess.turn()));
      setStatus(`${chess.turn() === 'w' ? 'White' : 'Black'} is in check!`);
    } else {
      setCheckSquare(null);
      setStatus(chess.turn() === playerColor ? 'Your turn' : 'AI thinking…');
    }
  }, [aiColor, playerColor]);

  // ── Timer Effect ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameOver) return;

    const timer = setInterval(() => {
      const turn = chessRef.current.turn();
      if (turn === 'w') {
        setWhiteTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleTimeout('w');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleTimeout('b');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  const workerRef = useRef<Worker | null>(null);

  // Initialize Web Worker for AI computation off the main thread
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        workerRef.current = new Worker(new URL('../lib/ai.worker.ts', import.meta.url));
      } catch (e) {
        console.warn('Web Worker fallback to main thread:', e);
      }
    }
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const makeAIMove = useCallback(() => {
    const chess = chessRef.current;
    if (chess.isGameOver() || chess.turn() !== aiColor) return;

    setThinking(true);

    const onMoveCalculated = (move: any) => {
      if (move) {
        clearEnPassant(chess);
        chess.move(move);
        clearEnPassant(chess);
        const history = chess.history({ verbose: true });
        setLastMove({ from: move.from, to: move.to });
        setMoveHistory(history);
        setFen(stripEnPassantFen(chess.fen()));
        setViewIndex(null); // Return to live move when AI plays
        updateStatus(chess);
      }
      setThinking(false);
    };

    if (workerRef.current) {
      workerRef.current.onmessage = (e: MessageEvent) => {
        if (e.data?.success && e.data?.move) {
          onMoveCalculated(e.data.move);
        } else {
          clearEnPassant(chess);
          const fallback = getAIMove(chess, aiDepth);
          onMoveCalculated(fallback);
        }
      };
      workerRef.current.postMessage({ fen: stripEnPassantFen(chess.fen()), depth: aiDepth });
    } else {
      setTimeout(() => {
        clearEnPassant(chess);
        const move = getAIMove(chess, aiDepth);
        onMoveCalculated(move);
      }, 50);
    }
  }, [aiColor, aiDepth, updateStatus]);

  // Initial check if AI plays White (goes first)
  useEffect(() => {
    if (playerColor === 'b') {
      makeAIMove();
    } else {
      updateStatus(chessRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent on game over with moves count
  useEffect(() => {
    if (gameOver) {
      onGameEnd(gameOver, moveHistory.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  const handlePlayerMove = useCallback((move: any) => {
    const chess = chessRef.current;
    clearEnPassant(chess);
    const executed = chess.move({ from: move.from, to: move.to, promotion: move.promotion });
    if (executed) {
      clearEnPassant(chess);
      const history = chess.history({ verbose: true });
      setLastMove({ from: executed.from, to: executed.to });
      setMoveHistory(history);
      setFen(stripEnPassantFen(chess.fen()));
      setViewIndex(null); // Jump to live state when playing move
      updateStatus(chess);
      if (!chess.isGameOver()) {
        makeAIMove();
      }
    }
  }, [makeAIMove, updateStatus]);

  function handleOfferDraw() {
    setStatus('Draw agreed — Peace!');
    setGameOver('draw');
  }

  function handleResign() {
    setStatus('You resigned the match.');
    setGameOver('loss');
  }

  const handlePlayAgain = useCallback(() => {
    const newChess = new Chess();
    clearEnPassant(newChess);
    chessRef.current = newChess;
    setFen(stripEnPassantFen(newChess.fen()));
    setMoveHistory([]);
    setLastMove(null);
    setCheckSquare(null);
    setGameOver(null);
    setReviewMode(false);
    setViewIndex(null);
    setWhiteTime(INITIAL_TIME);
    setBlackTime(INITIAL_TIME);
    setThinking(false);
    setStatus(playerColor === 'w' ? 'Your turn' : 'AI thinking…');
    if (playerColor === 'b') {
      setTimeout(() => makeAIMove(), 250);
    }
  }, [makeAIMove, playerColor]);

  // ── Calculate Board & Last Move to Display (Cached with useMemo for 0ms lag) ─
  const historyCache = useMemo(() => {
    if (viewIndex === null) return { fens: [], moves: [] };
    const replay = new Chess();
    clearEnPassant(replay);
    const fens: string[] = [stripEnPassantFen(replay.fen())];
    const moves: ({ from: string; to: string } | null)[] = [null];
    for (const m of moveHistory) {
      clearEnPassant(replay);
      replay.move(m);
      clearEnPassant(replay);
      fens.push(stripEnPassantFen(replay.fen()));
      moves.push({ from: m.from, to: m.to });
    }
    return { fens, moves };
  }, [moveHistory, viewIndex]);

  const isReplaying = viewIndex !== null && viewIndex < moveHistory.length;
  let displayFen = fen;
  let displayLastMove = lastMove;

  if (isReplaying && viewIndex !== null) {
    displayFen = historyCache.fens[viewIndex] || fen;
    displayLastMove = historyCache.moves[viewIndex] || null;
  }

  // Navigation handlers
  function stepToMove(idx: number) {
    if (idx < 0) idx = 0;
    if (idx >= moveHistory.length) setViewIndex(null);
    else setViewIndex(idx);
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  const userTime  = playerColor === 'w' ? whiteTime : blackTime;
  const aiTime    = playerColor === 'w' ? blackTime : whiteTime;
  const currentTurn = (fen.split(' ')[1] || 'w') as 'w' | 'b';
  const isUserTurn = currentTurn === playerColor;

  const colorLabel = playerColor === 'w' ? '⬜ White' : '⬛ Black';
  const aiLabel    = playerColor === 'w' ? '⬛ Black' : '⬜ White';

  const activeMoveIndex = viewIndex === null ? moveHistory.length : viewIndex;

  return (
    <div className="game-screen-wrapper" data-theme={theme}>
      <div className="game-board-section">
        {/* Mobile App Native Header */}
        <div className="mobile-game-header">
          <button className="mobile-back-btn" onClick={onBack} title="Exit to Home">
            ‹
          </button>
          <div className="mobile-game-logo">
            <span className="logo-piece-icon">♟</span>
            <span>ChessAI</span>
          </div>
          <div className="mobile-game-badge">
            <span>⚡</span>
            <span>AI Lvl {aiDepth}</span>
          </div>
        </div>

        {/* Top Move Ticker Bar */}
        <TopMoveTicker
          moveHistory={moveHistory}
          activeMoveIndex={activeMoveIndex}
          onSelectMove={setViewIndex}
        />

        {/* Top Clock & AI Info Bar */}
        <div className="player-bar opponent-bar">
          <div className="player-bar-left">
            <div className="player-avatar-box">
              <span>🤖</span>
            </div>
            <div className="player-bar-info">
              <div className="player-bar-name">
                Chess Master <span className="player-sub-badge">(AI {aiDepth * 350})</span>
              </div>
              <div className="player-bar-rank" style={{ color: tier.color }}>
                {thinking ? (
                  <span style={{ color: '#93c5fd', fontWeight: 600 }}>Thinking…</span>
                ) : (
                  `${aiLabel} · ${tier.name} Level`
                )}
              </div>
            </div>
          </div>
          <div className={`chess-clock ${!isUserTurn && !gameOver ? 'active' : ''} ${aiTime < 30 ? 'low-time' : ''}`}>
            {!isUserTurn && !gameOver && <span className="clock-active-dot">🕒</span>}
            <span>{formatTime(aiTime)}</span>
          </div>
        </div>

        {/* Game Finished Review Banner */}
        {gameOver && reviewMode && (
          <div className="game-review-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.15rem' }}>
                {gameOver === 'win' ? '🏆' : gameOver === 'loss' ? '😔' : '🤝'}
              </span>
              <div>
                <span style={{ fontWeight: 800, color: gameOver === 'win' ? '#34d399' : gameOver === 'loss' ? '#f87171' : '#fbbf24' }}>
                  {gameOver === 'win' ? 'Victory' : gameOver === 'loss' ? 'Defeat' : 'Draw'}
                </span>
                <span style={{ color: 'var(--text-secondary)', marginLeft: '0.35rem', fontSize: '0.75rem' }}>
                  {viewIndex !== null ? `(Move ${viewIndex} of ${moveHistory.length})` : '(Final Position)'}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setReviewMode(false)}
                style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                title="View Match Summary"
              >
                📋 Result
              </button>
              <button
                className="btn btn-secondary"
                onClick={handlePlayAgain}
                style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                title="Play a new game"
              >
                🔄 Rematch
              </button>
              <button
                className="btn btn-secondary"
                onClick={onBack}
                style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                title="Return to Home Menu"
              >
                🏠 Home
              </button>
            </div>
          </div>
        )}

        {/* Move History Replay Position Indicator (Without Live button) */}
        {!gameOver && isReplaying && (
          <div className="move-replay-status-bar">
            <span>🔍 Viewing Move {viewIndex} of {moveHistory.length}</span>
            <span style={{ fontSize: '0.72rem', color: '#93c5fd' }}>Use › to step forward</span>
          </div>
        )}

        {/* Board */}
        <ChessBoard
          fen={displayFen}
          playerColor={playerColor}
          onMove={handlePlayerMove}
          disabled={thinking || !!gameOver || !isUserTurn || isReplaying}
          lastMove={displayLastMove}
          checkSquare={isReplaying ? null : checkSquare}
        />

        {/* Bottom Clock & User Info Bar */}
        <div className="player-bar user-bar">
          <div className="player-bar-left">
            <div className="player-avatar-box">
              <span>👤</span>
            </div>
            <div className="player-bar-info">
              <div className="player-bar-name">
                {user?.username ?? 'Player'} <span className="player-sub-badge">({user?.rating ?? Math.min(1000, (user?.wins || 0) * 30)})</span> {tier.emoji}
              </div>
              <div className="player-bar-rank" style={{ color: tier.color }}>
                {colorLabel} · {user?.wins ?? 0}W {user?.losses ?? 0}L
              </div>
            </div>
          </div>
          <div className={`chess-clock ${isUserTurn && !gameOver ? 'active' : ''} ${userTime < 30 ? 'low-time' : ''}`}>
            {isUserTurn && !gameOver && <span className="clock-active-dot">🕒</span>}
            <span>{formatTime(userTime)}</span>
          </div>
        </div>

        {/* Bottom Mobile & Desktop App Action Bar: STRICTLY Options, Theme, Previous, Next */}
        <div className="bottom-app-bar">
          <button className="bottom-action-btn" onClick={() => setShowOptionsMenu(true)} title="Game Options">
            <span className="bottom-btn-icon">⚙️</span>
            <span>Options</span>
          </button>
          <button className="bottom-action-btn" onClick={() => setShowThemeModal(true)} title="Color Theme">
            <span className="bottom-btn-icon">🎨</span>
            <span>Theme</span>
          </button>
          <button
            className="bottom-action-btn"
            onClick={() => stepToMove(activeMoveIndex - 1)}
            disabled={moveHistory.length === 0 || activeMoveIndex === 0}
            title="Previous Move"
          >
            <span className="bottom-btn-icon">‹</span>
            <span>Previous</span>
          </button>
          <button
            className="bottom-action-btn"
            onClick={() => stepToMove(activeMoveIndex + 1)}
            disabled={moveHistory.length === 0 || activeMoveIndex >= moveHistory.length}
            title="Next Move"
          >
            <span className="bottom-btn-icon">›</span>
            <span>Next</span>
          </button>
        </div>
      </div>

      {/* Clean Interactive Game Over Modal Popup */}
      {gameOver && !reviewMode && (
        <div className="modal-overlay" onClick={() => setReviewMode(true)}>
          <div className="modal-card" style={{ maxWidth: 400, textAlign: 'center', padding: '1.75rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '3rem', marginBottom: '0.4rem' }}>
              {gameOver === 'win' ? '🏆' : gameOver === 'loss' ? '😔' : '🤝'}
            </div>
            <h2 className="modal-title" style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>
              {gameOver === 'win' ? 'Victory!' : gameOver === 'loss' ? 'Defeat' : 'Draw Match'}
            </h2>
            <div style={{
              display: 'inline-block',
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              background: gameOver === 'win' ? 'rgba(16, 185, 129, 0.15)' : gameOver === 'loss' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: gameOver === 'win' ? '#34d399' : gameOver === 'loss' ? '#f87171' : '#fbbf24',
              fontWeight: 700,
              fontSize: '0.85rem',
              marginBottom: '1rem',
              border: `1px solid ${gameOver === 'win' ? 'rgba(16, 185, 129, 0.3)' : gameOver === 'loss' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
            }}>
              {status}
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              justifyContent: 'space-around',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)'
            }}>
              <div>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{moveHistory.length}</div>
                <div>Moves Played</div>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }} />
              <div>
                <div style={{ fontWeight: 800, color: tier.color, fontSize: '1.1rem' }}>{tier.name}</div>
                <div>AI Level {aiDepth}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={() => setReviewMode(true)}
              >
                <span>🔍</span>
                <span>Review Game & Moves</span>
              </button>
              
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  onClick={handlePlayAgain}
                >
                  <span>🔄</span>
                  <span>Play Again</span>
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  onClick={onBack}
                >
                  <span>🏠</span>
                  <span>Home</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Options Menu Modal */}
      {showOptionsMenu && (
        <GameOptionsMenu
          isOnlineGame={false}
          onOfferDraw={handleOfferDraw}
          onResign={handleResign}
          onOpenTheme={() => setShowThemeModal(true)}
          onClose={() => setShowOptionsMenu(false)}
        />
      )}

      {/* Theme Selector Modal */}
      {showThemeModal && (
        <ThemeSelector
          currentTheme={theme}
          onSelectTheme={handleSelectTheme}
          onClose={() => setShowThemeModal(false)}
        />
      )}
    </div>
  );
}
