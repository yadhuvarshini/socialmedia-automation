import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './RedditSubredditSelection.css';

export default function RedditSubredditSelection() {
  const navigate = useNavigate();
  const [subreddits, setSubreddits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState(null);
  const [customSubreddit, setCustomSubreddit] = useState('');

  useEffect(() => {
    fetch('/api/auth/integrations/reddit/subreddits', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setSubreddits(data.subreddits || []);
        }
      })
      .catch((err) => {
        setError('Failed to load subreddits. Please try again.');
        console.error('Error loading subreddits:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelectSubreddit = async (subredditName) => {
    setSelecting(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/integrations/reddit/select-subreddit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subreddit: subredditName }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setSelecting(false);
      } else {
        window.location.href = '/home?integration=reddit&status=connected';
      }
    } catch (err) {
      setError('Failed to select subreddit. Please try again.');
      setSelecting(false);
      console.error('Error selecting subreddit:', err);
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const trimmed = customSubreddit.trim().replace(/^r\//, '');
    if (trimmed) {
      handleSelectSubreddit(trimmed);
    }
  };

  if (loading) {
    return (
      <div className="reddit-subreddit-selection">
        <div className="reddit-subreddit-selection__card">
          <div className="reddit-subreddit-selection__loader">Loading subreddits...</div>
        </div>
      </div>
    );
  }

  if (error && subreddits.length === 0) {
    return (
      <div className="reddit-subreddit-selection">
        <div className="reddit-subreddit-selection__card">
          <div className="reddit-subreddit-selection__error">{error}</div>
          <button
            className="reddit-subreddit-selection__retry"
            onClick={() => (window.location.href = '/api/auth/integrations/reddit')}
          >
            Sign in again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reddit-subreddit-selection">
      <div className="reddit-subreddit-selection__card">
        <h1 className="reddit-subreddit-selection__title">Select a Subreddit</h1>
        <p className="reddit-subreddit-selection__subtitle">
          Choose which subreddit you want to post to, or enter a custom one.
        </p>

        {error && <div className="reddit-subreddit-selection__error">{error}</div>}

        <form className="reddit-subreddit-selection__custom" onSubmit={handleCustomSubmit}>
          <input
            type="text"
            placeholder="Enter subreddit name (e.g. technology)"
            value={customSubreddit}
            onChange={(e) => setCustomSubreddit(e.target.value)}
            className="reddit-subreddit-selection__input"
            disabled={selecting}
          />
          <button
            type="submit"
            className="reddit-subreddit-selection__submit"
            disabled={selecting || !customSubreddit.trim()}
          >
            {selecting ? '...' : 'Use this'}
          </button>
        </form>

        {subreddits.length > 0 && (
          <>
            <div className="reddit-subreddit-selection__divider">Or pick from your subscriptions</div>
            <div className="reddit-subreddit-selection__list">
              {subreddits.slice(0, 20).map((sub) => (
                <button
                  key={sub.display_name}
                  className="reddit-subreddit-selection__item"
                  onClick={() => handleSelectSubreddit(sub.display_name)}
                  disabled={selecting}
                >
                  <div className="reddit-subreddit-selection__item-info">
                    <h3 className="reddit-subreddit-selection__item-name">{sub.name}</h3>
                    <p className="reddit-subreddit-selection__item-subs">
                      {sub.subscribers ? `${(sub.subscribers / 1000).toFixed(1)}k members` : ''}
                    </p>
                  </div>
                  {selecting ? (
                    <div className="reddit-subreddit-selection__spinner">...</div>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
