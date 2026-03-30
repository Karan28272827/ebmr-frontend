import React, { useState } from 'react';
import {
  Layout, Menu, Button, Space, Tag, Typography, message, Drawer, Grid,
} from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  WarningOutlined,
  LogoutOutlined,
  ExperimentOutlined,
  BarsOutlined,
  ScanOutlined,
  ExclamationCircleOutlined,
  SafetyOutlined,
  AuditOutlined,
  CalendarOutlined,
  FolderOutlined,
  TeamOutlined,
  MenuOutlined,
  CheckSquareOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/authSlice';
import BarcodeScanner from './BarcodeScanner';
import { authApi } from '../api/axios';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const ROLE_COLOR: Record<string, string> = {
  BATCH_OPERATOR: 'blue',
  SUPERVISOR: 'cyan',
  LAB_ANALYST: 'geekblue',
  QA_REVIEWER: 'orange',
  QA_MANAGER: 'volcano',
  QUALIFIED_PERSON: 'purple',
  SYSTEM_ADMIN: 'magenta',
};

function getSelectedKey(pathname: string): string {
  if (pathname.startsWith('/sop')) return 'sop';
  if (pathname.startsWith('/qc')) return 'qc';
  if (pathname.startsWith('/materials')) return 'materials';
  if (pathname.startsWith('/bom')) return 'bom';
  if (pathname.startsWith('/planning')) return 'planning';
  if (pathname.startsWith('/docs')) return 'docs';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/deviations')) return 'deviations';
  if (pathname.startsWith('/issues')) return 'issues';
  return 'dashboard';
}

