import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../hooks/useAuth';
import LoadingScreen from '../components/LoadingScreen';
import './Planner.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PLATFORMS = ['linkedin', 'facebook', 'twitter', 'instagram', 'threads'];

export default function Planner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [posts, setPosts] = useState([]);
  const [scheduled, setScheduled] = useState({});
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduleModal, setScheduleModal] = useState(null);
  const [viewPostsModal, setViewPostsModal] = useState(null);
  const [scheduleContent, setScheduleContent] = useState('');
  const [schedulePlatforms, setSchedulePlatforms] = useState([]);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestedTimes, setSuggestedTimes] = useState({});
  const [editPostModal, setEditPostModal] = useState(null);
  const [reschedulePost, setReschedulePost] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [draggingPost, setDraggingPost] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [showSuggestedTimesModal, setShowSuggestedTimesModal] = useState(false);

  const [plannerView, setPlannerView] = useState('calendar');
  const [ideas, setIdeas] = useState([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasCategory, setIdeasCategory] = useState('social');
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [meData, setMeData] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, intRes, timesRes] = await Promise.all([
        api('/posts?limit=200'),
        api('/integrations'),
        api('/scheduling/suggested-times'),
      ]);
      const data = await res.json();
      const list = data.posts || [];
      setPosts(list);
      const byDate = {};
      list.filter((p) => p.scheduledAt || p.publishedAt).forEach((p) => {
        const d = new Date(p.scheduledAt || p.publishedAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!byDate[key]) byDate[key] = [];
        byDate[key].push(p);
      });
      setScheduled(byDate);
      if (intRes.ok) setIntegrations(await intRes.json());
      if (timesRes.ok) setSuggestedTimes(await timesRes.json());
    } catch (_) {
      setPosts([]);
      setScheduled({});
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    api('/me').then(r => r.ok ? r.json() : null).then(d => d && setMeData(d)).catch(() => {});
  }, []);

  const loadIdeas = useCallback(async () => {
    setIdeasLoading(true);
    try {
      const res = await api(`/trends/ideas?category=${ideasCategory}`);
      const data = await res.json();
      if (res.ok) setIdeas(data.ideas || []);
      else setIdeas([]);
    } catch (_) { setIdeas([]); }
    setIdeasLoading(false);
  }, [ideasCategory]);

  useEffect(() => {
    if (plannerView === 'ideas') loadIdeas();
  }, [plannerView, ideasCategory, loadIdeas]);

  const handleEmailSubscribe = async (useProfileEmail, confirmed) => {
    if (!confirmed) return;
    try {
      const email = useProfileEmail && meData?.email ? meData.email : null;
      const res = await api('/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailContentSuggestions: true, notificationEmail: email || meData?.email }),
      });
      if (res.ok) {
        setMeData(prev => ({ ...prev, emailContentSuggestions: true, notificationEmail: email || meData?.email }));
        setEmailModalOpen(false);
      }
    } catch (_) {}
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const blanks = Array(firstDay).fill(null);
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const cells = [...blanks, ...dates];

  const getKey = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const getSuggestedTimeForPlatform = (platform) => {
    const times = suggestedTimes[platform];
    return Array.isArray(times) && times.length > 0 ? times[0] : '09:00';
  };

  const openScheduleModal = (day) => {
    const d = new Date(year, month, day);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const key = getKey(day);
    const dayPosts = scheduled[key] || [];
    const isPast = d < new Date(new Date().setHours(0, 0, 0, 0));
    if (dayPosts.length > 0 || isPast) {
      setViewPostsModal({ dateStr, dateTime: `${dateStr}T09:00`, posts: dayPosts, isPast });
    } else {
      const plat = schedulePlatforms[0] || integrations.find((i) => i.isActive)?.platform || 'linkedin';
      const timeStr = getSuggestedTimeForPlatform(plat);
      setScheduleModal({ dateStr, dateTime: `${dateStr}T${timeStr}` });
      setScheduleContent('');
      setSchedulePlatforms([]);
      setAiTopic('');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this scheduled post?')) return;
    try {
      const res = await api(`/posts/${postId}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
        setViewPostsModal((m) => {
          const remaining = m.posts.filter((p) => p.id !== postId);
          return remaining.length ? { ...m, posts: remaining } : null;
        });
      }
    } catch (_) {
      alert('Failed to delete');
    }
  };

  const handleReschedule = async (postId, newDateStr, newTimeStr = '09:00') => {
    const post = posts.find((p) => p.id === postId);
    const oldKey = post?.scheduledAt ? `${new Date(post.scheduledAt).getFullYear()}-${String(new Date(post.scheduledAt).getMonth() + 1).padStart(2, '0')}-${String(new Date(post.scheduledAt).getDate()).padStart(2, '0')}` : null;
    const scheduledTime = `${newDateStr}T${newTimeStr}:00`;
    try {
      const res = await api(`/posts/${postId}/reschedule`, {
        method: 'PATCH',
        body: JSON.stringify({ scheduledTime }),
      });
      if (res.ok) {
        setReschedulePost(null);
        if (post) {
          const movedPost = { ...post, scheduledAt: new Date(scheduledTime).toISOString() };
          setScheduled((prev) => {
            const next = { ...prev };
            if (oldKey && next[oldKey]) {
              next[oldKey] = next[oldKey].filter((p) => p.id !== postId);
              if (next[oldKey].length === 0) delete next[oldKey];
            }
            if (!next[newDateStr]) next[newDateStr] = [];
            next[newDateStr] = [...next[newDateStr].filter((p) => p.id !== postId), movedPost];
            return next;
          });
          setPosts((prev) => prev.map((p) => (p.id === postId ? movedPost : p)));
          if (viewPostsModal?.dateStr === oldKey) {
            const remaining = (viewPostsModal.posts || []).filter((p) => p.id !== postId);
            setViewPostsModal(remaining.length ? { ...viewPostsModal, posts: remaining } : null);
          } else {
            setViewPostsModal(null);
          }
        } else {
          loadData();
          setViewPostsModal(null);
        }
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to reschedule');
      }
    } catch (_) {
      alert('Failed to reschedule');
    }
  };

  const handleDrop = (e, targetKey, day) => {
    e.preventDefault();
    setDropTarget(null);
    const postId = e.dataTransfer.getData('text/plain');
    if (!postId || !day) return;
    const post = posts.find((p) => p.id === postId);
    if (!post || post.status !== 'scheduled') return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const oldDate = new Date(post.scheduledAt);
    const timeStr = `${String(oldDate.getHours()).padStart(2, '0')}:${String(oldDate.getMinutes()).padStart(2, '0')}`;
    handleReschedule(postId, dateStr, timeStr);
    setDraggingPost(null);
  };

  const handleDragStart = (e, post) => {
    setDraggingPost(post.id);
    e.dataTransfer.setData('text/plain', post.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, key, day) => {
    e.preventDefault();
    if (day && draggingPost) setDropTarget(key);
  };

  const handleDragLeave = () => setDropTarget(null);

  const handleDragEnd = () => {
    setDraggingPost(null);
    setDropTarget(null);
  };

  const handleUpdatePost = async (postId, updates) => {
    try {
      const res = await api(`/posts/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        loadData();
        setEditPostModal(null);
        setViewPostsModal((m) => (m ? { ...m, posts: m.posts.map((p) => (p.id === postId ? { ...p, ...updates } : p)) } : null));
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to update');
      }
    } catch (_) {
      alert('Failed to update');
    }
  };

  const openAddPostForDay = (dateStr, dateTime, initialContent) => {
    setViewPostsModal(null);
    setScheduleModal({ dateStr, dateTime });
    setScheduleContent(initialContent ?? '');
    setSchedulePlatforms([]);
    setAiTopic('');
  };

  const togglePlatform = (p) => {
    const active = integrations.filter((i) => i.isActive).map((i) => i.platform);
    if (!active.includes(p)) return;
    setSchedulePlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    try {
      const platform = schedulePlatforms[0] || 'linkedin';
      const res = await api('/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, imagePrompt: '', platform }),
      });
      const data = await res.json();
      if (res.ok && data.content) {
        setScheduleContent((prev) => prev ? prev + '\n\n' + data.content : data.content);
        setAiTopic('');
      } else {
        alert(data.error || 'AI generation failed');
      }
    } catch (err) {
      alert(err.message || 'Failed to generate');
    }
    setAiLoading(false);
  };

  const submitSchedule = async () => {
    if (!scheduleModal || !scheduleContent.trim() || schedulePlatforms.length === 0) return;
    setScheduleSubmitting(true);
    try {
      const res = await api('/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: scheduleContent.trim(),
          scheduleAt: new Date(scheduleModal.dateTime).toISOString(),
          platforms: schedulePlatforms,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        loadData();
        setScheduleModal((m) => (m ? { ...m } : null));
        setScheduleContent('');
        setAiTopic('');
      } else {
        alert(data.error || 'Failed to schedule');
      }
    } catch (err) {
      alert(err.message || 'Failed to schedule');
    }
    setScheduleSubmitting(false);
  };

  const activeIntegrations = integrations.filter((i) => i.isActive);

  return (
    <div className="planner-page">
      {emailModalOpen && (
        <div className="planner-modal-overlay" onClick={() => setEmailModalOpen(false)}>
          <div className="planner-modal planner-email-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Email notifications for content suggestions</h3>
            <p className="planner-email-desc">We'll notify you when we have fresh content ideas based on your keywords and trends.</p>
            <p className="planner-email-address">Use this email: <strong>{meData?.email || 'Your profile email'}</strong></p>
            <p className="planner-email-hint">Confirm to use the same email from your profile for notifications.</p>
            <div className="planner-email-actions">
              <button className="planner-btn-secondary" onClick={() => setEmailModalOpen(false)}>Cancel</button>
              <button className="planner-btn-primary" onClick={() => handleEmailSubscribe(true, true)}>Yes, use my profile email</button>
            </div>
          </div>
        </div>
      )}

      <header className="planner-header">
        <div className="planner-header-top">
          <button className="planner-back" onClick={() => navigate('/home')}>← Back</button>
          <div className="planner-view-dropdown-wrap">
            <select
              className="planner-view-dropdown"
              value={plannerView}
              onChange={(e) => setPlannerView(e.target.value)}
            >
              <option value="calendar">Plan</option>
              <option value="ideas">Ideas</option>
            </select>
          </div>
        </div>
        <h1>{plannerView === 'ideas' ? 'Content Ideas' : 'Content Calendar'}</h1>
        <p className="planner-desc">
          {plannerView === 'ideas'
            ? 'AI-suggested post ideas based on your keywords and current trends. Refresh to get new ideas as trends change.'
            : 'Click a future date to schedule a post. Pick platforms and write your content.'}
        </p>
      </header>

      {plannerView === 'ideas' && (
        <div className="planner-ideas-view">
          <div className="planner-ideas-toolbar">
            <select value={ideasCategory} onChange={(e) => setIdeasCategory(e.target.value)} className="planner-ideas-select">
              <option value="social">Social & Content</option>
              <option value="business">Business</option>
              <option value="tech">Tech</option>
            </select>
            <button className="planner-ideas-refresh" onClick={loadIdeas} disabled={ideasLoading}>
              {ideasLoading ? 'Loading…' : '↻ Refresh'}
            </button>
          </div>
          {ideasLoading && ideas.length === 0 ? (
            <div className="planner-ideas-loading"><LoadingScreen compact /></div>
          ) : ideas.length === 0 ? (
            <p className="planner-ideas-empty">No ideas yet. Add keywords in Profile to get personalized suggestions.</p>
          ) : (
            <div className="planner-ideas-list">
              {ideas.map((idea, idx) => (
                <div key={idx} className="planner-idea-card">
                  <span className="planner-idea-platform">{idea.platform || 'social'}</span>
                  <h4>{idea.title || 'Post idea'}</h4>
                  <p className="planner-idea-body">{idea.postIdea}</p>
                  {idea.trend && <span className="planner-idea-trend">Trend: {idea.trend}</span>}
                  <button type="button" className="planner-idea-use" onClick={() => { setPlannerView('calendar'); openAddPostForDay(new Date().toISOString().slice(0, 10), new Date().toISOString().slice(0, 16), idea.postIdea || ''); }}>Use this idea</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {plannerView === 'calendar' && <div className="planner-toolbar">
        <div className="planner-nav">
          <button
            onClick={() => {
              if (month <= 0) { setYear((y) => y - 1); setMonth(11); }
              else setMonth((m) => m - 1);
            }}
          >
            ← Prev
          </button>
          <span className="planner-month">
            {new Date(year, month).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => {
              if (month >= 11) { setYear((y) => y + 1); setMonth(0); }
              else setMonth((m) => m + 1);
            }}
          >
            Next →
          </button>
        </div>
      </div>}

      {plannerView === 'calendar' && <div className="planner-calendar">
        <div className="planner-cal-header">
          {DAYS.map((d) => (
            <div key={d} className="planner-cal-day">{d}</div>
          ))}
        </div>
        <div className="planner-cal-grid">
          {cells.map((d, i) => {
            const key = d ? getKey(d) : null;
            const dayDate = d ? new Date(year, month, d) : null;
            const isPast = dayDate && dayDate < new Date();
            const isToday = dayDate && dayDate.toDateString() === new Date().toDateString();
            return (
              <div
                key={i}
                className={`planner-cal-cell ${!d ? 'planner-cal-cell--blank' : ''} ${isPast ? 'planner-cal-cell--past' : ''} ${isToday ? 'planner-cal-cell--today' : ''} ${dropTarget === key ? 'planner-cal-cell--drop' : ''}`}
                onClick={() => d && openScheduleModal(d)}
                onDragOver={(e) => handleDragOver(e, key, d)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, key, d)}
                data-date-key={key}
              >
                {d && (
                  <>
                    <span className="planner-cal-date">{d}</span>
                    {scheduled[key] && (
                      <div className="planner-cal-posts">
                        {scheduled[key].slice(0, 2).map((p) => (
                          <div
                            key={p.id}
                            className={`planner-cal-post planner-cal-post--draggable ${draggingPost === p.id ? 'planner-cal-post--dragging' : ''}`}
                            title={p.status === 'scheduled' ? 'Drag to another date' : (p.content?.slice(0, 80) || '')}
                            draggable={p.status === 'scheduled'}
                            onDragStart={(e) => p.status === 'scheduled' && handleDragStart(e, p)}
                            onDragEnd={handleDragEnd}
                          >
                            {(p.platforms || [])[0] || 'post'}
                          </div>
                        ))}
                        {scheduled[key].length > 2 && (
                          <span className="planner-cal-more">+{scheduled[key].length - 2}</span>
                        )}
                      </div>
                    )}
                    {!isPast && !scheduled[key] && <span className="planner-cal-add">+ Schedule</span>}
                  </>
                )}
              </div>
            );
          })}
        </div>
        <p className="planner-drag-hint">Drag scheduled posts between dates to reschedule</p>
      </div>}

      {scheduleModal && (
        <div className="planner-modal-overlay" onClick={() => !scheduleSubmitting && setScheduleModal(null)}>
          <div className="planner-modal" onClick={(e) => e.stopPropagation()}>
            {scheduleSubmitting && (
              <div className="planner-modal-loading-overlay">
                <LoadingScreen compact />
              </div>
            )}
            <h3>Schedule post</h3>
            <div className="planner-modal-datetime">
              <span className="planner-modal-label">Date & time</span>
              <div className="planner-modal-datetime-row">
                <input
                  type="datetime-local"
                  className="planner-modal-datetime-input"
                  value={scheduleModal.dateTime}
                  onChange={(e) => setScheduleModal((m) => ({ ...m, dateTime: e.target.value }))}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <button
                  type="button"
                  className="planner-suggested-btn"
                  onClick={() => setShowSuggestedTimesModal(true)}
                  title="View AI suggested times per platform"
                >
                  AI Suggested
                </button>
              </div>
              {showSuggestedTimesModal && (
                <div className="planner-suggested-modal">
                  <h4>Suggested posting times by platform</h4>
                  <div className="planner-suggested-grid">
                    {activeIntegrations.map((i) => (
                      <div key={i.id} className="planner-suggested-platform">
                        <strong>{i.platform}</strong>
                        <div className="planner-suggested-times">
                          {(suggestedTimes[i.platform] || ['09:00']).map((t, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="planner-suggested-time-btn"
                              onClick={() => {
                                const [h, m] = t.split(':');
                                const d = new Date(scheduleModal.dateTime);
                                d.setHours(parseInt(h, 10), parseInt(m || 0, 10));
                                setScheduleModal((prev) => ({ ...prev, dateTime: d.toISOString().slice(0, 16) }));
                                setShowSuggestedTimesModal(false);
                              }}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="planner-suggested-close" onClick={() => setShowSuggestedTimesModal(false)}>
                    Close
                  </button>
                </div>
              )}
              <span className="planner-modal-time-display">
                → {new Date(scheduleModal.dateTime).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
            <div className="planner-modal-platforms">
              <span className="planner-modal-label">Platforms</span>
              {activeIntegrations.map((i) => (
                <label key={i.id} className="planner-modal-platform">
                  <input
                    type="checkbox"
                    checked={schedulePlatforms.includes(i.platform)}
                    onChange={() => togglePlatform(i.platform)}
                  />
                  {i.platform}
                </label>
              ))}
            </div>
            {activeIntegrations.length === 0 && (
              <p className="planner-modal-hint">Connect platforms in the sidebar to schedule.</p>
            )}
            <div className="planner-modal-content-box">
              <div className="planner-modal-ai-inline">
                <input
                  type="text"
                  className="planner-modal-ai-input"
                  placeholder="Describe topic (e.g. Monday motivation)"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                />
                <button
                  type="button"
                  className="planner-modal-ai-btn"
                  onClick={handleAiGenerate}
                  disabled={!aiTopic.trim() || aiLoading}
                >
                  {aiLoading ? '…' : 'Generate'}
                </button>
              </div>
              <textarea
                className="planner-modal-textarea"
                placeholder="Write your post or use AI to generate (can generate multiple times)"
                value={scheduleContent}
                onChange={(e) => setScheduleContent(e.target.value)}
                rows={5}
              />
            </div>
            <div className="planner-modal-actions">
              <button className="planner-modal-cancel" onClick={() => setScheduleModal(null)}>
                Cancel
              </button>
              <button
                className="planner-modal-submit"
                onClick={submitSchedule}
                disabled={scheduleSubmitting || !scheduleContent.trim() || schedulePlatforms.length === 0}
              >
                {scheduleSubmitting ? 'Scheduling…' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reschedulePost && (
        <div className="planner-modal-overlay" onClick={() => setReschedulePost(null)}>
          <div className="planner-modal planner-modal--small" onClick={(e) => e.stopPropagation()}>
            <h3>Reschedule post</h3>
            <input
              type="datetime-local"
              value={
                reschedulePost.newDate
                  ? (() => {
                      const d = new Date(reschedulePost.newDate);
                      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    })()
                  : ''
              }
              onChange={(e) => setReschedulePost((p) => ({ ...p, newDate: e.target.value }))}
              min={new Date().toISOString().slice(0, 16)}
            />
            <div className="planner-modal-actions">
              <button onClick={() => setReschedulePost(null)}>Cancel</button>
              <button
                className="planner-modal-submit"
                onClick={() => {
                  const [dateStr, timePart] = reschedulePost.newDate.split('T');
                  const timeStr = timePart ? timePart.slice(0, 5) : '09:00';
                  handleReschedule(reschedulePost.id, dateStr, timeStr);
                  setReschedulePost(null);
                }}
              >
                Move
              </button>
            </div>
          </div>
        </div>
      )}

      {editPostModal && (
        <div className="planner-modal-overlay" onClick={() => setEditPostModal(null)}>
          <div className="planner-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit scheduled post</h3>
            <div className="planner-modal-datetime">
              <span className="planner-modal-label">Date & time</span>
              <input
                type="datetime-local"
                className="planner-modal-datetime-input"
                value={editPostModal.scheduledAt ? new Date(editPostModal.scheduledAt).toISOString().slice(0, 16) : ''}
                onChange={(e) => setEditPostModal((p) => ({ ...p, scheduledAt: new Date(e.target.value).toISOString() }))}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <textarea
              className="planner-modal-textarea"
              value={editPostModal.content || ''}
              onChange={(e) => setEditPostModal((p) => ({ ...p, content: e.target.value }))}
              rows={4}
            />
            <div className="planner-modal-actions">
              <button className="planner-modal-cancel" onClick={() => setEditPostModal(null)}>Cancel</button>
              <button
                className="planner-modal-submit"
                onClick={() => handleUpdatePost(editPostModal.id, {
                  content: editPostModal.content,
                  scheduleAt: editPostModal.scheduledAt,
                })}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {viewPostsModal && (
        <div className="planner-modal-overlay" onClick={() => setViewPostsModal(null)}>
          <div className="planner-modal planner-modal--view" onClick={(e) => e.stopPropagation()}>
            <h3>{viewPostsModal.isPast ? 'Posted on' : 'Scheduled for'} {new Date(viewPostsModal.dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</h3>
            <div className="planner-view-posts">
              {viewPostsModal.posts.length === 0 ? (
                <p className="planner-view-empty">{viewPostsModal.isPast ? 'No posts on this day' : 'No posts yet'}</p>
              ) : viewPostsModal.posts.map((p) => (
                <div
                  key={p.id}
                  className="planner-view-post"
                >
                  {p.imageUrl && (
                    <div className="planner-view-post__thumb">
                      <img src={p.imageUrl} alt="" />
                    </div>
                  )}
                  <div className="planner-view-post__body">
                    <p className="planner-view-post__content">{p.content?.slice(0, 150)}{(p.content?.length || 0) > 150 ? '…' : ''}</p>
                    <div className="planner-view-post__meta">
                      <span className="planner-view-post__platforms">{(p.platforms || []).join(', ')}</span>
                      <span className={`planner-view-post__status planner-view-post__status--${p.status}`}>{p.status}</span>
                      <span>{new Date(p.scheduledAt || p.publishedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
                    </div>
                    <div className="planner-view-post__actions">
                      {p.status === 'scheduled' && (
                        <>
                          <button type="button" className="planner-view-post__edit" onClick={() => setEditPostModal(p)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="planner-view-post__reschedule"
                            onClick={() => setReschedulePost({ ...p, newDate: `${viewPostsModal.dateStr}T${new Date(p.scheduledAt).toTimeString().slice(0, 5)}` })}
                          >
                            Reschedule
                          </button>
                        </>
                      )}
                      {p.status === 'scheduled' && (
                        <button type="button" className="planner-view-post__delete" onClick={() => handleDeletePost(p.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="planner-modal-actions">
              <button className="planner-modal-cancel" onClick={() => setViewPostsModal(null)}>Close</button>
              {!viewPostsModal.isPast && (
                <button className="planner-modal-submit" onClick={() => openAddPostForDay(viewPostsModal.dateStr, viewPostsModal.dateTime)}>
                  + Add another post
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && <div className="planner-loading"><LoadingScreen compact /></div>}
    </div>
  );
}
