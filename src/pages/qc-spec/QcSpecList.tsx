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
  Space,
  Typography,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/axios';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default',
  APPROVED: 'green',
  SUPERSEDED: 'orange',
};

export default function QcSpecList() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [productFilter, setProductFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [form] = Form.useForm();

  const fetch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (productFilter) params.set('productCode', productFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await authApi.get(`/qc-specs?${params}`);
      setData(res.data);
    } catch {
      message.error('Failed to load QC specifications');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, [productFilter, statusFilter]);

  const handleCreate = async (vals: any) => {
    setSubmitting(true);
    try {
      const created = await authApi.post('/qc-specs', vals);
      message.success('QC Specification created');
      setModalOpen(false);
      form.resetFields();
      navigate(`/qc-specs/${created.data.id}`);
    } catch {
      message.error('Failed to create QC specification');
    }
    setSubmitting(false);
  };

  const columns = [
    {
      title: 'Spec Code',
      dataIndex: 'spec_code',
      key: 'spec_code',
      render: (v: string, r: any) => (
        <Button type="link" onClick={() => navigate(`/qc-specs/${r.id}`)}>
          {v}
        </Button>
      ),
    },
    { title: 'Product Code', dataIndex: 'product_code', key: 'product_code' },
    { title: 'Product Name', dataIndex: 'product_name', key: 'product_name', ellipsis: true },
    { title: 'Version', dataIndex: 'version', key: 'version' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={STATUS_COLOR[v] || 'default'}>{v}</Tag>,
    },
    { title: 'Parameters', key: 'params', render: (_: any, r: any) => r.parameters?.length ?? 0 },
  ];

  return (
    <div>
      <Typography.Title level={4}>QC Specifications</Typography.Title>
      <Card>
        <Space style={{ marginBottom: 12 }}>
          <Input.Search
            placeholder="Filter by product code"
            allowClear
            style={{ width: 220 }}
            onSearch={setProductFilter}
          />
          <Select
            allowClear
            placeholder="Filter by status"
            style={{ width: 160 }}
            onChange={setStatusFilter}
            options={['DRAFT', 'APPROVED', 'SUPERSEDED'].map((s) => ({ value: s, label: s }))}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            New Spec
          </Button>
        </Space>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small" />
      </Card>

      <Modal
        title="New QC Specification"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="product_code" label="Product Code" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="product_name" label="Product Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="version" label="Version" initialValue="1.0" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
