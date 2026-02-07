import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Landing from './pages/Landing';
import Home from './pages/Home';
import FacebookPageSelection from './pages/FacebookPageSelection';
import RedditSubredditSelection from './pages/RedditSubredditSelection';
import InstagramAccountSelection from './pages/InstagramAccountSelection';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading">Loading…</div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/integrations/facebook/select-page"
        element={
          <ProtectedRoute>
            <FacebookPageSelection />
          </ProtectedRoute>
        }
      />
      <Route
        path="/integrations/reddit/select-subreddit"
        element={
          <ProtectedRoute>
            <RedditSubredditSelection />
          </ProtectedRoute>
        }
      />
      <Route
        path="/integrations/instagram/select-account"
        element={
          <ProtectedRoute>
            <InstagramAccountSelection />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
