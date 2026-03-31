import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout, Menu, Button, Space, Tag, Typography, message, Drawer, Grid,
  Badge, Popover, List, Empty,
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
  BellOutlined,
  MedicineBoxOutlined,
  StockOutlined,
  EnvironmentOutlined,
  SolutionOutlined,
  SafetyCertificateOutlined,
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

const ROLE_LEVEL: Record<string, number> = {
  BATCH_OPERATOR: 1, SUPERVISOR: 2, LAB_ANALYST: 3,
  QA_REVIEWER: 4, QA_MANAGER: 5, QUALIFIED_PERSON: 6, SYSTEM_ADMIN: 7,
};

function getSelectedKey(pathname: string): string {
  if (pathname.startsWith('/sop')) return 'sop';
  if (pathname.startsWith('/qc-specs')) return 'qc-specs';
  if (pathname.startsWith('/env-monitoring')) return 'env-monitoring';
  if (pathname.startsWith('/qc')) return 'qc';
  if (pathname.startsWith('/materials')) return 'materials';
  if (pathname.startsWith('/vendors')) return 'vendors';
  if (pathname.startsWith('/stock/ledger')) return 'stock-ledger';
  if (pathname.startsWith('/stock')) return 'stock';
  if (pathname.startsWith('/bom')) return 'bom';
  if (pathname.startsWith('/planning')) return 'planning';
  if (pathname.startsWith('/docs')) return 'docs';
  if (pathname.startsWith('/capa')) return 'capa';
  if (pathname.startsWith('/retention')) return 'retention';
  if (pathname.startsWith('/coa')) return 'coa';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/deviations')) return 'deviations';
  if (pathname.startsWith('/issues')) return 'issues';
  return 'dashboard';
}

function getOpenKeys(pathname: string): string[] {
  if (pathname.startsWith('/materials')) return ['materials-group'];
  if (pathname.startsWith('/qc-specs') || pathname.startsWith('/env-monitoring') || pathname.startsWith('/qc')) return ['qc-group'];
  if (pathname.startsWith('/planning')) return ['planning-group'];
  if (pathname.startsWith('/vendors') || pathname.startsWith('/stock')) return ['stores-group'];
  if (pathname.startsWith('/capa') || pathname.startsWith('/retention') || pathname.startsWith('/coa')) return ['compliance-group'];
  return [];
}

function NotificationBell() {
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const fetchCount = useCallback(async () => {
    try {
      const res = await authApi.get('/notifications/count');
      setCount(res.data.count || 0);
    } catch { /* ignore */ }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await authApi.get('/notifications?unreadOnly=true');
      setNotifications(res.data.slice(0, 8));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  const handleOpen = (v: boolean) => {
    setOpen(v);
    if (v) fetchNotifications();
  };

  const markRead = async (id: string) => {
    try {
      await authApi.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setCount(c => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const content = (
    <div style={{ width: 320 }}>
      {notifications.length === 0 ? (
        <Empty description="No unread notifications" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          size="small"
          dataSource={notifications}
          renderItem={(n: any) => (
            <List.Item
              actions={[<Button type="link" size="small" onClick={() => markRead(n.id)}>Dismiss</Button>]}
              style={{ cursor: 'pointer' }}
            >
              <List.Item.Meta
                title={<Typography.Text strong style={{ fontSize: 12 }}>{n.title}</Typography.Text>}
                description={<Typography.Text type="secondary" style={{ fontSize: 11 }}>{n.message}</Typography.Text>}
              />
            </List.Item>
          )}
        />
      )}
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <Button type="link" size="small" onClick={async () => { await authApi.post('/notifications/read-all'); setNotifications([]); setCount(0); setOpen(false); }}>
          Mark all read
        </Button>
      </div>
    </div>
  );

  return (
    <Popover content={content} title="Notifications" trigger="click" open={open} onOpenChange={handleOpen}>
      <Badge count={count} size="small">
        <Button icon={<BellOutlined />} type="text" style={{ color: '#666' }} />
      </Badge>
    </Popover>
  );
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
  const hasMinRole = (r: string) => (ROLE_LEVEL[user?.role || ''] || 0) >= (ROLE_LEVEL[r] || 0);

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
        { key: 'qc-specs', label: 'QC Specifications', onClick: () => { navigate('/qc-specs'); setMobileMenuOpen(false); } },
        { key: 'env-monitoring', label: 'Env. Monitoring', onClick: () => { navigate('/env-monitoring'); setMobileMenuOpen(false); } },
        { key: 'retention', label: 'Retention Samples', onClick: () => { navigate('/retention'); setMobileMenuOpen(false); } },
        { key: 'coa', label: 'Certificates of Analysis', onClick: () => { navigate('/coa'); setMobileMenuOpen(false); } },
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
      key: 'stores-group',
      icon: <ShoppingCartOutlined />,
      label: 'Stores',
      children: [
        { key: 'vendors', label: 'Vendor Master', onClick: () => { navigate('/vendors'); setMobileMenuOpen(false); } },
        { key: 'stock', label: 'Stock Dashboard', onClick: () => { navigate('/stock'); setMobileMenuOpen(false); } },
        { key: 'stock-ledger', label: 'Stock Ledger', onClick: () => { navigate('/stock/ledger'); setMobileMenuOpen(false); } },
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
      key: 'compliance-group',
      icon: <SafetyCertificateOutlined />,
      label: 'Compliance',
      children: [
        { key: 'capa', label: 'CAPA', onClick: () => { navigate('/capa'); setMobileMenuOpen(false); } },
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
            <NotificationBell />
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
            <NotificationBell />
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
