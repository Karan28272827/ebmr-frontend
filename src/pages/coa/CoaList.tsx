import React, { useEffect, useState } from 'react';
import {
  Table,
  Card,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Typography,
  message,
  Popconfirm,
} from 'antd';
import { PlusOutlined, FileDoneOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { authApi } from '../../api/axios';
import { useAppSelector } from '../../store/hooks';
import dayjs from 'dayjs';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default',
  RELEASED: 'green',
  REVOKED: 'red',
};

export default function CoaList() {
  const { user } = useAppSelector((s: any) => s.auth);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [productFilter, setProductFilter] = useState('');
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (productFilter) params.set('productCode', productFilter);
      const res = await authApi.get(`/coa?${params}`);
      setData(res.data);
    } catch {
      message.error('Failed to load Certificates of Analysis');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [productFilter]);

  const handleGenerate = async (vals: any) => {
    setSubmitting(true);
    try {
      await authApi.post('/coa', vals);
      message.success('Certificate of Analysis generated');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch {
      message.error('Failed to generate CoA');
    }
    setSubmitting(false);
  };

  const handleRelease = async (id: string) => {
    try {
      await authApi.post(`/coa/${id}/release`);
      message.success('CoA released');
      fetchData();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Failed to release CoA');
    }
  };

  const canRelease = user?.role && ['QUALIFIED_PERSON', 'SYSTEM_ADMIN'].includes(user.role);

  const columns = [
    { title: 'CoA Number', dataIndex: 'coa_number', key: 'coa_number' },
    { title: 'Product Code', dataIndex: 'product_code', key: 'product_code' },
    {
      title: 'Batch',
      key: 'batch',
      render: (_: any, r: any) => r.batch?.batch_number || r.batch_id,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={STATUS_COLOR[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Generated',
      dataIndex: 'generated_at',
      key: 'generated_at',
      render: (v: string) => (v ? dayjs(v).format('DD MMM YYYY') : '—'),
    },
    {
      title: 'Released',
      dataIndex: 'released_at',
      key: 'released_at',
      render: (v: string) => (v ? dayjs(v).format('DD MMM YYYY') : '—'),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, r: any) =>
        canRelease && r.status === 'DRAFT' ? (
          <Popconfirm
            title="Release this CoA?"
            onConfirm={() => handleRelease(r.id)}
            okText="Release"
          >
            <Button size="small" type="primary" icon={<CheckCircleOutlined />}>
              Release
            </Button>
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>
        <FileDoneOutlined /> Certificates of Analysis
      </Typography.Title>
      <Card>
        <Space style={{ marginBottom: 12 }}>
          <Input.Search
            placeholder="Filter by product code"
            allowClear
            style={{ width: 220 }}
            onSearch={setProductFilter}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Generate CoA
          </Button>
        </Space>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small" />
      </Card>

      <Modal
        title="Generate Certificate of Analysis"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical" onFinish={handleGenerate}>
          <Form.Item name="batch_id" label="Batch ID" rules={[{ required: true }]}>
            <Input placeholder="Batch UUID" />
          </Form.Item>
          <Form.Item name="product_code" label="Product Code" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