function getOpenKeys(pathname: string): string[] {
  if (pathname.startsWith('/materials')) return ['materials-group'];
  if (pathname.startsWith('/qc')) return ['qc-group'];
  if (pathname.startsWith('/planning')) return ['planning-group'];
  return [];
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const screens = useBreakpoint();

  const selectedKey = getSelectedKey(location.pathname);

  const handleScanned = async (code: string) => {
    setScannerOpen(false);
    try {
      const batchesRes = await authApi.get('/batches');
      const match = batchesRes.data.find((b: any) => b.batchNumber === code);
      if (match) { navigate(`/batches/${match.id}`); return; }
    } catch { /* ignore */ }
    try {
      await authApi.get(`/materials/barcode/${code}`);
      navigate(`/materials`);
      message.info(`Material found: ${code}`);
      return;
    } catch { /* ignore */ }
    message.warning(`No batch or material found for code: ${code}`);
  };

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Batches',
      onClick: () => { navigate('/dashboard'); setMobileMenuOpen(false); },
    },
    {
      key: 'deviations',
      icon: <WarningOutlined />,
      label: 'Deviations',
      onClick: () => { navigate('/deviations'); setMobileMenuOpen(false); },
    },
    {
      key: 'issues',
      icon: <ExclamationCircleOutlined />,
      label: 'Issues',
      onClick: () => { navigate('/issues'); setMobileMenuOpen(false); },
    },
    {
      key: 'sop',
      icon: <FileTextOutlined />,
      label: 'SOPs',
      onClick: () => { navigate('/sop'); setMobileMenuOpen(false); },
    },
    {
      key: 'qc-group',
      icon: <CheckSquareOutlined />,
      label: 'Quality Control',
      children: [
        { key: 'qc', label: 'QC Dashboard', onClick: () => { navigate('/qc'); setMobileMenuOpen(false); } },
        { key: 'qc-tests', label: 'QC Tests', onClick: () => { navigate('/qc/tests'); setMobileMenuOpen(false); } },
      ],
    },
    {
      key: 'materials-group',
      icon: <ExperimentOutlined />,
      label: 'Materials',
      children: [
        { key: 'materials', label: 'Dashboard', onClick: () => { navigate('/materials'); setMobileMenuOpen(false); } },
        { key: 'materials-intent', label: 'Intents', onClick: () => { navigate('/materials/intent'); setMobileMenuOpen(false); } },
        { key: 'materials-po', label: 'Purchase Orders', onClick: () => { navigate('/materials/po'); setMobileMenuOpen(false); } },
        { key: 'materials-receipts', label: 'Receipts', onClick: () => { navigate('/materials/receipts'); setMobileMenuOpen(false); } },
      ],
    },
    {
      key: 'bom',
      icon: <BarsOutlined />,
      label: 'BOM',
      onClick: () => { navigate('/bom'); setMobileMenuOpen(false); },
    },
    {
      key: 'planning-group',
      icon: <CalendarOutlined />,
      label: 'Planning',
      children: [
        { key: 'planning', label: 'Dashboard', onClick: () => { navigate('/planning'); setMobileMenuOpen(false); } },
        { key: 'planning-plans', label: 'Plans', onClick: () => { navigate('/planning/plans'); setMobileMenuOpen(false); } },
      ],
    },
    {
      key: 'docs',
      icon: <FolderOutlined />,
      label: 'Documentation',
      onClick: () => { navigate('/docs'); setMobileMenuOpen(false); },
    },
    ...(user?.role === 'SYSTEM_ADMIN' ? [{
      key: 'admin',
      icon: <TeamOutlined />,
      label: 'User Admin',
      onClick: () => { navigate('/admin/users'); setMobileMenuOpen(false); },
    }] : []),
  ];

  const isMobile = !screens.md;

  if (isMobile) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ background: '#001529', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
          <Typography.Text strong style={{ color: '#fff', fontSize: 15 }}>eBMR System</Typography.Text>
          <Space>
            <Button icon={<ScanOutlined />} size="small" onClick={() => setScannerOpen(true)} style={{ color: '#fff', borderColor: '#fff', background: 'transparent' }} />
            <Button icon={<MenuOutlined />} size="small" onClick={() => setMobileMenuOpen(true)} style={{ color: '#fff', borderColor: '#fff', background: 'transparent' }} />
          </Space>
        </Header>
        <Content style={{ margin: '12px 12px 70px' }}>
          <Outlet />
        </Content>
        {/* Bottom tab bar */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #f0f0f0', display: 'flex', zIndex: 1000, height: 56 }}>
          {[
            { key: 'dashboard', icon: <DashboardOutlined />, label: 'Batches', path: '/dashboard' },
            { key: 'qc', icon: <CheckSquareOutlined />, label: 'QC', path: '/qc' },
            { key: 'materials', icon: <ExperimentOutlined />, label: 'Materials', path: '/materials' },
            { key: 'planning', icon: <CalendarOutlined />, label: 'Planning', path: '/planning' },
            { key: 'more', icon: <MenuOutlined />, label: 'More', path: null },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => tab.path ? navigate(tab.path) : setMobileMenuOpen(true)}
              style={{
                flex: 1, border: 'none', background: 'transparent', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: 44,
                color: selectedKey === tab.key ? '#1677ff' : '#666', fontSize: 11,
              }}
            >
              <span style={{ fontSize: 20 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Full menu drawer */}
        <Drawer
          title={
            <Space>
              <Typography.Text strong>Menu</Typography.Text>
              {user && <Tag color={ROLE_COLOR[user.role] || 'default'} style={{ marginLeft: 8 }}>{user.role.replace(/_/g, ' ')}</Tag>}
            </Space>
          }
          placement="left"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          width={280}
          footer={
            <Button block icon={<LogoutOutlined />} danger onClick={() => { dispatch(logout()); navigate('/login'); }}>
              Logout
            </Button>
          }
        >
          <Menu mode="inline" selectedKeys={[selectedKey]} defaultOpenKeys={getOpenKeys(location.pathname)} items={menuItems} style={{ border: 'none' }} />
        </Drawer>

        <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScanned={handleScanned} />
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={220}
        collapsible={screens.md && !screens.lg}
        style={{ background: '#001529' }}
      >
        <div style={{ padding: '16px', color: '#fff', fontWeight: 700, fontSize: 16, borderBottom: '1px solid #1d3557' }}>
          eBMR System
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={getOpenKeys(location.pathname)}
          items={menuItems}
          style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 60px)' }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
          <Typography.Text strong style={{ fontSize: 16 }}>
            Electronic Batch Manufacturing Record
          </Typography.Text>
          <Space>
            <Button icon={<ScanOutlined />} onClick={() => setScannerOpen(true)}>Scan</Button>
            {user && (
              <>
                <Typography.Text>{user.name}</Typography.Text>
                <Tag color={ROLE_COLOR[user.role] || 'default'}>{user.role.replace(/_/g, ' ')}</Tag>
              </>
            )}
            <Button icon={<LogoutOutlined />} onClick={() => { dispatch(logout()); navigate('/login'); }}>
              Logout
            </Button>
          </Space>
        </Header>
        <Content style={{ margin: 24, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>

      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScanned={handleScanned} />
    </Layout>
  );
}
