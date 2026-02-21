import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, api } from '../hooks/useAuth';
import PlatformLogo from './PlatformLogo';
import './AppLayout.css';

const PLATFORMS = ['linkedin', 'facebook', 'twitter', 'instagram', 'threads'];
const platformLabels = { linkedin: 'LinkedIn', facebook: 'Facebook', twitter: 'X', instagram: 'Instagram', threads: 'Threads' };

const NavIcon = ({ d, viewBox = '0 0 24 24' }) => (
  <svg width="20" height="20" viewBox={viewBox} fill="currentColor"><path d={d} /></svg>
);

const GREETINGS = {
  en: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Good night' },
  es: { morning: 'Buenos días', afternoon: 'Buenas tardes', evening: 'Buenas noches', night: 'Buenas noches' },
  fr: { morning: 'Bonjour', afternoon: 'Bon après-midi', evening: 'Bonsoir', night: 'Bonne nuit' },
  de: { morning: 'Guten Morgen', afternoon: 'Guten Tag', evening: 'Guten Abend', night: 'Gute Nacht' },
  hi: { morning: 'शुभ प्रभात', afternoon: 'शुभ दोपहर', evening: 'शुभ संध्या', night: 'शुभ रात्रि' },
  ta: { morning: 'காலை வணக்கம்', afternoon: 'மதிய வணக்கம்', evening: 'மாலை வணக்கம்', night: 'இரவு வணக்கம்' },
};

function getGreeting() {
  const hour = new Date().getHours();
  const locale = (navigator.language || 'en').split('-')[0];
  const t = GREETINGS[locale] || GREETINGS.en;
  let period;
  if (hour >= 5 && hour < 12) period = t.morning;
  else if (hour >= 12 && hour < 17) period = t.afternoon;
  else if (hour >= 17 && hour < 21) period = t.evening;
  else period = t.night;
  return { text: period, icon: hour >= 5 && hour < 18 ? 'sun' : 'moon' };
}

