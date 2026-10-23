'use client';
import { useEffect, useState } from 'react';
import type { Friend } from '@/lib/friends';
import {
  listenToOutgoingChallenge,
  cancelFriendChallenge,
  clearChallenge,
  type FriendChallenge,
} from '@/lib/challenges';

interface Props {
  friend: Friend;
  challengeId: string;
  onAccepted: (challenge: FriendChallenge) => void;
  onDeclined: () => void;
  onCancel: () => void;
}

export default function OutgoingChallengeModal({
  friend,
  challengeId,
  onAccepted,
  onDeclined,
  onCancel,
}: Props) {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    // Listen for friend's response in real-time via Firestore
    const unsub = listenToOutgoingChallenge(challengeId, (challenge) => {
      if (challenge.status === 'accepted') {
        onAccepted(challenge);
      } else if (challenge.status === 'declined') {
        onDeclined();
      }
    });

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          cancelFriendChallenge(challengeId).catch(() => {});
          onDeclined();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [challengeId, onAccepted, onDeclined]);

  function handleCancelClick() {
    clearChallenge(challengeId).catch(() => {});
    onCancel();
  }

  const progressPercent = Math.max(0, (timeLeft / 30) * 100);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(5, 10, 20, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.25s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'linear-gradient(145deg, #182234, #0f1624)',
          border: '1.5px solid rgba(124, 182, 225, 0.4)',
          borderRadius: 24,
          padding: '2rem 1.5rem',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(124, 182, 225, 0.25)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated Countdown Progress Bar at Top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: '#7cb6e1',
              transition: 'width 1s linear',
            }}
          />
        </div>

        {/* Pulsing Radar Ring Indicator */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(124, 182, 225, 0.12)',
            border: '2px dashed #7cb6e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.4rem',
            margin: '0 auto 1.5rem',
            animation: 'spin 12s linear infinite',
            boxShadow: '0 0 20px rgba(124, 182, 225, 0.3)',
          }}
        >
          ♟
        </div>

        <h3
          style={{
            fontSize: '1.3rem',
            fontWeight: 800,
            color: '#f0f0f0',
            margin: '0 0 0.5rem',
            letterSpacing: '-0.02em',
          }}
        >
          Challenging {friend.username}…
        </h3>

        <p
          style={{
            fontSize: '0.88rem',
            color: 'rgba(240, 240, 240, 0.7)',
            margin: '0 0 1.5rem',
            lineHeight: 1.4,
          }}
        >
          A prompt has appeared on their screen.<br />
          The match will begin automatically when they accept!
        </p>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '0.4rem 1rem',
            borderRadius: 20,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '0.82rem',
            color: '#7cb6e1',
            fontWeight: 700,
            marginBottom: '1.5rem',
          }}
        >
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#7cb6e1', animation: 'pulse 1.5s infinite' }} />
          Waiting for response ({timeLeft}s)
        </div>

        <div>
          <button
            onClick={handleCancelClick}
            style={{
              width: '100%',
              padding: '0.8rem',
              borderRadius: 14,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#f0f0f0',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Cancel Challenge
          </button>
        </div>
      </div>
    </div>
  );
}
