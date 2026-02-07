import { useState, useEffect } from 'react';
import { api } from '../hooks/useAuth';
import './PostComposer.css';

export default function PostComposer({ onSuccess, integrations = [] }) {
  const [content, setContent] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [postNow, setPostNow] = useState(true);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto-select all connected platforms
  useEffect(() => {
    if (integrations.length > 0 && selectedPlatforms.length === 0) {
      setSelectedPlatforms(integrations.map(i => i.platform));
    }
  }, [integrations]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const trimmed = content.trim();
    if (!trimmed) {
      setError('Write something to post.');
      return;
    }
    if (!postNow && !scheduleAt) {
      setError('Pick a date and time for scheduling.');
      return;
    }
    if (selectedPlatforms.length === 0) {
      setError('Please select at least one platform to post to.');
      return;
    }

    setLoading(true);
    const body = postNow
      ? { content: trimmed, platforms: selectedPlatforms }
      : { content: trimmed, scheduleAt: new Date(scheduleAt).toISOString(), platforms: selectedPlatforms };
    api('/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(d?.error || 'Failed'));
        return r.json();
      })
      .then((r) => {
        setContent('');
        setScheduleAt('');
        if (postNow && r.results && r.results.length > 0) {
          const platformLinks = r.results.map((result, idx) => (
            <span key={idx}>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'inherit', textDecoration: 'underline' }}
              >
                {result.platform}
              </a>
              {idx < r.results.length - 1 && ', '}
            </span>
          ));
          setSuccess(
            <span>
              Posted to {platformLinks}!{' '}
              {r.errors && r.errors.length > 0 && (
                <span style={{ color: '#c33' }}>
                  ({r.errors.length} failed)
                </span>
              )}
            </span>
          );
        } else {
          setSuccess(postNow ? 'Posted successfully!' : 'Scheduled.');
        }
        onSuccess?.();
      })
      .catch((err) => setError(typeof err === 'string' ? err : err?.message || 'Something went wrong'))
      .finally(() => setLoading(false));
};

return (
  <div className="composer">
    <h2 className="composer__title">New post</h2>
    <form className="composer__form" onSubmit={handleSubmit}>
      <textarea
        className="composer__textarea"
        placeholder="What do you want to share?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
        disabled={loading}
        maxLength={500}
      />
      {integrations.length > 0 && (
        <div className="composer__platforms">
          <label className="composer__label">Post to:</label>
          <div className="composer__platform-list">
            {integrations.map((integration) => (
              <label key={integration.platform} className="composer__platform-checkbox">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(integration.platform)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedPlatforms([...selectedPlatforms, integration.platform]);
                    } else {
                      setSelectedPlatforms(selectedPlatforms.filter(p => p !== integration.platform));
                    }
                  }}
                />
                <span className="composer__platform-name">{integration.platform}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="composer__options">
        <label className="composer__radio">
          <input
            type="radio"
            name="when"
            checked={postNow}
            onChange={() => setPostNow(true)}
          />
          <span>Post now</span>
        </label>
        <label className="composer__radio">
          <input
            type="radio"
            name="when"
            checked={!postNow}
            onChange={() => setPostNow(false)}
          />
          <span>Schedule</span>
        </label>
        {!postNow && (
          <input
            type="datetime-local"
            className="composer__datetime"
            value={scheduleAt}
            onChange={(e) => setScheduleAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
          />
        )}
      </div>
      {error && <p className="composer__error">{error}</p>}
      {success && <p className="composer__success">{success}</p>}
      <button type="submit" className="composer__submit" disabled={loading}>
        {loading ? 'Posting…' : postNow ? 'Post now' : 'Schedule'}
      </button>
    </form>
  </div>
);
}
