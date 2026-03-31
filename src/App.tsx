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
import Issues from './pages/Issues';
import IssueDetail from './pages/IssueDetail';
import BomDefinition from './pages/BomDefinition';

// Phase 1 module pages
import SopList from './pages/sop/SopList';
import SopDetail from './pages/sop/SopDetail';
import SopNew from './pages/sop/SopNew';
import QcDashboard from './pages/qc/QcDashboard';
import QcTestsList from './pages/qc/QcTestsList';
import QcTestDetail from './pages/qc/QcTestDetail';
import MaterialDashboard from './pages/materials/MaterialDashboard';
import IntentList from './pages/materials/IntentList';
import PoTracker from './pages/materials/PoTracker';
import ReceiptLog from './pages/materials/ReceiptLog';
import ReceiptDetail from './pages/materials/ReceiptDetail';
import BomList from './pages/bom/BomList';
import BomDetail from './pages/bom/BomDetail';
import PlanningDashboard from './pages/planning/PlanningDashboard';
import PlanList from './pages/planning/PlanList';
import PlanNew from './pages/planning/PlanNew';
import PlanDetail from './pages/planning/PlanDetail';
import DocsCenter from './pages/docs/DocsCenter';
import ProcessFlowDetail from './pages/docs/ProcessFlowDetail';
import ProcessFlowNew from './pages/docs/ProcessFlowNew';
import UserList from './pages/admin/UserList';
import UserDetail from './pages/admin/UserDetail';

// Phase 2/3 module pages
import CapaList from './pages/capa/CapaList';
import CapaDetail from './pages/capa/CapaDetail';
import VendorList from './pages/vendor/VendorList';
import VendorDetail from './pages/vendor/VendorDetail';
import StockDashboard from './pages/stock/StockDashboard';
import StockLedger from './pages/stock/StockLedger';
import QcSpecList from './pages/qc-spec/QcSpecList';
import QcSpecDetail from './pages/qc-spec/QcSpecDetail';
import EnvDashboard from './pages/env-monitoring/EnvDashboard';
import RetentionList from './pages/retention/RetentionList';
import CoaList from './pages/coa/CoaList';

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

        {/* Existing routes */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="batches/new" element={<BatchNew />} />
        <Route path="batches/:id" element={<BatchDetail />} />
        <Route path="batches/:id/audit" element={<BatchAudit />} />
        <Route path="deviations" element={<Deviations />} />
        <Route path="deviations/:id" element={<DeviationDetail />} />
        <Route path="issues" element={<Issues />} />
        <Route path="issues/:id" element={<IssueDetail />} />
        <Route path="bom-legacy" element={<BomDefinition />} />

        {/* SOP Module */}
        <Route path="sop" element={<SopList />} />
        <Route path="sop/new" element={<SopNew />} />
        <Route path="sop/:id" element={<SopDetail />} />

        {/* QC Module */}
        <Route path="qc" element={<QcDashboard />} />
        <Route path="qc/tests" element={<QcTestsList />} />
        <Route path="qc/tests/:id" element={<QcTestDetail />} />
        <Route path="qc-specs" element={<QcSpecList />} />
        <Route path="qc-specs/:id" element={<QcSpecDetail />} />
        <Route path="env-monitoring" element={<EnvDashboard />} />

        {/* Materials Module */}
        <Route path="materials" element={<MaterialDashboard />} />
        <Route path="materials/intent" element={<IntentList />} />
        <Route path="materials/po" element={<PoTracker />} />
        <Route path="materials/receipts" element={<ReceiptLog />} />
        <Route path="materials/receipts/:id" element={<ReceiptDetail />} />

        {/* Vendors + Stock */}
        <Route path="vendors" element={<VendorList />} />
        <Route path="vendors/:id" element={<VendorDetail />} />
        <Route path="stock" element={<StockDashboard />} />
        <Route path="stock/ledger" element={<StockLedger />} />

        {/* BOM Module */}
        <Route path="bom" element={<BomList />} />
        <Route path="bom/:id" element={<BomDetail />} />

        {/* Planning Module */}
        <Route path="planning" element={<PlanningDashboard />} />
        <Route path="planning/plans" element={<PlanList />} />
        <Route path="planning/new" element={<PlanNew />} />
        <Route path="planning/:id" element={<PlanDetail />} />

        {/* CAPA Module */}
        <Route path="capa" element={<CapaList />} />
        <Route path="capa/:id" element={<CapaDetail />} />

        {/* QC + Retention + CoA */}
        <Route path="retention" element={<RetentionList />} />
        <Route path="coa" element={<CoaList />} />

        {/* Documentation Module */}
        <Route path="docs" element={<DocsCenter />} />
        <Route path="docs/process-flow/new" element={<ProcessFlowNew />} />
        <Route path="docs/process-flow/:id" element={<ProcessFlowDetail />} />

        {/* Admin Module */}
        <Route path="admin/users" element={<UserList />} />
        <Route path="admin/users/:id" element={<UserDetail />} />
      </Route>
    </Routes>
  );
}
