import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Tag, Button, Space, Select, Input, Card, Row, Col, Spin, Typography,
  Modal, Form, InputNumber, message, Alert,
} from 'antd';
import { PlusOutlined, EyeOutlined, ExperimentOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Grid } from 'antd';
import { authApi } from '../../api/axios';
import { useAppSelector } from '../../store/hooks';

const { useBreakpoint } = Grid;

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default',
  APPROVED: 'success',
  RETIRED: 'default',
};

const STOCK_STATUS_COLOR: Record<string, string> = {
  SUFFICIENT: 'success',
  PARTIAL: 'warning',
  INSUFFICIENT: 'error',
};

const STOCK_STATUS_TAG: Record<string, string> = {
  SUFFICIENT: 'green',
  PARTIAL: 'orange',
  INSUFFICIENT: 'red',
};

export default function BomList() {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { user } = useAppSelector((s) => s.auth);

  const [boms, setBoms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [productCodeSearch, setProductCodeSearch] = useState('');

  const [simulateModalOpen, setSimulateModalOpen] = useState(false);
  const [simulateBomId, setSimulateBomId] = useState<string | null>(null);
  const [simulateBomCode, setSimulateBomCode] = useState('');
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simForm] = Form.useForm();

  const loadBoms = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (productCodeSearch) params.productCode = productCodeSearch;
      if (statusFilter) params.status = statusFilter;
      const res = await authApi.get('/bom', { params });
      setBoms(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load BOMs');
    } finally {
      setLoading(false);
    }
  }, [productCodeSearch, statusFilter]);

  useEffect(() => { loadBoms(); }, [loadBoms]);

  const openSimulate = (bom: any) => {
    setSimulateBomId(bom.id);
    setSimulateBomCode(bom.bom_code);
    setSimResult(null);
    simForm.resetFields();
    setSimulateModalOpen(true);
  };

  const runSimulation = async () => {
    try {
      const values = await simForm.validateFields();
      setSimLoading(true);
      const res = await authApi.post(`/bom/${simulateBomId}/simulate`, {
        targetBatchSize: values.targetBatchSize,
      });
      setSimResult(res.data);
    } catch (err: any) {
      if (!err.errorFields) {
        message.error(err.response?.data?.message || 'Simulation failed');
      }
    } finally {
      setSimLoading(false);
    }
  };

  const simColumns = [
    {
      title: 'Material Code',
      dataIndex: 'material_code',
      key: 'material_code',
      render: (v: string) => <Typography.Text code>{v}</Typography.Text>,
    },
    { title: 'Material Name', dataIndex: 'material_name', key: 'material_name', ellipsis: true },
    {
      title: 'Base Qty',
      dataIndex: 'base_qty',
      key: 'base_qty',
      render: (v: number, r: any) => `${v} ${r.unit}`,
    },
    {
      title: 'Scaled Qty',
      dataIndex: 'scaled_qty',
      key: 'scaled_qty',
      render: (v: number, r: any) => (
        <Typography.Text strong>{v} {r.unit}</Typography.Text>
      ),
    },
    {
      title: 'Available Stock',
      dataIndex: 'available_stock',
      key: 'available_stock',
      render: (v: number, r: any) => `${v} ${r.unit}`,
    },
    {
      title: 'Stock Status',
      dataIndex: 'stock_status',
      key: 'stock_status',
      render: (v: string) => (
        <Tag color={STOCK_STATUS_TAG[v] || 'default'}>{v}</Tag>
      ),
    },
  ];

  const tableColumns = [
    {
      title: 'BOM Code',
      dataIndex: 'bom_code',
      key: 'bom_code',
      render: (v: string) => <Typography.Text code>{v}</Typography.Text>,
    },
    { title: 'Product Name', dataIndex: 'product_name', key: 'product_name', ellipsis: true },
    { title: 'Variant', dataIndex: 'product_variant', key: 'product_variant', ellipsis: true },
    { title: 'Version', dataIndex: 'version', key: 'version', width: 80 },
    {
      title: 'Base Batch Size',
      key: 'base_batch',
      render: (_: any, r: any) => `${r.base_batch_size} ${r.base_unit}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => (
        <Tag color={STATUS_COLOR[v] || 'default'}>{v}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: any) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/bom/${r.id}`)}
          >
            {screens.md ? 'View' : ''}
          </Button>
          <Button
            size="small"
            icon={<ExperimentOutlined />}
            onClick={() => openSimulate(r)}
          >
            {screens.md ? 'Simulate' : ''}
          </Button>
        </Space>
      ),
    },
  ];

  const renderMobileCard = (bom: any) => (
    <Card
      key={bom.id}
      size="small"
      style={{ marginBottom: 12 }}
      title={
        <Space>
          <Typography.Text code>{bom.bom_code}</Typography.Text>
          <Tag color={STATUS_COLOR[bom.status] || 'default'}>{bom.status}</Tag>
        </Space>
      }
      extra={
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/bom/${bom.id}`)} />
          <Button size="small" icon={<ExperimentOutlined />} onClick={() => openSimulate(bom)} />
        </Space>
      }
    >
      <Space direction="vertical" size={2} style={{ width: '100%' }}>
        <Typography.Text strong>{bom.product_name}</Typography.Text>
        {bom.product_variant && (
          <Typography.Text type="secondary">{bom.product_variant}</Typography.Text>
        )}
        <Typography.Text type="secondary">
          v{bom.version} · {bom.base_batch_size} {bom.base_unit}
        </Typography.Text>
      </Space>
    </Card>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Bill of Materials</Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/bom/new')}
        >
          New BOM
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input.Search
              placeholder="Search by product code..."
              allowClear
              value={productCodeSearch}
              onChange={(e) => setProductCodeSearch(e.target.value)}
              onSearch={loadBoms}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Filter by status"
              allowClear
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              options={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'RETIRED', label: 'Retired' },
              ]}
            />
          </Col>
          <Col xs={24} sm={24} md={4}>
            <Button onClick={loadBoms} loading={loading}>Refresh</Button>
          </Col>
        </Row>
      </Card>

      {loading ? (
        <Spin style={{ display: 'block', textAlign: 'center', margin: 80 }} />
      ) : screens.sm ? (
        <Card>
          <Table
            dataSource={boms}
            columns={tableColumns}
            rowKey="id"
            pagination={{ pageSize: 20 }}
            size="middle"
            locale={{ emptyText: 'No BOMs found' }}
          />
        </Card>
      ) : (
        <div>
          {boms.length === 0 ? (
            <Card>
              <Typography.Text type="secondary">No BOMs found</Typography.Text>
            </Card>
          ) : (
            boms.map(renderMobileCard)
          )}
        </div>
      )}

      {/* Simulation Modal */}
      <Modal
        title={`Simulate BOM: ${simulateBomCode}`}
        open={simulateModalOpen}
        onCancel={() => { setSimulateModalOpen(false); setSimResult(null); simForm.resetFields(); }}
        footer={null}
        width={screens.md ? 900 : '100%'}
        style={screens.md ? {} : { top: 0, margin: 0, padding: 0, maxWidth: '100vw' }}
      >
        <Form
          form={simForm}
          layout={screens.md ? 'inline' : 'vertical'}
          style={{ marginBottom: 16, marginTop: 8 }}
        >
          <Form.Item
            name="targetBatchSize"
            label="Target Batch Size"
            rules={[{ required: true, message: 'Please enter a batch size' }, { type: 'number', min: 0.001, message: 'Must be > 0' }]}
          >
            <InputNumber min={0.001} step={1} style={{ width: 200 }} placeholder="e.g. 500" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              icon={<ExperimentOutlined />}
              onClick={runSimulation}
              loading={simLoading}
            >
              Run Simulation
            </Button>
          </Form.Item>
        </Form>

        {simResult && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert
              type="info"
              showIcon
              message={`Scale Factor: ${simResult.scale_factor?.toFixed(4)}`}
              description={`Scaling from base batch size to target. Factor applied to all component quantities.`}
            />

            {simResult.stock_warnings && simResult.stock_warnings.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message="Stock Warnings"
                description={
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {simResult.stock_warnings.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                }
              />
            )}

            {simResult.expiry_warnings && simResult.expiry_warnings.length > 0 && (
              <Alert
                type="error"
                showIcon
                message="Expiry Warnings"
                description={
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {simResult.expiry_warnings.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                }
              />
            )}

            <Table
              dataSource={simResult.scaled_components || []}
              columns={simColumns}
              rowKey="material_code"
              size="small"
              pagination={false}
              scroll={{ x: 600 }}
              rowClassName={(r: any) =>
                r.stock_status === 'INSUFFICIENT' ? 'ant-table-row-danger' : ''
              }
            />
          </Space>
        )}
      </Modal>
    </div>
  );
}
