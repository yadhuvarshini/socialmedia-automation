import { api } from '../hooks/useAuth';
import './PostList.css';

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function statusLabel(status) {
  const map = { draft: 'Draft', scheduled: 'Scheduled', published: 'Published', failed: 'Failed' };
  return map[status] || status;
}

function statusClass(status) {
  const map = { draft: 'muted', scheduled: 'warning', published: 'success', failed: 'error' };
  return map[status] || 'muted';
}

export default function PostList({ posts, onUpdate }) {
  const handleDelete = (id) => {
    if (!window.confirm('Delete this post?')) return;
    api(`/posts/${id}`, { method: 'DELETE' })
      .then((r) => r.ok && onUpdate?.())
      .catch(() => { });
  };

  if (!posts?.length) {
    return (
      <div className="post-list__empty-container">
        <p className="post-list__empty">0 posts so far</p>
        <p className="post-list__empty-sub">Create your first post above to get started!</p>
      </div>
    );
  }

  return (
    <ul className="post-list">
      {posts.map((post) => {
        if (!post || !post.id) return null;
        return (
          <li key={post.id} className="post-list__item">
            <p className="post-list__content">{post.content || '(No content)'}</p>
            <div className="post-list__meta">
              <span className={`post-list__status post-list__status--${statusClass(post.status)}`}>
                {statusLabel(post.status)}
              </span>
              {post.scheduledAt && post.status === 'scheduled' && (
                <span className="post-list__date">Scheduled: {formatDate(post.scheduledAt)}</span>
              )}
              {post.publishedAt && (
                <span className="post-list__date">Published: {formatDate(post.publishedAt)}</span>
              )}
            </div>
            {post.error && <p className="post-list__error">{post.error}</p>}
            {(post.status === 'draft' || post.status === 'scheduled') && (
              <button
                type="button"
                className="post-list__delete"
                onClick={() => handleDelete(post.id)}
              >
                Delete
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
