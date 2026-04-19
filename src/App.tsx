import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';

const ProtectedRoute = () => {
  const token = sessionStorage.getItem('token');
  if (!token) return <Navigate to="/" replace />;
  return <Outlet />;
};

const LandingWrapper = () => {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('token');
  if (token) return <Navigate to="/dashboard" replace />;
  return <LandingPage onSuccess={() => navigate('/dashboard')} />;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingWrapper />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/:roomId" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
