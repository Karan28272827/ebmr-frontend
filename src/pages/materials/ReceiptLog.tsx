import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Button, Space, Select, Modal, Form, Input, InputNumber,
  DatePicker, Row, Col, Spin, Typography, message, Grid,
} from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { authApi } from '../../api/axios';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const { Option } = Select;

const QC_STATUS_COLOR: Record<string, string> = {
  PENDING_IQC: 'default',
  IQC_IN_PROGRESS: 'processing',
  IQC_PASSED: 'success',
  IQC_FAILED: 'error',
  IN_STORES: 'success',
  CONSUMED: 'default',
};

function expiryBadge(expiryDate: string) {
  const diff = dayjs(expiryDate).diff(dayjs(), 'day');
  if (diff < 0) return <Tag color="error">EXPIRED</Tag>;
  if (diff < 30) return <Tag color="error">CRITICAL ({diff}d)</Tag>;
  if (diff < 90) return <Tag color="warning">WARNING ({diff}d)</Tag>;
  return <Tag color="success">OK ({diff}d)</Tag>;
}

export default function ReceiptLog() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [qcFilter, setQcFilter] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [poList, setPoList] = useState<any[]>([]);
  const [selectedPo, setSelectedPo] = useState<any>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const screens = useBreakpoint();

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (qcFilter) params.set('qcStatus', qcFilter);
      if (expiryFilter === '30') {
        params.set('expiryBefore', dayjs().add(30, 'day').toISOString());
      } else if (expiryFilter === '90') {
        params.set('expiryBefore', dayjs().add(90, 'day').toISOString());
      }
      const res = await authApi.get(`/materials/receipts?${params}`);
      setReceipts(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [qcFilter, expiryFilter]);

  const openModal = async () => {
    try {
      const res = await authApi.get('/materials/po');
      setPoList(res.data);
    } catch {
      setPoList([]);
    }
    form.resetFields();
    setSelectedPo(null);
    setModalOpen(true);
  };

  const handlePoChange = (poId: string) => {
    const po = poList.find((p: any) => p.id === poId);
    setSelectedPo(po);
    if (po) {
      form.setFieldsValue({ unit: po.unit || '' });
    }
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const payload = {
        po_id: values.po_id,
        supplier_batch_no: values.supplier_batch_no,
        received_qty: values.received_qty,
        unit: values.unit,
        manufacture_date: values.manufacture_date ? values.manufacture_date.toISOString() : undefined,
        expiry_date: values.expiry_date ? values.expiry_date.toISOString() : undefined,
        coa_reference: values.coa_reference || undefined,
      };
      await authApi.post('/materials/receipts', payload);
      message.success('Receipt recorded successfully');
      setModalOpen(false);
      load();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to record receipt');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Receipt Code',
      dataIndex: 'receipt_code',
      key: 'receipt_code',
      render: (code: string, row: any) => (
        <Button type="link" onClick={() => navigate(`/materials/receipts/${row.id}`)} style={{ padding: 0 }}>
          {code}
        </Button>
      ),
    },
    {
      title: 'Supplier',
      key: 'supplier',
      render: (_: any, row: any) => row.po?.supplier_name || '-',
    },
    {
      title: 'Material',
      key: 'material',
      render: (_: any, row: any) => row.po?.material_name || '-',
    },
    {
      title: 'Received Qty',
      key: 'received_qty',
      render: (_: any, row: any) => `${row.received_qty} ${row.unit || ''}`,
    },
    {
      title: 'Received At',
      dataIndex: 'received_at',
      key: 'received_at',
      render: (d: string) => d ? dayjs(d).format('DD MMM YYYY HH:mm') : '-',
    },
    {
      title: 'Expiry Date',
      dataIndex: 'expiry_date',
      key: 'expiry_date',
      render: (d: string) => d ? (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: 12 }}>{dayjs(d).format('DD MMM YYYY')}</Text>
          {expiryBadge(d)}
        </Space>
      ) : '-',
    },
    {
      title: 'QC Status',
      dataIndex: 'qc_status',
      key: 'qc_status',
      render: (s: string) => <Tag color={QC_STATUS_COLOR[s] || 'default'}>{s?.replace(/_/g, ' ')}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, row: any) => (
        <Button
          icon={<EyeOutlined />}
          size="small"
          onClick={() => navigate(`/materials/receipts/${row.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  const mobileColumns = columns.filter((c) =>
    ['receipt_code', 'expiry_date', 'qc_status', 'actions'].includes(c.key as string)
  );

  return (
    <div style={{ padding: screens.md ? 24 : 12 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Material Receipt Log</Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>
            Record New Receipt
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={8}>
            <Select
              allowClear
              placeholder="Filter by QC Status"
              style={{ width: '100%' }}
              value={qcFilter || undefined}
              onChange={(v) => setQcFilter(v || '')}
            >
              <Option value="PENDING_IQC">Pending IQC</Option>
              <Option value="IQC_IN_PROGRESS">IQC In Progress</Option>
              <Option value="IQC_PASSED">IQC Passed</Option>
              <Option value="IQC_FAILED">IQC Failed</Option>
              <Option value="IN_STORES">In Stores</Option>
              <Option value="CONSUMED">Consumed</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              allowClear
              placeholder="Filter by Expiry"
              style={{ width: '100%' }}
              value={expiryFilter || undefined}
              onChange={(v) => setExpiryFilter(v || '')}
            >
              <Option value="">All</Option>
              <Option value="30">Expiring in 30 days</Option>
              <Option value="90">Expiring in 90 days</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        {screens.md ? (
          <Table
            dataSource={receipts}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 20, showSizeChanger: true }}
          />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            {receipts.map((r: any) => (
              <Card
                key={r.id}
                size="small"
                onClick={() => navigate(`/materials/receipts/${r.id}`)}
                style={{ cursor: 'pointer' }}
                title={
                  <Space>
                    <Text strong>{r.receipt_code}</Text>
                    <Tag color={QC_STATUS_COLOR[r.qc_status] || 'default'}>
                      {r.qc_status?.replace(/_/g, ' ')}
                    </Tag>
                  </Space>
                }
              >
                <Row gutter={[8, 4]}>
                  <Col span={12}>
                    <Text type="secondary">Supplier:</Text>
                    <br />
                    <Text>{r.po?.supplier_name || '-'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Material:</Text>
                    <br />
                    <Text>{r.po?.material_name || '-'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Qty:</Text>
                    <br />
                    <Text>{r.received_qty} {r.unit}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Expiry:</Text>
                    <br />
                    {r.expiry_date ? (
                      <Space direction="vertical" size={2}>
                        <Text style={{ fontSize: 12 }}>{dayjs(r.expiry_date).format('DD MMM YYYY')}</Text>
                        {expiryBadge(r.expiry_date)}
                      </Space>
                    ) : '-'}
                  </Col>
                </Row>
              </Card>
            ))}
            {receipts.length === 0 && !loading && (
              <Card>
                <Text type="secondary">No receipts found.</Text>
              </Card>
            )}
          </Space>
        )}
      </Spin>

      <Modal
        title="Record New Receipt"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ version: 'v1.0' }}
        >
          <Form.Item
            label="Purchase Order"
            name="po_id"
            rules={[{ required: true, message: 'Please select a PO' }]}
          >
            <Select
              showSearch
              placeholder="Select PO"
              optionFilterProp="children"
              onChange={handlePoChange}
            >
              {poList.map((po: any) => (
                <Option key={po.id} value={po.id}>
                  {po.po_number} — {po.supplier_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {selectedPo && (
            <Card size="small" style={{ marginBottom: 16, background: '#f6ffed', borderColor: '#b7eb8f' }}>
              <Text strong>Material: </Text><Text>{selectedPo.material_name}</Text>
              <br />
              <Text strong>Ordered Qty: </Text><Text>{selectedPo.quantity} {selectedPo.unit}</Text>
            </Card>
          )}

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="Supplier Batch No."
                name="supplier_batch_no"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="e.g. BT-2024-001" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="Received Qty"
                name="received_qty"
                rules={[{ required: true, message: 'Required' }]}
              >
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Unit" name="unit" rules={[{ required: true, message: 'Required' }]}>
                <Input placeholder="kg / L / pcs" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Manufacture Date" name="manufacture_date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={
                  <span>
                    Expiry Date{' '}
                    <Tag color="error" style={{ marginLeft: 4 }}>REQUIRED</Tag>
                  </span>
                }
                name="expiry_date"
                rules={[{ required: true, message: 'Expiry date is required' }]}
              >
                <DatePicker
                  style={{ width: '100%', borderColor: '#ff4d4f' }}
                  disabledDate={(d) => d && d.isBefore(dayjs())}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="CoA Reference (optional)" name="coa_reference">
            <Input placeholder="Certificate of Analysis ref." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Record Receipt
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
