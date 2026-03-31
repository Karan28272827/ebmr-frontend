import React, { useEffect, useState } from 'react';
import {
  Table,
  Card,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Space,
  Typography,
  Row,
  Col,
  Alert,
  message,
} from 'antd';
import { authApi } from '../../api/axios';
import dayjs from 'dayjs';

export default function StockDashboard() {
  const [stock, setStock] = useState<any[]>([]);
  const [expiry, setExpiry] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [fefoModal, setFefoModal] = useState(false);
  const [fefoResult, setFefoResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [stockRes, expiryRes] = await Promise.all([
        authApi.get('/stock'),
        authApi.get('/stock/expiry'),
      ]);
      setStock(stockRes.data);
      setExpiry(expiryRes.data);
    } catch {
      message.error('Failed to load stock data');
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const handleFefo = async (vals: any) => {
    setSubmitting(true);
    try {
      const res = await authApi.post('/stock/fefo-issue', vals);
      setFefoResult(res.data);
    } catch {
      message.error('FEFO issue failed');
    }
    setSubmitting(false);
  };

  const stockColumns = [
    { title: 'Material Code', dataIndex: 'material_code', key: 'material_code' },
    { title: 'Material Name', dataIndex: 'material_name', key: 'material_name' },
    {
      title: 'Total Qty',
      dataIndex: 'total_qty',
      key: 'total_qty',
      render: (v: number, r: any) => `${v.toLocaleString()} ${r.unit}`,
    },
    {
      title: 'Lots Available',
      dataIndex: 'lots',
      key: 'lots',
      render: (v: any[]) => v?.length ?? 0,
    },
    {
      title: 'Earliest Expiry',
      dataIndex: 'lots',
      key: 'expiry',
      render: (v: any[]) =>
        v?.[0]?.expiry_date ? dayjs(v[0].expiry_date).format('DD MMM YYYY') : '—',
    },
  ];

  const expirySection = (label: string, key: string, color: string) => {
    const items = expiry[key] || [];
    return (
      <Card
        title={
          <span style={{ color }}>
            {label} ({items.length})
          </span>
        }
        size="small"
      >
        {items.length === 0 ? (
          <Typography.Text type="secondary">None</Typography.Text>
        ) : (
          items.slice(0, 5).map((r: any) => (
            <div key={r.id} style={{ marginBottom: 4 }}>
              <Tag color={color}>{r.material_code}</Tag> {r.received_qty.toLocaleString()} {r.unit}{' '}
              — {dayjs(r.expiry_date).format('DD MMM YYYY')}
            </div>
          ))
        )}
      </Card>
    );
  };

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }} wrap>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Stock Dashboard (FEFO)
        </Typography.Title>
        <Button type="primary" onClick={() => setFefoModal(true)}>
          FEFO Issue
        </Button>
      </Space>
      <Card title="Current Stock" style={{ marginBottom: 16 }}>
        <Table
          dataSource={stock}
          columns={stockColumns}
          rowKey="material_code"
          loading={loading}
          size="small"
          expandable={{
            expandedRowRender: (r: any) => (
              <Table
                size="small"
                dataSource={r.lots}
                rowKey="receipt_id"
                pagination={false}
                columns={[
                  { title: 'Receipt', dataIndex: 'receipt_code', key: 'rc' },
                  {
                    title: 'Qty',
                    dataIndex: 'qty',
                    key: 'qty',
                    render: (v: number) => v.toLocaleString(),
                  },
                  {
                    title: 'Expiry',
                    dataIndex: 'expiry_date',
                    key: 'exp',
                    render: (v: string) => dayjs(v).format('DD MMM YYYY'),
                  },
                  {
                    title: 'Location',
                    dataIndex: 'store_location',
                    key: 'loc',
                    render: (v: string) => v || '—',
                  },
                ]}
              />
            ),
          }}
        />
      </Card>
      <Typography.Title level={5}>Expiry Report</Typography.Title>
      <Row gutter={12}>
        <Col xs={24} sm={12} md={6}>
          {expirySection('Expired', 'EXPIRED', '#ff4d4f')}
        </Col>
        <Col xs={24} sm={12} md={6}>
          {expirySection('Critical (≤30d)', 'CRITICAL', '#fa541c')}
        </Col>
        <Col xs={24} sm={12} md={6}>
          {expirySection('Warning (31-60d)', 'WARNING', '#faad14')}
        </Col>
        <Col xs={24} sm={12} md={6}>
          {expirySection('Notice (61-90d)', 'NOTICE', '#52c41a')}
        </Col>
      </Row>
      <Modal
        title="FEFO Material Issue"
        open={fefoModal}
        onCancel={() => {
          setFefoModal(false);
          setFefoResult(null);
          form.resetFields();
        }}
        footer={
          fefoResult ? (
            <Button
              onClick={() => {
                setFefoModal(false);
                setFefoResult(null);
                form.resetFields();
              }}
            >
              Close
            </Button>
          ) : null
        }
      >
        {fefoResult ? (
          <div>
            <Alert
              message={
                fefoResult.shortfall > 0
                  ? `Issued ${fefoResult.total_issued} — Shortfall: ${fefoResult.shortfall}`
                  : `Issued ${fefoResult.total_issued} successfully`
              }
              type={fefoResult.shortfall > 0 ? 'warning' : 'success'}
              style={{ marginBottom: 12 }}
            />
            {fefoResult.lots_used.map((l: any, i: number) => (
              <div key={i}>
                <Tag color="blue">{l.receipt_code}</Tag> {l.qty_taken} — Exp:{' '}
                {dayjs(l.expiry_date).format('DD MMM YYYY')}
              </div>
            ))}
          </div>
        ) : (
          <Form form={form} layout="vertical" onFinish={handleFefo}>
            <Form.Item name="material_code" label="Material Code" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="quantity_needed" label="Quantity Needed" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="unit" label="Unit" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="batch_id" label="Batch ID" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="step_number" label="Step Number">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="notes" label="Notes">
              <Input />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Issue (FEFO)
            </Button>
          </Form>
        )}
      </Modal>
    </div>
  );
}
