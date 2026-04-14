import { BrowserRouter as Router } from 'react-router-dom';
import { ReactLenis } from 'lenis/react';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import AnimatedRoutes from './components/AnimatedRoutes';

export default function App() {
  return (
    <ErrorBoundary>
      <ReactLenis root options={{ lerp: 0.1, duration: 1.5, smoothWheel: true }}>
        <AuthProvider>
          <Router>
            <ScrollToTop />
            <AnimatedRoutes />
          </Router>
        </AuthProvider>
      </ReactLenis>
    </ErrorBoundary>
  );
}
