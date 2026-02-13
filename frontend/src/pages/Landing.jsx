import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
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
        <div className="landing__loader">Loading…</div>
      </div>
    );
  }

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        // Update Firebase Auth profile
        await updateProfile(newUser, {
          displayName: `${firstName} ${lastName}`.trim()
        });

        // Create document in Firestore
        await setDoc(doc(db, 'users', newUser.uid), {
          email: newUser.email,
          firstName,
          lastName,
          createdAt: new Date().toISOString(),
          profilePicture: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`
        });
      }
      // useAuth will detect the change via onAuthStateChanged
    } catch (err) {
      console.error('Auth Error:', err);
      let message = 'Authentication failed';
      if (err.code === 'auth/user-not-found') message = 'No user found with this email.';
      if (err.code === 'auth/wrong-password') message = 'Incorrect password.';
      if (err.code === 'auth/email-already-in-use') message = 'Email is already in use.';
      if (err.code === 'auth/weak-password') message = 'Password should be at least 6 characters.';
      if (err.code === 'auth/invalid-email') message = 'Invalid email address.';

      setFormError(message || err.message);
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
      </div>
      <div className="landing__bg" aria-hidden />
    </div>
  );
}
