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
  const [mediaItems, setMediaItems] = useState([]);
  const [mediaType, setMediaType] = useState('text'); // 'text', 'image', 'video', 'carousel'
  const [videoMediaType, setVideoMediaType] = useState('VIDEO'); // 'VIDEO' or 'REELS'
  const [imageUrl, setImageUrl] = useState(''); // For direct URL input
  const [videoUrl, setVideoUrl] = useState(''); // For direct URL input

  // Auto-select all connected platforms
  useEffect(() => {
    if (integrations.length > 0 && selectedPlatforms.length === 0) {
      setSelectedPlatforms(integrations.map(i => i.platform));
    }
  }, [integrations]);

  const removeMediaItem = (index) => {
    const updated = mediaItems.filter((_, i) => i !== index);
    setMediaItems(updated);
    if (updated.length === 0) {
      setMediaType('text');
    } else if (updated.length === 1) {
      setMediaType(updated[0].type === 'IMAGE' ? 'image' : 'video');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const trimmed = content.trim();

    if (mediaType === 'text' && !trimmed) {
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

    if (mediaType === 'carousel' && mediaItems.length < 2) {
      setError('Carousel requires at least 2 media items.');
      return;
    }

    setLoading(true);

    // Determine which endpoint to use
    let endpoint = '/posts';
    let body = {};

    if (mediaType === 'image' && mediaItems.length > 0) {
      endpoint = '/posts/image';
      body = {
        content: trimmed,
        imageUrl: mediaItems[0].imageUrl,
        platforms: selectedPlatforms
      };
    } else if (mediaType === 'video' && mediaItems.length > 0) {
      endpoint = '/posts/video';
      body = {
        content: trimmed,
        videoUrl: mediaItems[0].videoUrl,
        platforms: selectedPlatforms,
        mediaType: mediaItems[0].type
      };
    } else if (mediaType === 'carousel' && mediaItems.length >= 2) {
      endpoint = '/posts/carousel';
      body = {
        content: trimmed,
        mediaItems: mediaItems.map(item => ({
          type: item.type,
          imageUrl: item.imageUrl,
          videoUrl: item.videoUrl
        })),
        platforms: selectedPlatforms
      };
    } else {
      // Text post
      body = postNow
        ? { content: trimmed, platforms: selectedPlatforms }
        : { content: trimmed, scheduleAt: new Date(scheduleAt).toISOString(), platforms: selectedPlatforms };
    }

    api(endpoint, {
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
        setMediaItems([]);
        setMediaType('text');
        setImageUrl('');
        setVideoUrl('');
        
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
        } else if (r.instagram) {
          setSuccess(postNow ? 'Posted to Instagram!' : 'Scheduled for Instagram.');
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
        <div className="composer__media-tabs">
          <button
            type="button"
            className={`composer__tab ${mediaType === 'text' ? 'composer__tab--active' : ''}`}
            onClick={() => { setMediaType('text'); setMediaItems([]); }}
          >
            Text
          </button>
          <button
            type="button"
            className={`composer__tab ${mediaType === 'image' ? 'composer__tab--active' : ''}`}
            onClick={() => setMediaType('image')}
          >
            Image
          </button>
          <button
            type="button"
            className={`composer__tab ${mediaType === 'video' ? 'composer__tab--active' : ''}`}
            onClick={() => setMediaType('video')}
          >
            Video
          </button>
          <button
            type="button"
            className={`composer__tab ${mediaType === 'carousel' ? 'composer__tab--active' : ''}`}
            onClick={() => setMediaType('carousel')}
          >
            Carousel
          </button>
        </div>

        <textarea
          className="composer__textarea"
          placeholder={mediaType === 'text' ? 'What do you want to share?' : 'Add a caption (optional)'}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          disabled={loading}
          maxLength={2200}
        />

        {(mediaType === 'image' || mediaType === 'carousel') && (
          <div className="composer__upload-section">
            <label className="composer__url-label">
              Image URL (must be HTTPS):
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={loading}
                className="composer__url-input"
              />
            </label>
            {imageUrl && (
              <button
                type="button"
                className="composer__add-media-btn"
                onClick={() => {
                  if (imageUrl.startsWith('https://')) {
                    setMediaItems([...mediaItems, { 
                      type: 'IMAGE', 
                      imageUrl, 
                      preview: imageUrl 
                    }]);
                    setImageUrl('');
                    setMediaType(mediaItems.length === 0 ? 'image' : 'carousel');
                  } else {
                    setError('Image URL must start with https://');
                  }
                }}
                disabled={loading}
              >
                Add Image
              </button>
            )}
            <p className="composer__info-text">
              ℹ️ Instagram requires publicly accessible HTTPS image URLs. Use services like Imgur, AWS S3, or Cloudinary.
            </p>
          </div>
        )}

        {(mediaType === 'video' || mediaType === 'carousel') && (
          <div className="composer__upload-section">
            <label className="composer__url-label">
              Video URL (must be HTTPS):
              <input
                type="url"
                placeholder="https://example.com/video.mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                disabled={loading}
                className="composer__url-input"
              />
            </label>
            {videoUrl && (
              <button
                type="button"
                className="composer__add-media-btn"
                onClick={() => {
                  if (videoUrl.startsWith('https://')) {
                    setMediaItems([...mediaItems, { 
                      type: videoMediaType, 
                      videoUrl, 
                      preview: videoUrl 
                    }]);
                    setVideoUrl('');
                    setMediaType(mediaItems.length === 0 ? 'video' : 'carousel');
                  } else {
                    setError('Video URL must start with https://');
                  }
                }}
                disabled={loading}
              >
                Add Video
              </button>
            )}
            {mediaType === 'video' && (
              <div className="composer__video-type">
                <label>
                  <input
                    type="radio"
                    name="videoType"
                    value="VIDEO"
                    checked={videoMediaType === 'VIDEO'}
                    onChange={(e) => setVideoMediaType(e.target.value)}
                  />
                  Video (up to 60 minutes)
                </label>
                <label>
                  <input
                    type="radio"
                    name="videoType"
                    value="REELS"
                    checked={videoMediaType === 'REELS'}
                    onChange={(e) => setVideoMediaType(e.target.value)}
                  />
                  Reel (up to 90 seconds)
                </label>
              </div>
            )}
            <p className="composer__info-text">
              ℹ️ Instagram requires publicly accessible HTTPS video URLs. Use services like AWS S3 or Cloudinary.
            </p>
          </div>
        )}

        {mediaItems.length > 0 && (
          <div className="composer__media-preview">
            <p className="composer__preview-title">
              {mediaItems.length} item{mediaItems.length > 1 ? 's' : ''} selected
            </p>
            <div className="composer__preview-grid">
              {mediaItems.map((item, idx) => (
                <div key={idx} className="composer__preview-item">
                  {item.type === 'IMAGE' ? (
                    <img src={item.imageUrl} alt={`Media ${idx + 1}`} />
                  ) : (
                    <div className="composer__preview-video">
                      <div className="composer__video-placeholder">▶ VIDEO</div>
                      <span className="composer__media-type">{item.type}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    className="composer__remove-media"
                    onClick={() => removeMediaItem(idx)}
                    disabled={loading}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
