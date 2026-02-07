import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../hooks/useAuth';
import PostComposer from '../components/PostComposer';
import PostList from '../components/PostList';
import './Home.css';

export default function Home() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [integrations, setIntegrations] = useState([]);
    const [activeView, setActiveView] = useState('posts');

    const loadPosts = () => {
        api('/posts')
            .then((r) => r.json())
            .then(setPosts)
            .catch(() => setPosts([]))
            .finally(() => setLoading(false));
    };

    const loadIntegrations = () => {
        api('/integrations')
            .then((r) => r.json())
            .then(setIntegrations)
            .catch(() => setIntegrations([]));
    };

    useEffect(() => {
        loadPosts();
        loadIntegrations();
    }, []);

    const name = user?.profile
        ? [user.profile.firstName, user.profile.lastName].filter(Boolean).join(' ') || 'User'
        : 'User';

    const handleConnectIntegration = (platform) => {
        window.location.href = `/api/auth/integrations/${platform}`;
    };

    const handleDisconnectIntegration = async (integrationId) => {
        if (!confirm('Are you sure you want to disconnect this integration?')) return;

        try {
            const res = await api(`/integrations/${integrationId}`, { method: 'DELETE' });
            if (res.ok) {
                loadIntegrations();
            }
        } catch (err) {
            alert('Failed to disconnect integration');
        }
    };

    const platformIcons = {
        linkedin: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
        ),
        facebook: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
        ),
        twitter: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
        ),
        threads: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142l-.126 1.974a11.881 11.881 0 0 0-2.588-.122c-1.124.068-2.013.39-2.64.956-.6.541-.93 1.258-.896 2.024.032.738.414 1.37 1.077 1.78.579.358 1.354.515 2.184.445 1.149-.096 2.025-.531 2.607-1.294.646-.847.977-2.08.977-3.662v-.617c0-3.089-1.623-4.66-4.822-4.66-1.603 0-2.886.537-3.815 1.596-.929 1.06-1.402 2.526-1.402 4.356 0 1.83.473 3.296 1.402 4.356.929 1.059 2.212 1.596 3.815 1.596 1.074 0 2.036-.23 2.86-.683l.717 1.84c-1.007.55-2.228.83-3.577.83-2.042 0-3.694-.686-4.91-2.04-1.217-1.353-1.834-3.213-1.834-5.529 0-2.316.617-4.176 1.834-5.529 1.216-1.354 2.868-2.04 4.91-2.04 4.038 0 6.822 2.298 6.822 6.66v.617c0 2.006-.458 3.585-1.361 4.698-.903 1.113-2.229 1.69-3.944 1.716z" />
            </svg>
        ),
    };

    const platformColors = {
        linkedin: '#0077b5',
        facebook: '#1877f2',
        twitter: '#000000',
        threads: '#000000',
    };

    const platformNames = {
        linkedin: 'LinkedIn',
        facebook: 'Facebook',
        twitter: 'Twitter',
        threads: 'Threads',
    };

    const availablePlatforms = ['linkedin', 'facebook', 'twitter', 'threads'];
    const connectedPlatforms = integrations.filter(i => i.isActive).map(i => i.platform);

    return (
        <div className="home">
            {/* Vertical Sidebar */}
            <aside className="home__sidebar">
                <div className="home__brand">
                    <span className="home__logo">B</span>
                    <span className="home__title">Blazly</span>
                </div>

                <nav className="home__nav">
                    <button
                        className={`home__nav-item ${activeView === 'posts' ? 'home__nav-item--active' : ''}`}
                        onClick={() => setActiveView('posts')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        Posts
                    </button>
                </nav>

                {/* Integrations Section */}
                <div className="home__integrations">
                    <h3 className="home__integrations-title">Integrations</h3>
                    <div className="home__integrations-list">
                        {availablePlatforms.map((platform) => {
                            const integration = integrations.find(i => i.platform === platform && i.isActive);
                            const isConnected = !!integration;

                            return (
                                <div
                                    key={platform}
                                    className={`home__integration ${isConnected ? 'home__integration--connected' : ''}`}
                                >
                                    <div className="home__integration-icon" style={{ color: platformColors[platform] }}>
                                        {platformIcons[platform]}
                                    </div>
                                    <div className="home__integration-info">
                                        <div className="home__integration-name">{platformNames[platform]}</div>
                                        {isConnected && integration.profile?.name && (
                                            <div className="home__integration-account">{integration.profile.name}</div>
                                        )}
                                    </div>
                                    {isConnected ? (
                                        <button
                                            className="home__integration-btn home__integration-btn--disconnect"
                                            onClick={() => handleDisconnectIntegration(integration._id)}
                                            title="Disconnect"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    ) : (
                                        <button
                                            className="home__integration-btn home__integration-btn--connect"
                                            onClick={() => handleConnectIntegration(platform)}
                                        >
                                            Connect
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* User Section */}
                <div className="home__sidebar-footer">
                    <div className="home__user">
                        {user?.profile?.profilePicture && (
                            <img
                                src={user.profile.profilePicture}
                                alt=""
                                className="home__avatar"
                            />
                        )}
                        <span className="home__name">{name}</span>
                    </div>
                    <button type="button" className="home__logout" onClick={logout}>
                        Sign out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="home__main">
                {activeView === 'posts' && (
                    <>
                        <section className="home__composer">
                            <PostComposer onSuccess={loadPosts} integrations={integrations} />
                        </section>
                        <section className="home__posts">
                            <h2 className="home__section-title">Your posts</h2>
                            {loading ? (
                                <p className="home__loading">Loading posts…</p>
                            ) : (
                                <PostList posts={posts} onUpdate={loadPosts} />
                            )}
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}
