import React, { useEffect, useState } from 'react';
import { Table, Card, Tag, Button, Modal, Form, Input, Select, Space, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/axios';
import dayjs from 'dayjs';

const STATUS_COLOR: Record<string, string> = { ACTIVE: 'green', SUSPENDED: 'orange', DISQUALIFIED: 'red' };

export default function VendorList() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [form] = Form.useForm();

  const fetch = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await authApi.get(`/vendors${params}`);
      setData(res.data);
    } catch { message.error('Failed to load vendors'); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [statusFilter]);

  const handleCreate = async (vals: any) => {
    setSubmitting(true);
    try {
      await authApi.post('/vendors', vals);
      message.success('Vendor created');
      setModalOpen(false);
      form.resetFields();
      fetch();
    } catch { message.error('Failed to create vendor'); }
    setSubmitting(false);
  };

  const columns = [
    { title: 'Code', dataIndex: 'vendor_code', key: 'vendor_code' },
    { title: 'Name', dataIndex: 'name', key: 'name', render: (v: string, r: any) => <Button type="link" onClick={() => navigate(`/vendors/${r.id}`)}>{v}</Button> },
    { title: 'Country', dataIndex: 'country', key: 'country' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={STATUS_COLOR[v] || 'default'}>{v}</Tag> },
    { title: 'Materials', dataIndex: 'materials_supplied', key: 'materials', render: (v: string[]) => (v || []).slice(0, 3).map((m: string) => <Tag key={m} style={{ marginBottom: 2 }}>{m}</Tag>) },
    { title: 'Next Audit', dataIndex: 'next_audit_date', key: 'next_audit', render: (v: string) => v ? dayjs(v).format('DD MMM YYYY') : '—' },
    { title: 'POs', dataIndex: '_count', key: 'pos', render: (v: any) => v?.purchase_orders ?? 0 },
  ];

  return (
    <div>
      <Typography.Title level={4}>Vendor Master</Typography.Title>
      <Card>
        <Space style={{ marginBottom: 12 }}>
          <Select allowClear placeholder="Filter by Status" style={{ width: 160 }} onChange={setStatusFilter}
            options={['ACTIVE','SUSPENDED','DISQUALIFIED'].map(s => ({ value: s, label: s }))} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>New Vendor</Button>
        </Space>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small" />
      </Card>
      <Modal title="New Vendor" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} confirmLoading={submitting} width={600}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="Vendor Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="country" label="Country" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="contact_name" label="Contact Name"><Input /></Form.Item>
          <Form.Item name="contact_email" label="Contact Email"><Input /></Form.Item>
          <Form.Item name="contact_phone" label="Contact Phone"><Input /></Form.Item>
          <Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="materials_supplied" label="Materials Supplied"><Select mode="tags" placeholder="Enter material codes" /></Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
