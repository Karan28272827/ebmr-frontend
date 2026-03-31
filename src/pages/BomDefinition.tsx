import React, { useEffect, useState } from 'react';
import {
  Card,
  Select,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Space,
  Tag,
  Typography,
  message,
  Popconfirm,
  Spin,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { authApi } from '../api/axios';
import { useAppSelector } from '../store/hooks';

const ROLE_LEVEL: Record<string, number> = {
  BATCH_OPERATOR: 1,
  SUPERVISOR: 2,
  QA_REVIEWER: 3,
  QA_MANAGER: 4,
  QUALIFIED_PERSON: 5,
};

export default function BomDefinition() {
  const { user } = useAppSelector((s) => s.auth);
  const [templates, setTemplates] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [bomItems, setBomItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const canEdit = (ROLE_LEVEL[user?.role || ''] || 0) >= ROLE_LEVEL.SUPERVISOR;

  useEffect(() => {
    authApi.get('/batches/templates').then((r) => setTemplates(r.data));
    authApi.get('/materials').then((r) => setMaterials(r.data));
  }, []);

  const loadBoM = async (templateId: string) => {
    setLoading(true);
    try {
      const res = await authApi.get(`/bom/templates/${templateId}`);
      setBomItems(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (id: string) => {
    setSelectedTemplate(id);
    loadBoM(id);
  };

  const handleAdd = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await authApi.post(`/bom/templates/${selectedTemplate}/items`, values);
      message.success('BoM item added');
      setModalOpen(false);
      form.resetFields();
      loadBoM(selectedTemplate!);
    } catch (err: any) {
      if (!err.errorFields) message.error(err.response?.data?.message || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (itemId: string) => {
    try {
      await authApi.delete(`/bom/items/${itemId}`);
      message.success('Item removed');
      loadBoM(selectedTemplate!);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to remove item');
    }
  };

  const existingMaterialIds = new Set(bomItems.map((i) => i.materialId));
  const availableMaterials = materials.filter((m) => !existingMaterialIds.has(m.id));

  const columns = [
    {
      title: 'Material Code',
      dataIndex: ['material', 'materialCode'],
      render: (code: string) => <Typography.Text code>{code}</Typography.Text>,
    },
    { title: 'Material Name', dataIndex: ['material', 'materialName'] },
    { title: 'Unit', dataIndex: ['material', 'unit'], render: (u: string) => <Tag>{u}</Tag> },
    {
      title: 'Qty / kg output',
      dataIndex: 'qtyPerKg',
      render: (v: number, row: any) => `${v} ${row.material?.unit || ''}`,
    },
    { title: 'Notes', dataIndex: 'notes', ellipsis: true },
    ...(canEdit
      ? [
          {
            title: '',
            render: (_: any, row: any) => (
              <Popconfirm
                title="Remove this BoM item?"
                onConfirm={() => handleRemove(row.id)}
                okText="Remove"
                okType="danger"
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <Card title="Bill of Materials Definition">
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Select
            placeholder="Select a product template"
            style={{ width: 360 }}
            onChange={handleTemplateChange}
            options={templates.map((t) => ({
              value: t.id,
              label: `${t.productCode} — ${t.productName}`,
            }))}
          />

          {selectedTemplate && (
            <Card
              title={`BoM: ${templates.find((t) => t.id === selectedTemplate)?.productName}`}
              extra={
                canEdit && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setModalOpen(true)}
                    disabled={availableMaterials.length === 0}
                  >
                    Add Item
                  </Button>
                )
              }
              size="small"
            >
              {loading ? (
                <Spin style={{ display: 'block', textAlign: 'center', margin: 20 }} />
              ) : (
                <Table
                  dataSource={bomItems}
                  columns={columns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  locale={{ emptyText: 'No BoM items defined for this template' }}
                />
              )}
            </Card>
          )}
        </Space>
      </Card>

      <Modal
        title="Add BoM Item"
        open={modalOpen}
        onOk={handleAdd}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={saving}
        okText="Add"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="materialId" label="Material" rules={[{ required: true }]}>
            <Select
              placeholder="Select material"
              showSearch
              filterOption={(input, opt) =>
                ((opt?.label as string) || '').toLowerCase().includes(input.toLowerCase())
              }
              options={availableMaterials.map((m) => ({
                value: m.id,
                label: `${m.materialCode} — ${m.materialName} (${m.unit})`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="qtyPerKg"
            label="Quantity per 1 kg of batch output"
            rules={[{ required: true }]}
            extra="e.g. 500 g/kg means 500g of this material is needed per 1 kg of product"
          >
            <InputNumber min={0} step={0.001} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Optional handling instructions" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
