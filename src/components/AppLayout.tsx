import React, { useState } from 'react';
import { Layout, Menu, Button, Space, Tag, Typography, message } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  WarningOutlined,
  LogoutOutlined,
  ExperimentOutlined,
  BarsOutlined,
  ScanOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/authSlice';
import BarcodeScanner from './BarcodeScanner';
import { authApi } from '../api/axios';

const { Header, Sider, Content } = Layout;

const ROLE_COLOR: Record<string, string> = {
  BATCH_OPERATOR: 'blue',
  SUPERVISOR: 'cyan',
  QA_REVIEWER: 'orange',
  QA_MANAGER: 'volcano',
  QUALIFIED_PERSON: 'purple',
};

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [scannerOpen, setScannerOpen] = useState(false);

  const selectedKey = location.pathname.startsWith('/deviations')
    ? 'deviations'
    : location.pathname.startsWith('/issues')
    ? 'issues'
    : location.pathname.startsWith('/materials')
    ? 'materials'
    : location.pathname.startsWith('/bom')
    ? 'bom'
    : 'dashboard';

  const handleScanned = async (code: string) => {
    setScannerOpen(false);
    // Try batch lookup first (by batchNumber), then material (by code)
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

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} style={{ background: '#001529' }}>
        <div style={{ padding: '16px', color: '#fff', fontWeight: 700, fontSize: 16, borderBottom: '1px solid #1d3557' }}>
          eBMR System
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={[
            { key: 'dashboard', icon: <DashboardOutlined />, label: 'Batches', onClick: () => navigate('/dashboard') },
            { key: 'deviations', icon: <WarningOutlined />, label: 'Deviations', onClick: () => navigate('/deviations') },
            { key: 'issues', icon: <ExclamationCircleOutlined />, label: 'Issues', onClick: () => navigate('/issues') },
            { key: 'materials', icon: <ExperimentOutlined />, label: 'Materials', onClick: () => navigate('/materials') },
            { key: 'bom', icon: <BarsOutlined />, label: 'Bill of Materials', onClick: () => navigate('/bom') },
          ]}
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
