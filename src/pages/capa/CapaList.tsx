import React, { useEffect, useState } from 'react';
import {
  Table,
  Card,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  message,
} from 'antd';
import { PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/axios';
import { useAppSelector } from '../../store/hooks';
import dayjs from 'dayjs';

const STATUS_COLOR: Record<string, string> = {
  OPEN: 'orange',
  IN_PROGRESS: 'blue',
  EFFECTIVENESS_CHECK: 'purple',
  CLOSED: 'green',
};
const PRIORITY_COLOR: Record<string, string> = {
  LOW: 'default',
  MEDIUM: 'gold',
  HIGH: 'volcano',
  CRITICAL: 'red',
};

export default function CapaList() {
  const navigate = useNavigate();
  const { user } = useAppSelector((s: any) => s.auth);
  const [data, setData] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [sourceFilter, setSourceFilter] = useState<string | undefined>();
  const [form] = Form.useForm();

  const fetch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      const [listRes, dashRes] = await Promise.all([
        authApi.get(`/capa?${params}`),
        authApi.get('/capa/dashboard'),
      ]);
      setData(listRes.data);
      setDashboard(dashRes.data);
    } catch {
      message.error('Failed to load CAPAs');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, [statusFilter, sourceFilter]);

  const handleCreate = async (vals: any) => {
    setSubmitting(true);
    try {
      await authApi.post('/capa', { ...vals, due_date: vals.due_date?.toISOString() });
      message.success('CAPA created');
      setModalOpen(false);
      form.resetFields();
      fetch();
    } catch {
      message.error('Failed to create CAPA');
    }
    setSubmitting(false);
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'capa_code',
      key: 'capa_code',
      render: (v: string, r: any) => (
        <Button type="link" onClick={() => navigate(`/capa/${r.id}`)}>
          {v}
        </Button>
      ),
    },
    { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: 'Source', dataIndex: 'source', key: 'source' },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (v: string) => <Tag color={PRIORITY_COLOR[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={STATUS_COLOR[v] || 'default'}>{v.replace(/_/g, ' ')}</Tag>,
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (v: string) => {
        if (!v) return '—';
        const d = dayjs(v);
        return (
          <span style={{ color: d.isBefore(dayjs()) ? 'red' : 'inherit' }}>
            {d.format('DD MMM YYYY')}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>CAPA Register</Typography.Title>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {[
          { label: 'Open', key: 'OPEN', color: '#fa8c16' },
          { label: 'In Progress', key: 'IN_PROGRESS', color: '#1677ff' },
          { label: 'Effectiveness Check', key: 'EFFECTIVENESS_CHECK', color: '#722ed1' },
          { label: 'Overdue', key: 'overdue', color: '#ff4d4f' },
        ].map((s) => (
          <Col key={s.key} xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title={s.label}
                value={
                  s.key === 'overdue' ? dashboard.overdue || 0 : dashboard.by_status?.[s.key] || 0
                }
                valueStyle={{ color: s.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>
      <Card>
        <Space style={{ marginBottom: 12 }}>
          <Select
            allowClear
            placeholder="Filter by Status"
            style={{ width: 180 }}
            onChange={setStatusFilter}
            options={['OPEN', 'IN_PROGRESS', 'EFFECTIVENESS_CHECK', 'CLOSED'].map((s) => ({
              value: s,
              label: s.replace(/_/g, ' '),
            }))}
          />
          <Select
            allowClear
            placeholder="Filter by Source"
            style={{ width: 160 }}
            onChange={setSourceFilter}
            options={['DEVIATION', 'AUDIT', 'COMPLAINT', 'OOS', 'INCIDENT'].map((s) => ({
              value: s,
              label: s,
            }))}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            New CAPA
          </Button>
        </Space>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small" />
      </Card>
      <Modal
        title="New CAPA"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="source" label="Source" rules={[{ required: true }]}>
            <Select
              options={['DEVIATION', 'AUDIT', 'COMPLAINT', 'OOS', 'INCIDENT'].map((s) => ({
                value: s,
                label: s,
              }))}
            />
          </Form.Item>
          <Form.Item name="source_ref" label="Source Reference" rules={[{ required: true }]}>
            <Input placeholder="e.g. DEV-001 or AUD-2026-Q1" />
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="priority" label="Priority" initialValue="MEDIUM">
            <Select
              options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => ({ value: s, label: s }))}
            />
          </Form.Item>
          <Form.Item name="due_date" label="Due Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
