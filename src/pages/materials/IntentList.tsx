import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Button, Space, Modal, Form, Input, InputNumber, Select, DatePicker,
  Typography, message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { authApi } from '../../api/axios';

const INTENT_STATUS_COLOR: Record<string, string> = {
  RAISED: 'default',
  PO_RAISED: 'processing',
  RECEIVED: 'success',
  CANCELLED: 'error',
};

const UNITS = ['g', 'kg', 'mL', 'L', 'units', 'mg', 'tablets', 'capsules'];

export default function IntentList() {
  const [intents, setIntents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const res = await authApi.get('/materials/intent');
      setIntents(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load intents');
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
        needed_by_date: values.needed_by_date?.toISOString(),
      };
      await authApi.post('/materials/intent', payload);
      message.success('Intent raised successfully');
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (err: any) {
      if (!err.errorFields) {
        message.error(err.response?.data?.message || 'Failed to raise intent');
      }
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Intent Code',
      dataIndex: 'intent_code',
      key: 'intent_code',
      render: (v: string) => <Typography.Text code>{v}</Typography.Text>,
    },
    { title: 'Material Name', dataIndex: 'material_name', key: 'material_name', ellipsis: true },
    { title: 'Material Code', dataIndex: 'material_code', key: 'material_code' },
    {
      title: 'Quantity',
      key: 'quantity',
      render: (_: any, r: any) => `${r.quantity_needed} ${r.unit || ''}`,
    },
    {
      title: 'Needed By',
      dataIndex: 'needed_by_date',
      key: 'needed_by_date',
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD') : '—'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (v: string) => (
        <Tag color={INTENT_STATUS_COLOR[v] || 'default'}>{v?.replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Raised By',
      dataIndex: 'raised_by',
      key: 'raised_by',
      render: (v: any) => v?.name || v || '—',
    },
    {
      title: 'Raised At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD') : '—'),
    },
  ];

  return (
    <div>
      <Card
        title={
          <Typography.Title level={4} style={{ margin: 0 }}>
            Material Intents
          </Typography.Title>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Raise New Intent
          </Button>
        }
      >
        <Table
          dataSource={intents}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          size="middle"
        />
      </Card>

      <Modal
        title="Raise Material Intent"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={saving}
        okText="Raise Intent"
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="material_name"
            label="Material Name"
            rules={[{ required: true, message: 'Material name is required' }]}
          >
            <Input placeholder="e.g. Paracetamol API" />
          </Form.Item>

          <Form.Item
            name="material_code"
            label="Material Code"
            rules={[{ required: true, message: 'Material code is required' }]}
          >
            <Input placeholder="e.g. RM-PARA-001" style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Space.Compact style={{ width: '100%' }}>
            <Form.Item
              name="quantity_needed"
              label="Quantity Needed"
              rules={[{ required: true, message: 'Quantity is required' }]}
              style={{ flex: 1, marginBottom: 0 }}
            >
              <InputNumber
                min={0}
                step={0.001}
                style={{ width: '100%' }}
                placeholder="0.00"
              />
            </Form.Item>
            <Form.Item
              name="unit"
              label="Unit"
              rules={[{ required: true, message: 'Unit is required' }]}
              style={{ width: 120 }}
            >
              <Select placeholder="Unit">
                {UNITS.map((u) => (
                  <Select.Option key={u} value={u}>{u}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Space.Compact>

          <Form.Item
            name="needed_by_date"
            label="Needed By Date"
            rules={[{ required: true, message: 'Needed by date is required' }]}
            style={{ marginTop: 16 }}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="reason" label="Reason / Purpose">
            <Input.TextArea rows={3} placeholder="Brief description of why this material is needed..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
