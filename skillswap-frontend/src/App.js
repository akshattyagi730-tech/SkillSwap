import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider }        from './context/SocketContext';
import { ThemeProvider }         from './context/ThemeContext';
import NeuralBackground          from './components/NeuralBackground';
import Navbar         from './components/Navbar';
import AuthPage       from './pages/AuthPage';
import Dashboard      from './pages/Dashboard';
import Profile        from './pages/Profile';
import Matches        from './pages/Matches';
import Chat           from './pages/Chat';
import Rating         from './pages/Rating';
import ForgotPassword from './pages/ForgotPassword';

const PrivateRoute = ({ children }) => {
  const { token, loading } = useAuth();
  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>Loading...</div>;
  return token ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? <Navigate to="/dashboard" replace /> : children;
};

// ── Page transition wrapper ─────────────────────────
const AnimatedPage = ({ children }) => {
  const location = useLocation();
  const ref      = useRef(null);
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname;
      const el = ref.current;
      if (el) {
        el.classList.remove('page-enter');
        void el.offsetWidth;
        el.classList.add('page-enter');
      }
    }
  }, [location.pathname]);

  return (
    <div ref={ref} className="page-enter" style={{ position: 'relative', zIndex: 1, flex: 1 }}>
      {children}
    </div>
  );
};

const AppRoutes = () => {
  const { token } = useAuth();
  return (
    <>
      {token && <Navbar />}
      <AnimatedPage>
        <Routes>
          <Route path="/"                element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
          <Route path="/login"           element={<PublicRoute><AuthPage /></PublicRoute>} />
          <Route path="/signup"          element={<PublicRoute><AuthPage signup /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/dashboard"       element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/profile"         element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/matches"         element={<PrivateRoute><Matches /></PrivateRoute>} />
          <Route path="/chat"            element={<PrivateRoute><Chat /></PrivateRoute>} />
          <Route path="/chat/:userId"    element={<PrivateRoute><Chat /></PrivateRoute>} />
          <Route path="/rating/:userId"  element={<PrivateRoute><Rating /></PrivateRoute>} />
          <Route path="*"                element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatedPage>
    </>
  );
};

// ── Main layout wrapper ─────────────────────────────
const AppLayout = () => {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NeuralBackground />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <AppRoutes />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}