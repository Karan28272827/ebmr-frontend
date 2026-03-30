import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Tag, Button, Space, Card, Typography, Modal, Form, Input, Select,
  message, Spin, Result, Popconfirm, Tooltip, Row, Col,
} from 'antd';
import {
  PlusOutlined, EditOutlined, LockOutlined, UnlockOutlined, UserOutlined,
  KeyOutlined, StopOutlined, CheckOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Grid } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { authApi } from '../../api/axios';
import { useAppSelector } from '../../store/hooks';

dayjs.extend(relativeTime);

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

const ALL_ROLES = [
  'BATCH_OPERATOR',
  'SUPERVISOR',
  'LAB_ANALYST',
  'QA_REVIEWER',
  'QA_MANAGER',
  'QUALIFIED_PERSON',
  'SYSTEM_ADMIN',
];

const PASSWORD_EXPIRY_DAYS = 90;

export default function UserList() {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { user: currentUser } = useAppSelector((s) => s.auth);

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create user modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm] = Form.useForm();

  // Edit user modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm] = Form.useForm();

  // Reset password modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetUser, setResetUser] = useState<any>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetForm] = Form.useForm();

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Access guard
  if (currentUser?.role !== 'SYSTEM_ADMIN') {
    return (
      <Result
        status="403"
        title="Access Denied"
        subTitle="You do not have permission to access user management."
        extra={<Button type="primary" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>}
      />
    );
  }

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authApi.get('/admin/users');
      setUsers(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setCreateLoading(true);
      await authApi.post('/admin/users', values);
      message.success('User created successfully');
      setCreateModalOpen(false);
      createForm.resetFields();
      await loadUsers();
    } catch (err: any) {
      if (!err.errorFields) {
        message.error(err.response?.data?.message || 'Failed to create user');
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = (u: any) => {
    setEditUser(u);
    editForm.setFieldsValue({ role: u.role, is_active: u.is_active });
    setEditModalOpen(true);
  };

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields();
      setEditLoading(true);
      await authApi.patch(`/admin/users/${editUser.id}`, values);
      message.success('User updated');
      setEditModalOpen(false);
      setEditUser(null);
      editForm.resetFields();
      await loadUsers();
    } catch (err: any) {
      if (!err.errorFields) {
        message.error(err.response?.data?.message || 'Failed to update user');
      }
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleActive = async (u: any) => {
    setActionLoadingId(u.id);
    try {
      await authApi.patch(`/admin/users/${u.id}`, { is_active: !u.is_active });
      message.success(u.is_active ? 'User deactivated' : 'User reactivated');
      await loadUsers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update user');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnlock = async (u: any) => {
    setActionLoadingId(u.id);
    try {
      await authApi.post(`/admin/users/${u.id}/unlock`);
      message.success('Account unlocked');
      await loadUsers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to unlock account');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openResetPassword = (u: any) => {
    setResetUser(u);
    resetForm.resetFields();
    setResetModalOpen(true);
  };

  const handleResetPassword = async () => {
    try {
      const values = await resetForm.validateFields();
      setResetLoading(true);
      await authApi.post(`/admin/users/${resetUser.id}/reset-password`, {
        newPassword: values.newPassword,
      });
      message.success('Password reset successfully');
      setResetModalOpen(false);
      setResetUser(null);
      resetForm.resetFields();
    } catch (err: any) {
      if (!err.errorFields) {
        message.error(err.response?.data?.message || 'Failed to reset password');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const getPasswordExpiryInfo = (passwordChangedAt: string | null) => {
    if (!passwordChangedAt) return { label: '—', warning: false };
    const expiryDate = dayjs(passwordChangedAt).add(PASSWORD_EXPIRY_DAYS, 'day');
    const daysLeft = expiryDate.diff(dayjs(), 'day');
    if (daysLeft <= 0) return { label: 'Expired', warning: true };
    if (daysLeft < 14) return { label: `${daysLeft}d left`, warning: true };
    return { label: expiryDate.format('YYYY-MM-DD'), warning: false };
  };

  const isLocked = (u: any) =>
    u.locked_until && dayjs(u.locked_until).isAfter(dayjs());

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{r.name}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (v: string) => (
        <Tag color={ROLE_COLOR[v] || 'default'}>{v?.replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (v: boolean) => (
        <Tag color={v ? 'success' : 'error'}>{v ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Last Login',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      render: (v: string) => v ? (
        <Tooltip title={dayjs(v).format('YYYY-MM-DD HH:mm:ss')}>
          <Typography.Text>{dayjs(v).fromNow()}</Typography.Text>
        </Tooltip>
      ) : '—',
    },
    {
      title: 'Password Expiry',
      dataIndex: 'password_changed_at',
      key: 'password_expiry',
      render: (v: string) => {
        const info = getPasswordExpiryInfo(v);
        return (
          <Typography.Text type={info.warning ? 'warning' : undefined}>
            {info.label}
          </Typography.Text>
        );
      },
    },
    {
      title: 'Account',
      key: 'lock_status',
      render: (_: any, r: any) =>
        isLocked(r) ? (
          <Tooltip title={`Locked until ${dayjs(r.locked_until).format('YYYY-MM-DD HH:mm')}`}>
            <Tag color="red" icon={<LockOutlined />}>LOCKED</Tag>
          </Tooltip>
        ) : (
          <Tag color="default">OK</Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: any) => (
        <Space size="small" wrap>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(r)}
          >
            {screens.lg ? 'Edit' : ''}
          </Button>
          <Popconfirm
            title={r.is_active ? 'Deactivate this user?' : 'Reactivate this user?'}
            onConfirm={() => handleToggleActive(r)}
            okText={r.is_active ? 'Deactivate' : 'Reactivate'}
            okButtonProps={{ danger: r.is_active }}
          >
            <Button
              size="small"
              danger={r.is_active}
              icon={r.is_active ? <StopOutlined /> : <CheckOutlined />}
              loading={actionLoadingId === r.id}
            >
              {screens.lg ? (r.is_active ? 'Deactivate' : 'Reactivate') : ''}
            </Button>
          </Popconfirm>
          {isLocked(r) && (
            <Button
              size="small"
              icon={<UnlockOutlined />}
              onClick={() => handleUnlock(r)}
              loading={actionLoadingId === r.id}
            >
              {screens.lg ? 'Unlock' : ''}
            </Button>
          )}
          <Button
            size="small"
            icon={<KeyOutlined />}
            onClick={() => openResetPassword(r)}
          >
            {screens.lg ? 'Reset Pwd' : ''}
          </Button>
          <Button
            size="small"
            icon={<UserOutlined />}
            onClick={() => navigate(`/admin/users/${r.id}`)}
          >
            {screens.lg ? 'Activity' : ''}
          </Button>
        </Space>
      ),
    },
  ];

  const renderMobileCard = (u: any) => (
    <Card
      key={u.id}
      size="small"
      style={{ marginBottom: 12 }}
      title={
        <Space>
          <Typography.Text strong>{u.name}</Typography.Text>
          <Tag color={u.is_active ? 'success' : 'error'}>{u.is_active ? 'Active' : 'Inactive'}</Tag>
          {isLocked(u) && <Tag color="red" icon={<LockOutlined />}>LOCKED</Tag>}
        </Space>
      }
    >
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Typography.Text type="secondary">{u.email}</Typography.Text>
        <Tag color={ROLE_COLOR[u.role] || 'default'}>{u.role?.replace(/_/g, ' ')}</Tag>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Last login: {u.last_login_at ? dayjs(u.last_login_at).fromNow() : '—'}
        </Typography.Text>
        <Space wrap>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(u)}>Edit</Button>
          {isLocked(u) && (
            <Button size="small" icon={<UnlockOutlined />} onClick={() => handleUnlock(u)} loading={actionLoadingId === u.id}>Unlock</Button>
          )}
          <Button size="small" icon={<KeyOutlined />} onClick={() => openResetPassword(u)}>Reset Pwd</Button>
          <Button size="small" icon={<UserOutlined />} onClick={() => navigate(`/admin/users/${u.id}`)}>Activity</Button>
        </Space>
      </Space>
    </Card>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>User Management</Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalOpen(true)}
        >
          Create User
        </Button>
      </div>

      {loading ? (
        <Spin style={{ display: 'block', textAlign: 'center', margin: 80 }} />
      ) : screens.sm ? (
        <Card>
          <Table
            dataSource={users}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 20 }}
            size="middle"
            scroll={{ x: 900 }}
            locale={{ emptyText: 'No users found' }}
          />
        </Card>
      ) : (
        <div>
          {users.length === 0 ? (
            <Card><Typography.Text type="secondary">No users found</Typography.Text></Card>
          ) : (
            users.map(renderMobileCard)
          )}
        </div>
      )}

      {/* Create User Modal */}
      <Modal
        title="Create New User"
        open={createModalOpen}
        onOk={handleCreate}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
        confirmLoading={createLoading}
        okText="Create User"
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="e.g. Jane Smith" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input placeholder="jane.smith@example.com" />
          </Form.Item>
          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Role is required' }]}
          >
            <Select
              placeholder="Select role"
              options={ALL_ROLES.map((r) => ({ value: r, label: r.replace(/_/g, ' ') }))}
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="Initial Password"
            rules={[
              { required: true, message: 'Password is required' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
          >
            <Input.Password placeholder="Minimum 8 characters" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title={editUser ? `Edit User: ${editUser.name}` : 'Edit User'}
        open={editModalOpen}
        onOk={handleEdit}
        onCancel={() => { setEditModalOpen(false); setEditUser(null); editForm.resetFields(); }}
        confirmLoading={editLoading}
        okText="Save Changes"
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Role is required' }]}
          >
            <Select
              placeholder="Select role"
              options={ALL_ROLES.map((r) => ({ value: r, label: r.replace(/_/g, ' ') }))}
            />
          </Form.Item>
          <Form.Item
            name="is_active"
            label="Account Status"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: true, label: 'Active' },
                { value: false, label: 'Inactive' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        title={resetUser ? `Reset Password: ${resetUser.name}` : 'Reset Password'}
        open={resetModalOpen}
        onOk={handleResetPassword}
        onCancel={() => { setResetModalOpen(false); setResetUser(null); resetForm.resetFields(); }}
        confirmLoading={resetLoading}
        okText="Reset Password"
        destroyOnClose
      >
        <Form form={resetForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: 'Password is required' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
          >
            <Input.Password placeholder="Minimum 8 characters" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Please confirm the password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Re-enter new password" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
