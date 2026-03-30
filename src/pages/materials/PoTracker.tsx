import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Button, Space, Modal, Form, Input, InputNumber, Select, DatePicker,
  Typography, Row, Col, message, Statistic,
} from 'antd';
import { Grid } from 'antd';
import { PlusOutlined, DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { authApi } from '../../api/axios';

const { useBreakpoint } = Grid;

const PO_STATUS_COLOR: Record<string, string> = {
  RAISED: 'default',
  RECEIVED: 'processing',
  GRN: 'success',
  ACCOUNTS: 'purple',
};

const PO_STATUS_COLUMNS = ['RAISED', 'RECEIVED', 'GRN', 'ACCOUNTS'];

export default function PoTracker() {
  const [pos, setPos] = useState<any[]>([]);
  const [intents, setIntents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const screens = useBreakpoint();

  const load = async () => {
    setLoading(true);
    try {
      const [posRes, intentsRes] = await Promise.all([
        authApi.get('/materials/po'),
        authApi.get('/materials/intent'),
      ]);
      setPos(posRes.data);
      setIntents(intentsRes.data.filter((i: any) => i.status === 'RAISED'));
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load PO tracker');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = {
        ...values,
        expected_delivery_date: values.expected_delivery_date?.toISOString(),
      };
      await authApi.post('/materials/po', payload);
      message.success('PO created successfully');
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (err: any) {
      if (!err.errorFields) {
        message.error(err.response?.data?.message || 'Failed to create PO');
      }
    } finally {
      setSaving(false);
    }
  };

  const tableColumns = [
    { title: 'PO Number', dataIndex: 'po_number', key: 'po_number', render: (v: string) => <Typography.Text code>{v}</Typography.Text> },
    { title: 'Supplier', dataIndex: 'supplier', key: 'supplier', ellipsis: true },
    { title: 'Material', dataIndex: 'material_name', key: 'material_name', ellipsis: true },
    { title: 'Qty', key: 'qty', render: (_: any, r: any) => `${r.quantity} ${r.unit || ''}` },
    { title: 'Value', dataIndex: 'total_value', key: 'total_value', render: (v: number) => v ? `${v.toLocaleString()}` : '—' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={PO_STATUS_COLOR[v] || 'default'}>{v?.replace(/_/g, ' ')}</Tag>,
    },
    {
      title: 'Expected Delivery',
      dataIndex: 'expected_delivery_date',
      key: 'expected_delivery_date',
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD') : '—'),
    },
  ];

  // Kanban column
  const KanbanColumn = ({ status }: { status: string }) => {
    const colPos = pos.filter((p) => p.status === status);
    return (
      <div style={{ flex: 1, minWidth: 220 }}>
        <div
          style={{
            background: '#f0f2f5',
            borderRadius: 8,
            padding: '12px 8px',
            minHeight: 300,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <Typography.Text strong>{status.replace(/_/g, ' ')}</Typography.Text>
            <Tag color={PO_STATUS_COLOR[status] || 'default'}>{colPos.length}</Tag>
          </div>

          <Space direction="vertical" style={{ width: '100%' }}>
            {colPos.map((po) => (
              <Card
                key={po.id}
                size="small"
                style={{ borderRadius: 6 }}
              >
                <Typography.Text strong style={{ display: 'block' }}>
                  {po.po_number}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {po.supplier}
                </Typography.Text>
                <br />
                <Typography.Text style={{ fontSize: 12 }}>
                  {po.material_name}
                </Typography.Text>
                <br />
                <Space size={4} style={{ marginTop: 4 }}>
                  <Tag style={{ fontSize: 11 }}>{po.quantity} {po.unit}</Tag>
                  {po.total_value && (
                    <Tag icon={<DollarOutlined />} style={{ fontSize: 11 }}>
                      {po.total_value.toLocaleString()}
                    </Tag>
                  )}
                </Space>
                {po.expected_delivery_date && (
                  <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                    Delivery: {dayjs(po.expected_delivery_date).format('YYYY-MM-DD')}
                  </Typography.Text>
                )}
              </Card>
            ))}

            {colPos.length === 0 && (
              <Typography.Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '24px 0' }}>
                No POs
              </Typography.Text>
            )}
          </Space>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          PO Tracker
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Create PO
        </Button>
      </div>

      {/* Desktop: Kanban board; Mobile: Table */}
      {screens.md ? (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
          {PO_STATUS_COLUMNS.map((status) => (
            <KanbanColumn key={status} status={status} />
          ))}
        </div>
      ) : (
        <Card>
          <Table
            dataSource={pos}
            columns={tableColumns}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20 }}
            size="middle"
            scroll={{ x: true }}
          />
        </Card>
      )}

      <Modal
        title="Create Purchase Order"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={saving}
        okText="Create PO"
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="intent_id" label="Linked Intent (optional)">
            <Select
              placeholder="Select intent"
              allowClear
              showSearch
              filterOption={(input, opt) =>
                (opt?.label as string || '').toLowerCase().includes(input.toLowerCase())
              }
              options={intents.map((i) => ({
                value: i.id,
                label: `${i.intent_code} — ${i.material_name}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="material_name"
            label="Material Name"
            rules={[{ required: true, message: 'Material name is required' }]}
          >
            <Input placeholder="e.g. Paracetamol API" />
          </Form.Item>

          <Form.Item
            name="supplier"
            label="Supplier"
            rules={[{ required: true, message: 'Supplier is required' }]}
          >
            <Input placeholder="Supplier name" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="quantity"
                label="Quantity"
                rules={[{ required: true, message: 'Quantity is required' }]}
              >
                <InputNumber min={0} step={0.001} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit"
                label="Unit"
                rules={[{ required: true, message: 'Unit is required' }]}
              >
                <Input placeholder="kg, g, L..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="unit_price" label="Unit Price">
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="total_value" label="Total Value">
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="expected_delivery_date" label="Expected Delivery Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Additional notes..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
