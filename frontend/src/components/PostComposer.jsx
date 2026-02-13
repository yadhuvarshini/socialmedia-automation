import { useState, useEffect, useRef } from 'react';
import { api } from '../hooks/useAuth';
import { storage, auth } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './PostComposer.css';

export default function PostComposer({ onSuccess, integrations = [], selectedPlatform, onPlatformChange }) {
  const [content, setContent] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [postNow, setPostNow] = useState(true);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mediaItems, setMediaItems] = useState([]);
  const [mediaType, setMediaType] = useState('text'); // 'text', 'image', 'video', 'carousel'
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const fileInputRef = useRef(null);

  // Update platforms when selectedPlatform prop changes
  useEffect(() => {
    if (selectedPlatform) {
      setPlatforms([selectedPlatform]);
      // Reset after handling
      if (onPlatformChange) {
        // We delay this briefly to ensure the state is set
        setTimeout(() => onPlatformChange(null), 100);
      }
    }
  }, [selectedPlatform, onPlatformChange]);

  // Platform icons (simplified for brevity, should use the ones from Home.jsx or a common utility)
  const platformIcons = {
    linkedin: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    facebook: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    twitter: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    reddit: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    ),
    instagram: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 1 0 0-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 1 1-2.88 0 1.441 1.441 0 0 1 2.88 0z" />
      </svg>
    ),
    threads: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142l-.126 1.974a11.881 11.881 0 0 0-2.588-.122c-1.124.068-2.013.39-2.64.956-.6.541-.93 1.258-.896 2.024.032.738.414 1.37 1.077 1.78.579.358 1.354.515 2.184.445 1.149-.096 2.025-.531 2.607-1.294.646-.847.977-2.08.977-3.662v-.617c0-3.089-1.623-4.66-4.822-4.66-1.603 0-2.886.537-3.815 1.596-.929 1.06-1.402 2.526-1.402 4.356 0 1.83.473 3.296 1.402 4.356.929 1.059 2.212 1.596 3.815 1.596 1.074 0 2.036-.23 2.86-.683l.717 1.84c-1.007.55-2.228.83-3.577.83-2.042 0-3.694-.686-4.91-2.04-1.217-1.353-1.834-3.213-1.834-5.529 0-2.316.617-4.176 1.834-5.529 1.216-1.354 2.868-2.04 4.91-2.04 4.038 0 6.822 2.298 6.822 6.66v.617c0 2.006-.458 3.585-1.361 4.698-.903 1.113-2.229 1.69-3.944 1.716z" />
      </svg>
    )
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setError('');
    const newMediaItems = [...mediaItems];

    try {
      for (const file of files) {
        const fileRef = ref(storage, `posts/${auth.currentUser?.uid || 'anon'}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);

        const isVideo = file.type.startsWith('video/');
        newMediaItems.push({
          type: isVideo ? 'VIDEO' : 'IMAGE',
          imageUrl: isVideo ? null : url,
          videoUrl: isVideo ? url : null,
          preview: url,
          fileName: file.name
        });
      }
      setMediaItems(newMediaItems);
      if (newMediaItems.length > 1) {
        setMediaType('carousel');
      } else {
        setMediaType(newMediaItems[0].type === 'IMAGE' ? 'image' : 'video');
      }
    } catch (err) {
      console.error('File upload error:', err);
      setError('Failed to upload some files.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUrlAdd = async (type) => {
    const url = type === 'IMAGE' ? imageUrl : videoUrl;
    if (!url) return;

    setLoading(true);
    setError('');

    try {
      // In a real app, we might want to proxy/download the URL and upload to our own Storage
      // for reliability. For now, we'll just add it.
      const newItems = [...mediaItems, {
        type,
        imageUrl: type === 'IMAGE' ? url : null,
        videoUrl: type === 'VIDEO' ? url : null,
        preview: url
      }];
      setMediaItems(newItems);
      if (newItems.length > 1) setMediaType('carousel');
      else setMediaType(type === 'IMAGE' ? 'image' : 'video');

      setImageUrl('');
      setVideoUrl('');
    } catch (err) {
      setError('Failed to add URL.');
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platform) => {
    if (platforms.includes(platform)) {
      setPlatforms(platforms.filter(p => p !== platform));
    } else {
      setPlatforms([...platforms, platform]);
    }
  };

  const handleSubmit = async (e) => {
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

    if (platforms.length === 0) {
      setError('Please select at least one platform to post to.');
      return;
    }

    setLoading(true);

    try {
      // Post metadata to be sent to backend
      const postData = {
        content: trimmed,
        platforms: platforms,
        mediaType,
        mediaItems: mediaItems.map(item => ({
          type: item.type,
          url: item.imageUrl || item.videoUrl
        })),
        status: postNow ? 'publishing' : 'scheduled',
        scheduledAt: postNow ? null : new Date(scheduleAt).toISOString(),
      };

      // 2. Trigger backend publish
      let endpoint = '/posts';
      let body = { ...postData };

      if (mediaType === 'image' && mediaItems.length > 0) {
        endpoint = '/posts/image';
        body.imageUrl = mediaItems[0].imageUrl;
      } else if (mediaType === 'video' && mediaItems.length > 0) {
        endpoint = '/posts/video';
        body.videoUrl = mediaItems[0].videoUrl;
      } else if (mediaType === 'carousel' && mediaItems.length > 0) {
        endpoint = '/posts/carousel';
      }

      const res = await api(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to publish');

      setSuccess(postNow ? 'Post published successfully!' : 'Post scheduled successfully!');
      setContent('');
      setMediaItems([]);
      setMediaType('text');
      setPlatforms([]);
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="composer">
      <div className="composer__header">
        <h2 className="composer__title">Create Post</h2>
        <div className="composer__platform-icons">
          {integrations.filter(i => i.isActive).map((integration) => (
            <button
              key={integration.platform}
              type="button"
              className={`composer__platform-btn ${platforms.includes(integration.platform) ? 'composer__platform-btn--active' : ''}`}
              onClick={() => togglePlatform(integration.platform)}
              title={integration.platform}
            >
              {platformIcons[integration.platform] || integration.platform}
              {platforms.includes(integration.platform) && (
                <span className="composer__platform-check">✓</span>
              )}
            </button>
          ))}
          {integrations.length === 0 && (
            <p className="composer__no-platforms">No accounts connected</p>
          )}
        </div>
      </div>

      <form className="composer__form" onSubmit={handleSubmit}>
        <div className="composer__main">
          <textarea
            className="composer__textarea"
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
          />

          <div className="composer__media-actions">
            <button
              type="button"
              className="composer__action-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Upload
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileUpload}
              multiple
              accept="image/*,video/*"
            />
          </div>

          {mediaItems.length > 0 && (
            <div className="composer__media-gallery">
              {mediaItems.map((item, idx) => (
                <div key={idx} className="composer__media-thumbnail">
                  {item.type === 'IMAGE' ? (
                    <img src={item.preview} alt="" />
                  ) : (
                    <div className="composer__video-icon">▶</div>
                  )}
                  <button
                    type="button"
                    className="composer__media-remove"
                    onClick={() => {
                      const updated = mediaItems.filter((_, i) => i !== idx);
                      setMediaItems(updated);
                      if (updated.length === 0) setMediaType('text');
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="composer__footer">
          <div className="composer__schedule">
            <label className="composer__toggle">
              <input
                type="checkbox"
                checked={!postNow}
                onChange={() => setPostNow(!postNow)}
              />
              <span className="composer__toggle-label">Schedule for later</span>
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

          <div className="composer__submit-area">
            {error && <p className="composer__error">{error}</p>}
            {success && <p className="composer__success">{success}</p>}
            <button
              type="submit"
              className="composer__submit-btn"
              disabled={loading || (mediaType === 'text' && !content.trim())}
            >
              {loading ? 'Processing...' : postNow ? 'Publish Now' : 'Schedule Post'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
