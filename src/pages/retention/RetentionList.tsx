import React, { useEffect, useState } from 'react';
import { Table, Card, Tag, Button, Modal, Form, Input, Select, InputNumber, Space, Typography, Row, Col, Statistic, message, Tabs, Popconfirm } from 'antd';
import { PlusOutlined, ExperimentOutlined } from '@ant-design/icons';
import { authApi } from '../../api/axios';
import dayjs from 'dayjs';

const STATUS_COLOR: Record<string, string> = { STORED: 'blue', PARTIALLY_WITHDRAWN: 'orange', WITHDRAWN: 'default', DESTROYED: 'red' };

export default function RetentionList() {
  const [data, setData] = useState<any[]>([]);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [withdrawModal, setWithdrawModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [form] = Form.useForm();
  const [withdrawForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const [listRes, expiringRes] = await Promise.all([
        authApi.get(`/retention?${params}`),
        authApi.get('/retention/expiring?days=60'),
      ]);
      setData(listRes.data);
      setExpiring(expiringRes.data);
    } catch { message.error('Failed to load retention samples'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const handleCreate = async (vals: any) => {
    setSubmitting(true);
    try {
      await authApi.post('/retention', {
        ...vals,
        retain_until: vals.retain_until ? dayjs(vals.retain_until, 'YYYY-MM-DD').toISOString() : undefined,
      });
      message.success('Retention sample registered');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch { message.error('Failed to create retention record'); }
    setSubmitting(false);
  };

  const handleWithdraw = async (vals: any) => {
    if (!withdrawModal.id) return;
    setSubmitting(true);
    try {
      await authApi.post(`/retention/${withdrawModal.id}/withdraw`, vals);
      message.success('Withdrawal recorded');
      setWithdrawModal({ open: false, id: null });
      withdrawForm.resetFields();
      fetchData();
    } catch { message.error('Failed to record withdrawal'); }
    setSubmitting(false);
  };

  const columns = [
    { title: 'Sample Code', dataIndex: 'sample_code', key: 'sample_code' },
    { title: 'Batch', key: 'batch', render: (_: any, r: any) => r.batch?.batch_number || r.batch_id },
    { title: 'Product', dataIndex: 'product_code', key: 'product_code' },
    { title: 'Quantity', key: 'qty', render: (_: any, r: any) => `${r.quantity} ${r.unit}` },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={STATUS_COLOR[v] || 'default'}>{v.replace(/_/g, ' ')}</Tag> },
    { title: 'Retain Until', dataIndex: 'retain_until', key: 'retain_until', render: (v: string) => { if (!v) return '—'; const d = dayjs(v); return <span style={{ color: d.isBefore(dayjs()) ? 'red' : 'inherit' }}>{d.format('DD MMM YYYY')}</span>; } },
    {
      title: 'Action', key: 'action', render: (_: any, r: any) =>
        r.status !== 'WITHDRAWN' && r.status !== 'DESTROYED'
          ? <Button size="small" onClick={() => setWithdrawModal({ open: true, id: r.id })}>Withdraw</Button>
          : null,
    },
  ];

  return (
    <div>
      <Typography.Title level={4}><ExperimentOutlined /> Retention Samples</Typography.Title>

      {expiring.length > 0 && (
        <Card style={{ marginBottom: 16, borderColor: '#fa8c16' }}>
          <Typography.Text type="warning" strong>{expiring.length} sample(s) expiring within 60 days</Typography.Text>
        </Card>
      )}

      <Card>
        <Space style={{ marginBottom: 12 }}>
          <Select
            allowClear
            placeholder="Filter by status"
            style={{ width: 200 }}
            onChange={setStatusFilter}
            options={['STORED', 'PARTIALLY_WITHDRAWN', 'WITHDRAWN', 'DESTROYED'].map(s => ({ value: s, label: s.replace(/_/g, ' ') }))}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Register Sample</Button>
        </Space>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small" />
      </Card>

      <Modal title="Register Retention Sample" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} confirmLoading={submitting}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="batch_id" label="Batch ID" rules={[{ required: true }]}>
            <Input placeholder="Batch UUID or number" />
          </Form.Item>
          <Form.Item name="product_code" label="Product Code" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space>
            <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="unit" label="Unit" rules={[{ required: true }]}>
              <Input style={{ width: 80 }} placeholder="g / mL" />
            </Form.Item>
          </Space>
          <Form.Item name="storage_location" label="Storage Location" rules={[{ required: true }]}>
            <Input placeholder="e.g. Shelf A3-R2" />
          </Form.Item>
          <Form.Item name="retain_until" label="Retain Until (YYYY-MM-DD)">
            <Input placeholder="2028-03-31" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Record Withdrawal" open={withdrawModal.open} onCancel={() => setWithdrawModal({ open: false, id: null })} onOk={() => withdrawForm.submit()} confirmLoading={submitting}>
        <Form form={withdrawForm} layout="vertical" onFinish={handleWithdraw}>
          <Form.Item name="quantity_withdrawn" label="Quantity Withdrawn" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <Select options={['TESTING', 'COMPLAINT_INVESTIGATION', 'REGULATORY', 'DISPOSAL'].map(s => ({ value: s, label: s.replace(/_/g, ' ') }))} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
