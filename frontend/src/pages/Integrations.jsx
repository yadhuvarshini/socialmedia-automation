import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../hooks/useAuth';
import './Integrations.css';

const PLATFORMS = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    color: '#0a66c2',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    color: '#1877F2',
  },
  {
    id: 'twitter',
    name: 'Twitter',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    color: '#000000',
  },
  {
    id: 'threads',
    name: 'Threads',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
      </svg>
    ),
    color: '#000000',
  },
];

export default function Integrations() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(null);
  const error = searchParams.get('error');
  const success = searchParams.get('success');

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const res = await api('/integrations');
      const data = await res.json();
      setIntegrations(data);
    } catch (err) {
      console.error('Error loading integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (platformId) => {
    window.location.href = `/api/auth/integrations/${platformId}`;
  };

  const handleDisconnect = async (platformId) => {
    if (!confirm(`Are you sure you want to disconnect ${platformId}?`)) {
      return;
    }

    setDisconnecting(platformId);
    try {
      const res = await api(`/integrations/${platformId}`, { method: 'DELETE' });
      if (res.ok) {
        await loadIntegrations();
      }
    } catch (err) {
      console.error('Error disconnecting:', err);
    } finally {
      setDisconnecting(null);
    }
  };

  const getIntegration = (platformId) => {
    return integrations.find((i) => i.platform === platformId);
  };

  if (loading) {
    return (
      <div className="integrations">
        <div className="integrations__loading">Loading integrations...</div>
      </div>
    );
  }

  return (
    <div className="integrations">
      <div className="integrations__header">
        <h1 className="integrations__title">Integrations</h1>
        <p className="integrations__subtitle">
          Connect your social media accounts to start posting
        </p>
      </div>

      {error && (
        <div className="integrations__alert integrations__alert--error">
          {decodeURIComponent(error)}
        </div>
      )}

      {success && (
        <div className="integrations__alert integrations__alert--success">
          Successfully connected to {success}!
        </div>
      )}

      <div className="integrations__list">
        {PLATFORMS.map((platform) => {
          const integration = getIntegration(platform.id);
          const isConnected = !!integration;
          const isDisconnecting = disconnecting === platform.id;

          return (
            <div key={platform.id} className="integrations__item">
              <div className="integrations__item-header">
                <div
                  className="integrations__item-icon"
                  style={{ color: platform.color }}
                >
                  {platform.icon}
                </div>
                <div className="integrations__item-info">
                  <h3 className="integrations__item-name">{platform.name}</h3>
                  {isConnected && integration.profile?.name && (
                    <p className="integrations__item-account">
                      Connected as {integration.profile.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="integrations__item-actions">
                {isConnected ? (
                  <button
                    className="integrations__button integrations__button--disconnect"
                    onClick={() => handleDisconnect(platform.id)}
                    disabled={isDisconnecting}
                  >
                    {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                ) : (
                  <button
                    className="integrations__button integrations__button--connect"
                    onClick={() => handleConnect(platform.id)}
                    style={{ backgroundColor: platform.color }}
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
