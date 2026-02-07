import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const error = searchParams.get('error');

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && !loading) navigate('/home', { replace: true });
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="landing">
        <div className="landing__loader">Loading…</div>
      </div>
    );
  }

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const body = isLogin
        ? { email, password }
        : { email, password, firstName, lastName };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include'
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Force reload to update auth state
      window.location.reload();

    } catch (err) {
      setFormError(err.message);
      setSubmitting(false);
    }
  };

  const signInLinkedin = () => { window.location.href = '/api/auth/linkedin'; };
  const signInFacebook = () => { window.location.href = '/api/auth/facebook'; };
  const signInTwitter = () => { window.location.href = '/api/auth/twitter'; };

  return (
    <div className="landing">
      <div className="landing__card">
        <div className="landing__logo">
          <span className="landing__logo-icon">B</span>
          <span className="landing__logo-text">Blazly</span>
        </div>

        <p className="landing__tagline">Social media automation — create & schedule in one place.</p>

        {(error || formError) && (
          <div className="landing__error">
            {decodeURIComponent(error || formError)}
          </div>
        )}

        <form className="landing__form" onSubmit={handleEmailAuth}>
          {!isLogin && (
            <div className="landing__row">
              <input
                type="text"
                placeholder="First Name"
                className="landing__input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required={!isLogin}
              />
              <input
                type="text"
                placeholder="Last Name"
                className="landing__input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required={!isLogin}
              />
            </div>
          )}

          <input
            type="email"
            placeholder="Email address"
            className="landing__input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="landing__input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          <button
            type="submit"
            className="landing__cta landing__cta--primary"
            disabled={submitting}
          >
            {submitting ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="landing__toggle">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            className="landing__toggle-btn"
            onClick={() => {
              setIsLogin(!isLogin);
              setFormError('');
              setEmail('');
              setPassword('');
            }}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>

        <div className="landing__divider">Or continue with</div>

        <div className="landing__socials">
          <button type="button" className="landing__social-btn landing__social-btn--linkedin" onClick={signInLinkedin} title="LinkedIn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </button>

          <button type="button" className="landing__social-btn landing__social-btn--facebook" onClick={signInFacebook} title="Facebook">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </button>

          <button type="button" className="landing__social-btn landing__social-btn--twitter" onClick={signInTwitter} title="Twitter">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </button>
        </div>
      </div>
      <div className="landing__bg" aria-hidden />
    </div>
  );
}