const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);
const MoonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const navItems = [
  { path: '/home', label: 'Home', icon: <NavIcon d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" /> },
  { path: '/posts', label: 'Posts', icon: <NavIcon d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" /> },
  { path: '/planner', label: 'Planner', icon: <NavIcon d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" /> },
  { path: '/inbox', label: 'Inbox', icon: <NavIcon d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /> },
  { path: '/integrations', label: 'Integrations', icon: <NavIcon d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /> },
];

export default function AppLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [integrations, setIntegrations] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifDismissed, setNotifDismissed] = useState(() => {
    try {
      const d = localStorage.getItem('app_ideas_notif_dismiss');
      if (!d) return false;
      const t = JSON.parse(d);
      return t && Date.now() - t < 24 * 60 * 60 * 1000;
    } catch (_) { return false; }
  });

  const loadIntegrations = () => {
    api('/integrations').then((r) => r.json()).then(setIntegrations).catch(() => setIntegrations([]));
  };

  useEffect(() => {
    loadIntegrations();
    const params = new URLSearchParams(location.search);
    if (params.get('integration') && params.get('status') === 'connected') loadIntegrations();
  }, [location.search, location.pathname]);

  const handleConnectPlatform = async (p) => {
    const int = integrations.find((i) => i.platform === p && i.isActive);
    if (int) { navigate(`/home?platform=${p}`); return; }
    try {
      await api('/auth/session', { method: 'POST' });
      window.location.href = `/api/auth/integrations/${p}`;
    } catch (_) { alert('Failed to start connection.'); }
  };

  const dismissNotif = () => {
    setNotifDismissed(true);
    try { localStorage.setItem('app_ideas_notif_dismiss', JSON.stringify(Date.now())); } catch (_) {}
  };

  const isActive = (path) => location.pathname === path;

  const connectedIntegrations = integrations.filter((i) => i.isActive);
  const userName = user?.profile?.firstName || user?.profile?.lastName || user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const { text: greetingText, icon: greetingIcon } = getGreeting();

  return (
    <div className="app-layout">
      {!notifDismissed && (
        <div className="app-layout__top-notif">
          <span>You have content suggestions</span>
          <button onClick={() => { navigate('/planner'); dismissNotif(); }}>View Ideas</button>
          <button className="app-layout__notif-dismiss" onClick={dismissNotif} aria-label="Dismiss">×</button>
        </div>
      )}

      <div className="app-layout__body">
        <aside className="app-layout__integrations-sidebar">
          <div className="app-layout__sidebar-brand" onClick={() => navigate('/home')}>
            <span className="app-layout__sidebar-logo">B</span>
            <span className="app-layout__sidebar-name">Blazly</span>
          </div>
          {user && (
            <div className="app-layout__sidebar-greeting">
              <span className={`app-layout__sidebar-greeting-icon ${greetingIcon === 'moon' ? 'app-layout__sidebar-greeting-icon--moon' : ''}`}>{greetingIcon === 'sun' ? <SunIcon /> : <MoonIcon />}</span>
              <span className="app-layout__sidebar-greeting-text">{greetingText}, {userName}!</span>
            </div>
          )}
          <div className="app-layout__sidebar-platforms">
            {connectedIntegrations.length > 0 ? (
              connectedIntegrations.map((int) => (
                <button
                  key={int.platform}
                  className="app-layout__sidebar-item"
                  onClick={() => handleConnectPlatform(int.platform)}
                  title={platformLabels[int.platform]}
                >
                  <span className="app-layout__sidebar-icon">
                    <PlatformLogo platform={int.platform} size={24} />
                  </span>
                  <span className="app-layout__sidebar-label">{platformLabels[int.platform]}</span>
                  <span className="app-layout__sidebar-dot" aria-hidden />
                </button>
              ))
            ) : (
              <button className="app-layout__sidebar-connect" onClick={() => navigate('/integrations')} title="Connect platforms">
                <span className="app-layout__sidebar-icon">+</span>
                <span className="app-layout__sidebar-label">Connect</span>
              </button>
            )}
          </div>
        </aside>

        <div className="app-layout__content">
          <header className="app-layout__header">
            <nav className="app-layout__nav">
              {navItems.map(({ path, label, icon }) => (
                <button
                  key={path}
                  className={`app-layout__nav-tab ${isActive(path) ? 'active' : ''}`}
                  onClick={() => { navigate(path); setMenuOpen(false); }}
                  title={label}
                >
                  <span className="app-layout__nav-icon">{icon}</span>
                  <span className="app-layout__nav-label">{label}</span>
                </button>
              ))}
            </nav>

            <div className="app-layout__header-right">
              <button className="app-layout__profile-btn" onClick={() => navigate('/profile')} title="Profile">
                {user?.profile?.profilePicture ? (
                  <img src={user.profile.profilePicture} alt="" />
                ) : (
                  <span>{(user?.email?.[0] || 'U').toUpperCase()}</span>
                )}
              </button>
              <button className="app-layout__logout" onClick={logout} title="Sign Out">Sign out</button>
              <button className="app-layout__hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
                <span /><span /><span />
              </button>
            </div>
          </header>

              {menuOpen && (
            <div className="app-layout__mobile-menu">
              {navItems.map(({ path, label, icon }) => (
                <button key={path} className={`app-layout__mobile-item ${isActive(path) ? 'active' : ''}`} onClick={() => { navigate(path); setMenuOpen(false); }}>
                  <span className="app-layout__mobile-icon">{icon}</span>
                  {label}
                </button>
              ))}
              <button className="app-layout__mobile-item" onClick={() => { navigate('/profile'); setMenuOpen(false); }}>
                Profile
              </button>
              <button className="app-layout__mobile-item" onClick={() => { logout(); setMenuOpen(false); }}>
                Sign out
              </button>
            </div>
          )}

          <main className="app-layout__main">{children}</main>
        </div>
      </div>
    </div>
  );
}
