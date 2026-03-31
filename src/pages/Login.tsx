import React, { useEffect } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { login } from '../store/authSlice';

export default function Login() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, token } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (token) navigate('/dashboard', { replace: true });
  }, [token, navigate]);

  const onFinish = (values: { email: string; password: string }) => {
    dispatch(login(values));
  };

  const TEST_USERS = [
    { email: 'batch_operator@ebmr.dev', role: 'Batch Operator' },
    { email: 'supervisor@ebmr.dev', role: 'Supervisor' },
    { email: 'qa_reviewer@ebmr.dev', role: 'QA Reviewer' },
    { email: 'qa_manager@ebmr.dev', role: 'QA Manager' },
    { email: 'qualified_person@ebmr.dev', role: 'Qualified Person' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
      }}
    >
      <Space direction="vertical" size={16} style={{ width: 400 }}>
        <Card>
          <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
            eBMR System Login
          </Typography.Title>
          {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
          <Form
            onFinish={onFinish}
            layout="vertical"
            initialValues={{ email: 'batch_operator@ebmr.dev', password: 'Test@1234' }}
          >
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
              <Input prefix={<MailOutlined />} size="large" />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true }]}>
              <Input.Password prefix={<LockOutlined />} size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Login
            </Button>
          </Form>
        </Card>
        <Card
          title="Test Credentials (all use password: Test@1234)"
          size="small"
          style={{ fontSize: 12 }}
        >
          {TEST_USERS.map((u) => (
            <div key={u.email} style={{ marginBottom: 4, fontFamily: 'monospace', fontSize: 11 }}>
              <strong>{u.role}:</strong> {u.email}
            </div>
          ))}
        </Card>
      </Space>
    </div>
  );
}
