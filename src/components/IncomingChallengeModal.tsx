'use client';
import { useEffect, useState } from 'react';
import type { FriendChallenge } from '@/lib/challenges';
import { playChallengeNotificationChime } from '@/lib/challenges';

interface Props {
  challenge: FriendChallenge;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingChallengeModal({ challenge, onAccept, onDecline }: Props) {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    // Play subtle notification sound on pop up
    playChallengeNotificationChime();

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onDecline]);

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
          maxWidth: 420,
          background: 'linear-gradient(145deg, #182234, #0f1624)',
          border: '2px solid #7cb6e1',
          borderRadius: 24,
          padding: '1.75rem 1.5rem',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(124, 182, 225, 0.35)',
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

        {/* Animated Sword Icon */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(124, 182, 225, 0.25), rgba(124, 182, 225, 0.05))',
            border: '2px solid rgba(124, 182, 225, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            margin: '0 auto 1.25rem',
            boxShadow: '0 0 24px rgba(124, 182, 225, 0.4)',
          }}
        >
          ⚔️
        </div>

        <h3
          style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            color: '#f0f0f0',
            margin: '0 0 0.5rem',
            letterSpacing: '-0.02em',
          }}
        >
          Chess Challenge!
        </h3>

        <div style={{ margin: '0 0 1.25rem' }}>
          <span
            style={{
              fontSize: '1.2rem',
              fontWeight: 800,
              color: '#7cb6e1',
              display: 'inline-block',
            }}
          >
            {challenge.challengerName}
          </span>{' '}
          <span
            style={{
              fontSize: '0.85rem',
              color: 'rgba(240, 240, 240, 0.6)',
              fontWeight: 700,
            }}
          >
            {challenge.challengerTag}
          </span>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginTop: '0.4rem',
              background: 'rgba(124, 182, 225, 0.15)',
              padding: '0.2rem 0.65rem',
              borderRadius: 20,
              fontSize: '0.78rem',
              color: '#7cb6e1',
              fontWeight: 700,
            }}
          >
            ⭐ {challenge.challengerRating} rating
          </div>
        </div>

        <p
          style={{
            fontSize: '0.88rem',
            color: 'rgba(240, 240, 240, 0.75)',
            margin: '0 0 1.5rem',
            lineHeight: 1.4,
          }}
        >
          Challenged you to a <strong>10-Minute Rapid Chess Match</strong>.
          Accept to start playing immediately!
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onDecline}
            style={{
              flex: 1,
              padding: '0.85rem 1rem',
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
            ✕ Decline
          </button>

          <button
            onClick={onAccept}
            style={{
              flex: 1.4,
              padding: '0.85rem 1rem',
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #7cb6e1, #5a9ed1)',
              color: '#0a101d',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(124, 182, 225, 0.4)',
              transition: 'all 0.15s ease',
            }}
          >
            ⚔️ Accept
          </button>
        </div>

        <div
          style={{
            fontSize: '0.74rem',
            color: 'rgba(240, 240, 240, 0.45)',
            marginTop: '0.85rem',
          }}
        >
          Auto-declining in {timeLeft}s
        </div>
      </div>
    </div>
  );
}
