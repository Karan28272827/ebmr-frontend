import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { restoreAuth } from './store/authSlice';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BatchNew from './pages/BatchNew';
import BatchDetail from './pages/BatchDetail';
import BatchAudit from './pages/BatchAudit';
import Deviations from './pages/Deviations';
import DeviationDetail from './pages/DeviationDetail';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAppSelector((s) => s.auth);
  if (loading) return <Spin style={{ display: 'block', marginTop: 200, textAlign: 'center' }} />;
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(restoreAuth());
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="batches/new" element={<BatchNew />} />
        <Route path="batches/:id" element={<BatchDetail />} />
        <Route path="batches/:id/audit" element={<BatchAudit />} />
        <Route path="deviations" element={<Deviations />} />
        <Route path="deviations/:id" element={<DeviationDetail />} />
      </Route>
    </Routes>
  );
}
