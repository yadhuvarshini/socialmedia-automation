import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, api } from '../hooks/useAuth';
import LoadingScreen from '../components/LoadingScreen';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const errorParam = searchParams.get('error');

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
        <LoadingScreen />
      </div>
    );
  }

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/signup';
      const body = isLogin
        ? { email, password }
        : { email, password, firstName, lastName };

      const res = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFormError(data.error || 'Authentication failed');
        setSubmitting(false);
        return;
      }

      if (data.token) {
        localStorage.setItem('blazly_token', data.token);
      }
      window.location.href = data.isNew ? '/onboarding' : '/home';
    } catch (err) {
      console.error('Auth Error:', err);
      setFormError('Network error. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="landing">
      <div className="landing__card">
        <div className="landing__logo">
          <span className="landing__logo-icon">B</span>
          <span className="landing__logo-text">Blazly</span>
        </div>

        <p className="landing__tagline">Social media automation — create & schedule in one place.</p>

        {(errorParam || formError) && (
          <div className="landing__error">
            {decodeURIComponent(errorParam || formError)}
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
              />
              <input
                type="text"
                placeholder="Last Name"
                className="landing__input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
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
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            className="landing__toggle-btn"
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setFormError('');
            }}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
      <div className="landing__bg" aria-hidden />
    </div>
  );
}
