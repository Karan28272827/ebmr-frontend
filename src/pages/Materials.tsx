import React, { useEffect, useState } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Select, Space, Typography, Tag, message, Spin,
} from 'antd';
import { PlusOutlined, BarcodeOutlined } from '@ant-design/icons';
import { authApi } from '../api/axios';
import BarcodeLabel from '../components/BarcodeLabel';

const UNITS = ['g', 'kg', 'mL', 'L', 'units', 'mg'];

export default function Materials() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [barcodeModal, setBarcodeModal] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    try {
      const res = await authApi.get('/materials');
      setMaterials(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await authApi.post('/materials', values);
      message.success('Material created');
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (err: any) {
      if (!err.errorFields) message.error(err.response?.data?.message || 'Failed to create material');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'materialCode',
      render: (code: string) => <Typography.Text code>{code}</Typography.Text>,
    },
    { title: 'Name', dataIndex: 'materialName' },
    { title: 'Unit', dataIndex: 'unit', render: (u: string) => <Tag>{u}</Tag> },
    { title: 'Description', dataIndex: 'description', ellipsis: true },
    {
      title: 'Barcode',
      render: (_: any, row: any) => (
        <Button
          size="small"
          icon={<BarcodeOutlined />}
          onClick={() => setBarcodeModal(row)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="Materials Master"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Add Material
          </Button>
        }
      >
        {loading ? (
          <Spin style={{ display: 'block', textAlign: 'center', margin: 40 }} />
        ) : (
          <Table
            dataSource={materials}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 20 }}
            size="middle"
          />
        )}
      </Card>

      <Modal
        title="Add Material"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={saving}
        okText="Create"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="materialCode" label="Material Code" rules={[{ required: true }]} extra="e.g. RM-PARA-API">
            <Input placeholder="RM-XXXX" style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          <Form.Item name="materialName" label="Material Name" rules={[{ required: true }]}>
            <Input placeholder="Paracetamol API" />
          </Form.Item>
          <Form.Item name="unit" label="Unit" rules={[{ required: true }]}>
            <Select placeholder="Select unit">
              {UNITS.map((u) => <Select.Option key={u} value={u}>{u}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={barcodeModal ? `Barcode — ${barcodeModal.materialName}` : ''}
        open={!!barcodeModal}
        onCancel={() => setBarcodeModal(null)}
        footer={[
          <Button key="print" onClick={() => window.print()}>Print</Button>,
          <Button key="close" onClick={() => setBarcodeModal(null)}>Close</Button>,
        ]}
        centered
      >
        {barcodeModal && (
          <Space direction="vertical" align="center" style={{ width: '100%', padding: '16px 0' }}>
            <BarcodeLabel value={barcodeModal.materialCode} label={barcodeModal.materialName} height={70} />
            <Typography.Text type="secondary">{barcodeModal.unit} · {barcodeModal.description}</Typography.Text>
          </Space>
        )}
      </Modal>
    </div>
  );
}
