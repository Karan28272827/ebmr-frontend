import React from 'react';
import { Layout, Menu, Button, Space, Tag, Typography } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  WarningOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/authSlice';

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

  const selectedKey = location.pathname.startsWith('/deviations')
    ? 'deviations'
    : location.pathname.startsWith('/batches') || location.pathname === '/dashboard'
    ? 'dashboard'
    : 'dashboard';

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
            { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard', onClick: () => navigate('/dashboard') },
            { key: 'deviations', icon: <WarningOutlined />, label: 'Deviations', onClick: () => navigate('/deviations') },
          ]}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
          <Typography.Text strong style={{ fontSize: 16 }}>
            Electronic Batch Manufacturing Record
          </Typography.Text>
          <Space>
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
    </Layout>
  );
}
