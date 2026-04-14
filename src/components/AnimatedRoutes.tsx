import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import Layout from './Layout';
import LoadingScreen from './LoadingScreen';
import { useAuth } from '../context/AuthContext';
import { lazyWithRetry } from '../utils/lazyWithRetry';

// Lazy load pages with retry logic
const HomePage = lazyWithRetry(() => import('../pages/HomePage'));
const EncyclopediaPage = lazyWithRetry(() => import('../pages/EncyclopediaPage'));
const GuidePage = lazyWithRetry(() => import('../pages/GuidePage'));
const CalibrationPage = lazyWithRetry(() => import('../pages/CalibrationPage'));
const FieldGuidePage = lazyWithRetry(() => import('../pages/FieldGuidePage'));
const AdvisorPage = lazyWithRetry(() => import('../pages/AdvisorPage'));
const ComparePage = lazyWithRetry(() => import('../pages/ComparePage'));
const GlossaryPage = lazyWithRetry(() => import('../pages/GlossaryPage'));
const QuickReferencePage = lazyWithRetry(() => import('../pages/QuickReferencePage'));
const ProfilesPage = lazyWithRetry(() => import('../pages/ProfilesPage'));
const AssessmentPage = lazyWithRetry(() => import('../pages/AssessmentPage'));
const AssessmentResultPage = lazyWithRetry(() => import('../pages/AssessmentResultPage'));
const ProfilerPage = lazyWithRetry(() => import('../pages/ProfilerPage'));
const QuizPage = lazyWithRetry(() => import('../pages/QuizPage'));
const FavoritesPage = lazyWithRetry(() => import('../pages/FavoritesPage'));
const DossiersPage = lazyWithRetry(() => import('../pages/DossiersPage'));
const DecryptorPage = lazyWithRetry(() => import('../pages/DecryptorPage'));
const SimulationPage = lazyWithRetry(() => import('../pages/SimulationPage'));
const InsightsPage = lazyWithRetry(() => import('../pages/InsightsPage'));
const AdminDashboard = lazyWithRetry(() => import('../pages/AdminDashboard'));

const pageVariants = {
  initial: { opacity: 0, y: 15, scale: 0.99 },
  in: { opacity: 1, y: 0, scale: 1 },
  out: { opacity: 0, y: -15, scale: 0.99 }
};

const pageTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  mass: 1
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return <Layout>{children}</Layout>;
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="w-full min-h-full"
    >
      {children}
    </motion.div>
  );
}

export default function AnimatedRoutes() {
  const location = useLocation();

  return (
    <Suspense fallback={<LoadingScreen />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<ProtectedRoute><PageWrapper><HomePage /></PageWrapper></ProtectedRoute>} />
          <Route path="/profiles" element={<ProtectedRoute><PageWrapper><ProfilesPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/encyclopedia" element={<ProtectedRoute><PageWrapper><EncyclopediaPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/guide" element={<ProtectedRoute><PageWrapper><GuidePage /></PageWrapper></ProtectedRoute>} />
          <Route path="/calibration" element={<ProtectedRoute><PageWrapper><CalibrationPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/field-guide" element={<ProtectedRoute><PageWrapper><FieldGuidePage /></PageWrapper></ProtectedRoute>} />
          <Route path="/advisor" element={<ProtectedRoute><PageWrapper><AdvisorPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/compare" element={<ProtectedRoute><PageWrapper><ComparePage /></PageWrapper></ProtectedRoute>} />
          <Route path="/glossary" element={<ProtectedRoute><PageWrapper><GlossaryPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/quick-reference" element={<ProtectedRoute><PageWrapper><QuickReferencePage /></PageWrapper></ProtectedRoute>} />
          <Route path="/assessment" element={<ProtectedRoute><PageWrapper><AssessmentPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/assessment-result" element={<ProtectedRoute><PageWrapper><AssessmentResultPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><PageWrapper><AdminDashboard /></PageWrapper></ProtectedRoute>} />
          <Route path="/profiler" element={<ProtectedRoute><PageWrapper><ProfilerPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/quiz" element={<ProtectedRoute><PageWrapper><QuizPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute><PageWrapper><FavoritesPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/dossiers" element={<ProtectedRoute><PageWrapper><DossiersPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/decryptor" element={<ProtectedRoute><PageWrapper><DecryptorPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/simulation" element={<ProtectedRoute><PageWrapper><SimulationPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/insights" element={<ProtectedRoute><PageWrapper><InsightsPage /></PageWrapper></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}
