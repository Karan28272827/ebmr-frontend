import React, { useEffect, useState } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Select, Space, Tag, Typography, message, Spin,
} from 'antd';
import { PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { authApi } from '../api/axios';

const SEVERITY_COLOR: Record<string, string> = {
  LOW: 'default', MEDIUM: 'blue', HIGH: 'orange', CRITICAL: 'red',
};
const STATUS_COLOR: Record<string, string> = {
  OPEN: 'error', IN_PROGRESS: 'processing', RESOLVED: 'success', CLOSED: 'default',
};

export default function Issues() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const [issuesRes, batchesRes] = await Promise.all([
        authApi.get(`/issues${params}`),
        authApi.get('/batches'),
      ]);
      setIssues(issuesRes.data);
      setBatches(batchesRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await authApi.post('/issues', values);
      message.success('Issue raised');
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (err: any) {
      if (!err.errorFields) message.error(err.response?.data?.message || 'Failed to create issue');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Severity',
      dataIndex: 'severity',
      width: 90,
      render: (s: string) => <Tag color={SEVERITY_COLOR[s]}>{s}</Tag>,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      render: (title: string, row: any) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/issues/${row.id}`)}>
          {title}
        </Button>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (s: string) => <Tag color={STATUS_COLOR[s]}>{s.replace('_', ' ')}</Tag>,
    },
    {
      title: 'Batch',
      dataIndex: ['batch', 'batchNumber'],
      render: (bn: string) => bn || <Typography.Text type="secondary">—</Typography.Text>,
    },
    { title: 'Raised By', dataIndex: ['raiser', 'name'] },
    {
      title: 'Raised At',
      dataIndex: 'raisedAt',
      render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <div>
      <Card
        title={<Space><ExclamationCircleOutlined /> Production Issues</Space>}
        extra={
          <Space>
            <Select
              placeholder="Filter by status"
              allowClear
              style={{ width: 160 }}
              onChange={setStatusFilter}
              options={['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => ({ value: s, label: s.replace('_', ' ') }))}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              Raise Issue
            </Button>
          </Space>
        }
      >
        {loading ? (
          <Spin style={{ display: 'block', textAlign: 'center', margin: 40 }} />
        ) : (
          <Table
            dataSource={issues}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 20 }}
            size="middle"
            locale={{ emptyText: 'No issues found' }}
          />
        )}
      </Card>

      <Modal
        title="Raise Issue"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={saving}
        okText="Raise Issue"
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="Brief description of the issue" />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Detailed description, observed symptoms, affected process..." />
          </Form.Item>
          <Form.Item name="severity" label="Severity" rules={[{ required: true }]}>
            <Select placeholder="Select severity">
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
                <Select.Option key={s} value={s}>
                  <Tag color={SEVERITY_COLOR[s]}>{s}</Tag>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="batchId" label="Related Batch (optional)">
            <Select
              placeholder="Select batch (optional)"
              allowClear
              showSearch
              filterOption={(input, opt) => (opt?.label as string || '').toLowerCase().includes(input.toLowerCase())}
              options={batches.map((b) => ({
                value: b.id,
                label: `${b.batchNumber} — ${b.productName}`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
