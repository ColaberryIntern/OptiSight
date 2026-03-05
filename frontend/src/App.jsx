import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './components/Layout/PublicLayout';
import IntelligenceOSLayout from './components/Layout/IntelligenceOSLayout';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import IntelligenceOSPage from './pages/IntelligenceOSPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected routes — Intelligence OS */}
      <Route element={<ProtectedRoute />}>
        <Route element={<IntelligenceOSLayout />}>
          <Route path="/intelligence" element={<IntelligenceOSPage />} />
        </Route>
      </Route>

      {/* Redirects and fallback */}
      <Route path="/" element={<Navigate to="/intelligence" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
