import { useState, useEffect } from 'react';
import './LoadingScreen.css';

const FALLBACK_TIPS = [
  'LinkedIn: Best times Tue 11 AM, Wed 10 AM, Fri 10 AM.',
  'Write short, punchy hooks in the first line.',
  'Use 2–5 relevant hashtags on LinkedIn.',
];

export default function LoadingScreen({ compact = false, lightBg = false }) {
  const [tip, setTip] = useState(FALLBACK_TIPS[Math.floor(Math.random() * FALLBACK_TIPS.length)]);

  useEffect(() => {
    fetch('/data/tips.json')
      .then((r) => r.json())
      .then((data) => {
        const all = [...(data.platformTips || []), ...(data.writingTips || [])];
        if (all.length) setTip(all[Math.floor(Math.random() * all.length)]);
      })
      .catch(() => {});
  }, []);

  return (
    <div className={`loading-screen ${compact ? 'loading-screen--compact' : ''} ${lightBg ? 'loading-screen--light-bg' : ''}`}>
      <div className="loading-screen__spinner" aria-hidden />
      <p className="loading-screen__text">Loading…</p>
      {tip && (
        <div className="loading-screen__tip">
          <span className="loading-screen__tip-badge">Pro tip</span>
          <p>{tip}</p>
        </div>
      )}
    </div>
  );
}
