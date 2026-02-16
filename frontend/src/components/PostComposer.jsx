import { useState, useEffect, useRef } from 'react';
import { api } from '../hooks/useAuth';
import { storage, auth } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './PostComposer.css';

const PLATFORM_LIMITS = {
  linkedin: 3000,
  twitter: 280,
  instagram: 2200,
  facebook: 63206,
  threads: 500,
  reddit: 10000
};

export default function PostComposer({
  onSuccess,
  integrations = [],
  selectedPlatform,
  onPlatformChange,
  theme = 'standard'
}) {
  const [content, setContent] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [postNow, setPostNow] = useState(true);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // AI State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiImagePrompt, setAiImagePrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const [mediaItems, setMediaItems] = useState([]);
  const [mediaType, setMediaType] = useState('text'); // 'text', 'image', 'video', 'carousel'
  const fileInputRef = useRef(null);

  const currentLimit = platforms.length > 0
    ? Math.min(...platforms.map(p => PLATFORM_LIMITS[p] || 5000))
    : 5000;

  const charCount = content.trim().length;
  const isOverLimit = charCount > currentLimit;

  // Selected integration for the current view
  const activeIntegration = integrations.find(i => i.platform === selectedPlatform && i.isActive);

  // Update platforms when selectedPlatform prop changes
  useEffect(() => {
    if (selectedPlatform) {
      setPlatforms([selectedPlatform]);
      // If we change platform, we don't automatically expand unless it's standard theme
      if (theme === 'standard') setIsExpanded(true);
    }
  }, [selectedPlatform, theme]);

  const platformIcons = {
    linkedin: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
    ),
    facebook: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
    ),
    twitter: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
    ),
    instagram: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 1 0 0-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 1 1-2.88 0 1.441 1.441 0 0 1 2.88 0z" /></svg>
    ),
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
      setIsExpanded(true); // Auto expand if files uploaded
    } catch (err) {
      console.error('File upload error:', err);
      setError('Failed to upload some files.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUrlSubmit = (e) => {
    if (e) e.preventDefault();
    if (!mediaUrl) return;

    setLoading(true);
    const isVideo = mediaUrl.match(/\.(mp4|mov|avi|wmv)$|video|drive\.google|vimeo|youtube/i);

    const newItem = {
      type: isVideo ? 'VIDEO' : 'IMAGE',
      imageUrl: isVideo ? null : mediaUrl,
      videoUrl: isVideo ? mediaUrl : null,
      preview: mediaUrl,
      fileName: 'URL Media'
    };

    const newMediaItems = [...mediaItems, newItem];
    setMediaItems(newMediaItems);

    if (newMediaItems.length > 1) {
      setMediaType('carousel');
    } else {
      setMediaType(newMediaItems[0].type === 'IMAGE' ? 'image' : 'video');
    }

    setMediaUrl('');
    setShowUrlInput(false);
    setIsExpanded(true);
    setLoading(false);
  };

  const togglePlatform = (platform) => {
    if (platforms.includes(platform)) {
      setPlatforms(platforms.filter(p => p !== platform));
    } else {
      setPlatforms([...platforms, platform]);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiTopic.trim()) return;

    setAiLoading(true);
    try {
      const res = await api('/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          imagePrompt: aiImagePrompt,
          platform: selectedPlatform || 'linkedin'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generation failed');

      // Populate content
      let newContent = data.content;
      if (data.hashtags && data.hashtags.length > 0) {
        newContent += '\n\n' + data.hashtags.join(' ');
      }
      setContent(newContent);

      // Populate Image if keyword exists
      if (data.imageKeyword) {
        // Use Unsplash Source for a quick relevant image
        const generatedImageUrl = `https://source.unsplash.com/1600x900/?${encodeURIComponent(data.imageKeyword)}`;
        setMediaUrl(generatedImageUrl);

        // Trigger the URL handler logic manually since we can't easily call handleUrlSubmit with a fake event safely
        const newItem = {
          type: 'IMAGE',
          imageUrl: generatedImageUrl,
          videoUrl: null,
          preview: generatedImageUrl,
          fileName: 'AI Generated Image'
        };
        setMediaItems([newItem]);
        setMediaType('image');
      }

      setAiModalOpen(false);
      setAiTopic('');
      setAiImagePrompt('');
    } catch (err) {
      alert('AI Error: ' + err.message);
    } finally {
      setAiLoading(false);
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
      setError('Please select at least one platform.');
      return;
    }

    setLoading(true);

    try {
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
      setIsExpanded(false);
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isLinkedIn = theme === 'linkedin' || selectedPlatform === 'linkedin';

  if (!isExpanded && isLinkedIn) {
    return (
      <div className="composer-trigger-bar">
        <div className="composer-trigger-bar__main">
          <img src={activeIntegration?.profile?.profilePicture || '/default-avatar.png'} alt="" className="composer-trigger-bar__avatar" />
          <button className="composer-trigger-bar__input" onClick={() => setIsExpanded(true)}>
            Start a post
          </button>
        </div>
        <div className="composer-trigger-bar__actions">
          <button className="trigger-action" onClick={() => { setIsExpanded(true); fileInputRef.current?.click(); }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#378fe9"><path d="M19 4H5a3 3 0 00-3 3v10a3 3 0 003 3h14a3 3 0 003-3V7a3 3 0 00-3-3zm1 13a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h14a1 1 0 011 1v10z" /><circle cx="8" cy="10" r="2" /><path d="M16 9l-4 4-2-2-4 4v1h14v-4z" /></svg>
            <span>Media</span>
          </button>
          <button className="trigger-action">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#5f9b41"><path d="M19 4H5a3 3 0 00-3 3v10a3 3 0 003 3h14a3 3 0 003-3V7a3 3 0 00-3-3zm1 13a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h14a1 1 0 011 1v10z" /><path d="M16 10.5l4-2v7l-4-2v-3zM7 9h7v2H7V9zm0 4h7v2H7v-2z" /></svg>
            <span>Video</span>
          </button>
          <button className="trigger-action">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#c37d16"><path d="M19 4H5a3 3 0 00-3 3v10a3 3 0 003 3h14a3 3 0 003-3V7a3 3 0 00-3-3zm1 13a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h14a1 1 0 011 1v10z" /><path d="M9 14h6v2H9v-2zm0-4h6v2H9v-2zm0-4h6v2H9v-2zm0-4h6v2H9V6z" /></svg>
            <span>Article</span>
          </button>
        </div>
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*,video/*" />
      </div>
    );
  }

  return (
    <>
      {aiModalOpen && (
        <div className="ai-modal-overlay">
          <div className="ai-modal">
            <h3>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"></path><path d="M12 2a10 10 0 0 1 10 10"></path><path d="M12 12 2.1 10.5"></path></svg>
              Generate with Gemini AI
            </h3>
            <p style={{ margin: 0, color: '#666' }}>Describe what you want to post about, and our AI will write the copy and find an image for you.</p>
            <textarea
              placeholder="Ex: A professional update about launching our new sustainability initiative..."
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              autoFocus
              style={{ marginBottom: '12px' }}
            />
            <input
              type="text"
              placeholder="Image Context (Optional) - Ex: 'Green office space'"
              value={aiImagePrompt}
              onChange={(e) => setAiImagePrompt(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d0d0d0',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
            <div className="ai-modal__actions">
              <button className="btn-secondary" onClick={() => setAiModalOpen(false)}>Cancel</button>
              <button className="btn-primary-ai" onClick={handleAIGenerate} disabled={aiLoading || !aiTopic.trim()}>
                {aiLoading ? 'Generating...' : '✨ Generate Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`composer ${isLinkedIn ? 'composer--linkedin' : ''}`}>
        {isLinkedIn && (
          <div className="composer__modal-header">
            <h3>Create a post</h3>
            <button className="close-btn" onClick={() => setIsExpanded(false)}>×</button>
          </div>
        )}

        {!isLinkedIn && (
          <div className="composer__header">
            <h2 className="composer__title">Create Post</h2>
            <div className="composer__platform-icons">
              {integrations.filter(i => i.isActive).map((integration) => (
                <button
                  key={integration.platform}
                  type="button"
                  className={`composer__platform-btn composer__platform-btn--${integration.platform} ${platforms.includes(integration.platform) ? 'composer__platform-btn--active' : ''}`}
                  onClick={() => togglePlatform(integration.platform)}
                  title={integration.platform}
                >
                  {platformIcons[integration.platform] || integration.platform}
                  {platforms.includes(integration.platform) && (
                    <span className="composer__platform-check">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <form className="composer__form" onSubmit={handleSubmit}>
          <div className="composer__main">
            {isLinkedIn && (
              <div className="composer__user-info">
                <img src={activeIntegration?.profile?.profilePicture || '/default-avatar.png'} alt="" />
                <div>
                  <strong>{activeIntegration?.profile?.name || 'User'}</strong>
                  <span className="visibility-badge">Public</span>
                </div>
              </div>
            )}

            <textarea
              className="composer__textarea"
              placeholder={isLinkedIn ? "What do you want to talk about?" : "What's on your mind?"}
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
              <button
                type="button"
                className={`composer__action-btn composer__ai-btn`}
                onClick={() => setAiModalOpen(true)}
                disabled={loading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                AI Generate
              </button>
              <button
                type="button"
                className={`composer__action-btn ${showUrlInput ? 'composer__action-btn--active' : ''}`}
                onClick={() => setShowUrlInput(!showUrlInput)}
                disabled={loading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                URL
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

            {(showUrlInput || mediaItems.length > 0) && (
              <div className="composer__attachments-tray">
                {showUrlInput && (
                  <div className="composer__url-bar">
                    <input
                      type="text"
                      className="composer__url-field"
                      placeholder="Paste image/video URL..."
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit(e)}
                      autoFocus
                    />
                    <button type="button" className="composer__url-add" onClick={handleUrlSubmit} disabled={!mediaUrl}>
                      Add
                    </button>
                  </div>
                )}

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
                <span className="composer__toggle-label">Schedule</span>
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
              <div className="composer__actions-row">
                <span className={`composer__counter ${isOverLimit ? 'composer__counter--error' : ''}`}>
                  {charCount} / {currentLimit}
                </span>
                <button
                  type="submit"
                  className="composer__submit-btn"
                  disabled={loading || (mediaType === 'text' && !content.trim()) || isOverLimit || platforms.length === 0}
                >
                  {loading ? '...' : postNow ? 'Post' : 'Schedule'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
