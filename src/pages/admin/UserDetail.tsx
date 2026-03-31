import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Tag,
  Button,
  Space,
  Typography,
  Descriptions,
  Form,
  Input,
  Select,
  message,
  Spin,
  Alert,
  Result,
  Table,
  Modal,
} from 'antd';
import {
  ArrowLeftOutlined,
  LockOutlined,
  UnlockOutlined,
  KeyOutlined,
  EditOutlined,
  SaveOutlined,
} from '@ant-design/icons';
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

const EVENT_TYPE_COLOR: Record<string, string> = {
  LOGIN_SUCCESS: 'success',
  LOGIN_FAILED: 'error',
  LOGOUT: 'default',
  ACCOUNT_LOCKED: 'error',
  ACCOUNT_UNLOCKED: 'blue',
  PASSWORD_CHANGED: 'warning',
  PASSWORD_RESET: 'orange',
  ROLE_CHANGED: 'purple',
  USER_CREATED: 'cyan',
  USER_DEACTIVATED: 'red',
  USER_REACTIVATED: 'green',
};

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { user: currentUser } = useAppSelector((s) => s.auth);

  const [userRecord, setUserRecord] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetForm] = Form.useForm();

  const [unlockLoading, setUnlockLoading] = useState(false);

  const isLocked = (u: any) => u?.locked_until && dayjs(u.locked_until).isAfter(dayjs());

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all users and find the one by id (no dedicated single-user endpoint)
      const res = await authApi.get('/admin/users');
      const found = (res.data as any[]).find((u: any) => u.id === id);
      if (!found) throw new Error('User not found');
      setUserRecord(found);
      editForm.setFieldsValue({ name: found.name, role: found.role });
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [id, editForm]);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const res = await authApi.get(`/admin/users/${id}/activity`);
      setActivity(res.data);
    } catch (err: any) {
      // Activity endpoint may not return data if none recorded — fail silently
      setActivity([]);
    } finally {
      setActivityLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadUser();
    loadActivity();
  }, [loadUser, loadActivity]);

  // Access guard — after hooks to comply with rules of hooks
  if (currentUser?.role !== 'SYSTEM_ADMIN') {
    return (
      <Result
        status="403"
        title="Access Denied"
        subTitle="You do not have permission to view user details."
        extra={
          <Button type="primary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        }
      />
    );
  }

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields();
      setEditLoading(true);
      await authApi.patch(`/admin/users/${id}`, { name: values.name, role: values.role });
      message.success('User updated');
      await loadUser();
    } catch (err: any) {
      if (!err.errorFields) {
        message.error(err.response?.data?.message || 'Failed to update user');
      }
    } finally {
      setEditLoading(false);
    }
  };

  const handleUnlock = async () => {
    setUnlockLoading(true);
    try {
      await authApi.post(`/admin/users/${id}/unlock`);
      message.success('Account unlocked');
      await loadUser();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to unlock account');
    } finally {
      setUnlockLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      const values = await resetForm.validateFields();
      setResetLoading(true);
      await authApi.post(`/admin/users/${id}/reset-password`, {
        newPassword: values.newPassword,
      });
      message.success('Password reset successfully');
      setResetModalOpen(false);
      resetForm.resetFields();
    } catch (err: any) {
      if (!err.errorFields) {
        message.error(err.response?.data?.message || 'Failed to reset password');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const getDetailFromEvent = (event: any): string => {
    const after = event.afterState;
    if (!after) return '—';
    if (typeof after === 'string') return after;
    try {
      const obj = typeof after === 'object' ? after : JSON.parse(after);
      const parts: string[] = [];
      if (obj.role) parts.push(`Role: ${obj.role}`);
      if (obj.ip) parts.push(`IP: ${obj.ip}`);
      if (obj.reason) parts.push(obj.reason);
      if (obj.lockedUntil)
        parts.push(`Until: ${dayjs(obj.lockedUntil).format('YYYY-MM-DD HH:mm')}`);
      return parts.length > 0 ? parts.join(' · ') : JSON.stringify(obj);
    } catch {
      return String(after);
    }
  };

  const activityColumns = [
    {
      title: 'Event Type',
      dataIndex: 'eventType',
      key: 'eventType',
      render: (v: string) => (
        <Tag color={EVENT_TYPE_COLOR[v] || 'default'} style={{ whiteSpace: 'normal' }}>
          {v?.replace(/_/g, ' ')}
        </Tag>
      ),
    },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (v: string) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{dayjs(v).format('YYYY-MM-DD HH:mm:ss')}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {dayjs(v).fromNow()}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Details',
      key: 'details',
      render: (_: any, r: any) => (
        <Typography.Text type="secondary">{getDetailFromEvent(r)}</Typography.Text>
      ),
    },
  ];

  if (loading) return <Spin style={{ display: 'block', marginTop: 100, textAlign: 'center' }} />;
  if (!userRecord) return <Alert message="User not found" type="error" />;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/users')}>
          Back to Users
        </Button>
      </Space>

      {/* User Info Card */}
      <Card
        title={
          <Space>
            <Typography.Text strong style={{ fontSize: 16 }}>
              {userRecord.name}
            </Typography.Text>
            <Tag color={userRecord.is_active ? 'success' : 'error'}>
              {userRecord.is_active ? 'Active' : 'Inactive'}
            </Tag>
            <Tag color={ROLE_COLOR[userRecord.role] || 'default'}>
              {userRecord.role?.replace(/_/g, ' ')}
            </Tag>
            {isLocked(userRecord) && (
              <Tag color="red" icon={<LockOutlined />}>
                LOCKED
              </Tag>
            )}
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Descriptions column={screens.md ? 3 : 1} size="small">
          <Descriptions.Item label="Email">{userRecord.email}</Descriptions.Item>
          <Descriptions.Item label="Created At">
            {userRecord.created_at ? dayjs(userRecord.created_at).format('YYYY-MM-DD HH:mm') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Last Login">
            {userRecord.last_login_at
              ? `${dayjs(userRecord.last_login_at).format('YYYY-MM-DD HH:mm')} (${dayjs(userRecord.last_login_at).fromNow()})`
              : 'Never'}
          </Descriptions.Item>
          {isLocked(userRecord) && (
            <Descriptions.Item label="Locked Until">
              <Typography.Text type="danger">
                {dayjs(userRecord.locked_until).format('YYYY-MM-DD HH:mm')}
              </Typography.Text>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Password Changed">
            {userRecord.password_changed_at
              ? dayjs(userRecord.password_changed_at).format('YYYY-MM-DD HH:mm')
              : '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Edit Section */}
      <Card
        title={
          <Space>
            <EditOutlined />
            <span>Edit User</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Form form={editForm} layout={screens.md ? 'inline' : 'vertical'}>
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="Full name" style={{ width: screens.md ? 220 : '100%' }} />
          </Form.Item>
          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Role is required' }]}
          >
            <Select
              placeholder="Select role"
              style={{ width: screens.md ? 200 : '100%' }}
              options={ALL_ROLES.map((r) => ({ value: r, label: r.replace(/_/g, ' ') }))}
            />
          </Form.Item>
          <Form.Item style={screens.md ? { marginTop: 22 } : {}}>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleEdit}
              loading={editLoading}
            >
              Save Changes
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Security Section */}
      <Card
        title={
          <Space>
            <LockOutlined />
            <span>Security</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {isLocked(userRecord) ? (
            <Alert
              type="error"
              showIcon
              message={`Account Locked until ${dayjs(userRecord.locked_until).format('YYYY-MM-DD HH:mm')}`}
              description="The user cannot log in until the lockout expires or an admin unlocks the account."
              action={
                <Button
                  icon={<UnlockOutlined />}
                  onClick={handleUnlock}
                  loading={unlockLoading}
                  size="small"
                >
                  Unlock Account
                </Button>
              }
            />
          ) : (
            <Alert
              type="success"
              showIcon
              message="Account is not locked"
              description="The user can log in normally."
            />
          )}

          <Space wrap>
            {isLocked(userRecord) && (
              <Button icon={<UnlockOutlined />} onClick={handleUnlock} loading={unlockLoading}>
                Unlock Account
              </Button>
            )}
            <Button
              icon={<KeyOutlined />}
              onClick={() => {
                resetForm.resetFields();
                setResetModalOpen(true);
              }}
            >
              Reset Password
            </Button>
          </Space>
        </Space>
      </Card>

      {/* Activity Log */}
      <Card
        title="Activity Log"
        extra={
          <Button size="small" onClick={loadActivity} loading={activityLoading}>
            Refresh
          </Button>
        }
      >
        {activityLoading ? (
          <Spin style={{ display: 'block', textAlign: 'center', margin: 40 }} />
        ) : (
          <Table
            dataSource={activity}
            columns={activityColumns}
            rowKey={(r: any) => r.id || `${r.eventType}-${r.timestamp}`}
            size="small"
            pagination={{ pageSize: 20 }}
            scroll={{ x: 500 }}
            locale={{ emptyText: 'No activity recorded' }}
          />
        )}
      </Card>

      {/* Reset Password Modal */}
      <Modal
        title={`Reset Password: ${userRecord.name}`}
        open={resetModalOpen}
        onOk={handleResetPassword}
        onCancel={() => {
          setResetModalOpen(false);
          resetForm.resetFields();
        }}
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
