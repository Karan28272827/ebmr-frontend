import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Tag,
  Button,
  Space,
  Typography,
  Tabs,
  Alert,
  Descriptions,
  message,
  Spin,
  Table,
  Form,
  InputNumber,
  Modal,
  Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { Grid } from 'antd';
import { authApi } from '../../api/axios';
import { useAppSelector } from '../../store/hooks';

const { useBreakpoint } = Grid;

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default',
  APPROVED: 'success',
  RETIRED: 'default',
};

const COMPONENT_TYPE_COLOR: Record<string, string> = {
  ACTIVE: 'red',
  EXCIPIENT: 'blue',
  PACKAGING: 'default',
  LUBRICANT: 'gold',
  DISINTEGRANT: 'cyan',
  COATING: 'purple',
};

const STOCK_STATUS_TAG: Record<string, string> = {
  SUFFICIENT: 'green',
  PARTIAL: 'orange',
  INSUFFICIENT: 'red',
};

const ROLE_LEVEL: Record<string, number> = {
  BATCH_OPERATOR: 1,
  SUPERVISOR: 2,
  LAB_ANALYST: 2,
  QA_REVIEWER: 3,
  QA_MANAGER: 4,
  QUALIFIED_PERSON: 5,
  SYSTEM_ADMIN: 6,
};

export default function BomDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { user } = useAppSelector((s) => s.auth);

  const [bom, setBom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simForm] = Form.useForm();

  const userLevel = ROLE_LEVEL[user?.role || ''] || 0;

  const loadBom = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authApi.get(`/bom/${id}`);
      setBom(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load BOM');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadBom();
  }, [loadBom]);

  const changeStatus = async (status: 'APPROVED' | 'RETIRED') => {
    setActionLoading(true);
    try {
      await authApi.patch(`/bom/${id}/status`, { status });
      message.success(`BOM ${status.toLowerCase()}`);
      await loadBom();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const runSimulation = async () => {
    try {
      const values = await simForm.validateFields();
      setSimLoading(true);
      const res = await authApi.post(`/bom/${id}/simulate`, {
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

  if (loading) return <Spin style={{ display: 'block', marginTop: 100, textAlign: 'center' }} />;
  if (!bom) return <Alert message="BOM not found" type="error" />;

  const componentColumns = [
    {
      title: '#',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 50,
    },
    {
      title: 'Material Code',
      dataIndex: 'material_code',
      key: 'material_code',
      render: (v: string) => <Typography.Text code>{v}</Typography.Text>,
    },
    {
      title: 'Material Name',
      dataIndex: 'material_name',
      key: 'material_name',
      ellipsis: true,
    },
    {
      title: 'Type',
      dataIndex: 'component_type',
      key: 'component_type',
      render: (v: string) => <Tag color={COMPONENT_TYPE_COLOR[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Qty / Base Batch',
      key: 'qty',
      render: (_: any, r: any) => `${r.quantity_per_base_batch} ${r.unit}`,
    },
    {
      title: 'Overage %',
      dataIndex: 'overage_pct',
      key: 'overage_pct',
      render: (v: number) => (v != null ? `${v}%` : '—'),
    },
    {
      title: 'Critical',
      dataIndex: 'is_critical',
      key: 'is_critical',
      render: (v: boolean) => (
        <Tag color={v ? 'error' : 'default'}>{v ? 'Critical' : 'Standard'}</Tag>
      ),
    },
  ];

  const stepColumns = [
    {
      title: 'Step',
      dataIndex: 'step_number',
      key: 'step_number',
      width: 60,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Equipment',
      dataIndex: 'equipment_type',
      key: 'equipment_type',
      ellipsis: true,
    },
    {
      title: 'Duration (min)',
      dataIndex: 'duration_min',
      key: 'duration_min',
      render: (v: number) => (v != null ? `${v} min` : '—'),
    },
    {
      title: 'Critical Step',
      dataIndex: 'is_critical_step',
      key: 'is_critical_step',
      render: (v: boolean) => (
        <Tag color={v ? 'error' : 'default'}>{v ? 'Critical' : 'Standard'}</Tag>
      ),
    },
    {
      title: 'QC Parameter Set',
      key: 'qc_params',
      render: (_: any, r: any) => r.qc_parameter_set?.name || '—',
    },
  ];

  const sopColumns = [
    {
      title: 'SOP Code',
      dataIndex: 'sop_code',
      key: 'sop_code',
      render: (v: string) => <Typography.Text code>{v}</Typography.Text>,
    },
    { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: 'Version', dataIndex: 'version', key: 'version', width: 80 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Primary',
      dataIndex: 'is_primary',
      key: 'is_primary',
      render: (v: boolean) => (
        <Tag color={v ? 'blue' : 'default'}>{v ? 'Primary' : 'Supporting'}</Tag>
      ),
    },
  ];

  const simResultColumns = [
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
        <Typography.Text strong>
          {v} {r.unit}
        </Typography.Text>
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
      render: (v: string) => <Tag color={STOCK_STATUS_TAG[v] || 'default'}>{v}</Tag>,
    },
  ];

  const tabItems = [
    {
      key: 'components',
      label: `Components (${(bom.components || []).length})`,
      children: (
        <Table
          dataSource={bom.components || []}
          columns={componentColumns}
          rowKey={(r: any) => r.id || r.material_code}
          size="small"
          pagination={false}
          scroll={{ x: 700 }}
          locale={{ emptyText: 'No components defined' }}
        />
      ),
    },
    {
      key: 'steps',
      label: `Process Steps (${(bom.process_steps || []).length})`,
      children: (
        <Table
          dataSource={bom.process_steps || []}
          columns={stepColumns}
          rowKey={(r: any) => r.id || r.step_number}
          size="small"
          pagination={false}
          scroll={{ x: 600 }}
          locale={{ emptyText: 'No process steps defined' }}
        />
      ),
    },
    {
      key: 'sops',
      label: `Linked SOPs (${(bom.sop_links || []).length})`,
      children: (
        <Table
          dataSource={bom.sop_links || []}
          columns={sopColumns}
          rowKey={(r: any) => r.id || r.sop_code}
          size="small"
          pagination={false}
          locale={{ emptyText: 'No SOPs linked' }}
        />
      ),
    },
    {
      key: 'simulate',
      label: 'Simulate',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Card size="small" title="Batch Simulation">
            <Form
              form={simForm}
              layout={screens.md ? 'inline' : 'vertical'}
              style={{ marginBottom: 8 }}
            >
              <Form.Item
                name="targetBatchSize"
                label="Target Batch Size"
                rules={[
                  { required: true, message: 'Enter a batch size' },
                  { type: 'number', min: 0.001, message: 'Must be > 0' },
                ]}
                extra={`Base batch size: ${bom.base_batch_size} ${bom.base_unit}`}
              >
                <InputNumber
                  min={0.001}
                  step={1}
                  style={{ width: 200 }}
                  placeholder={`e.g. ${bom.base_batch_size}`}
                />
              </Form.Item>
              <Form.Item style={screens.md ? { marginTop: 22 } : {}}>
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
          </Card>

          {simResult && (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Alert
                type="info"
                showIcon
                message={`Scale Factor: ${simResult.scale_factor?.toFixed(4)}`}
                description="All component quantities have been scaled by this factor relative to the base batch."
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
                columns={simResultColumns}
                rowKey="material_code"
                size="small"
                pagination={false}
                scroll={{ x: 700 }}
              />
            </Space>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/bom')}>
          Back to BOMs
        </Button>
      </Space>

      <Card
        style={{ marginBottom: 16 }}
        title={
          <Space wrap>
            <Typography.Text strong style={{ fontSize: 16 }}>
              {bom.bom_code}
            </Typography.Text>
            <Tag color={STATUS_COLOR[bom.status] || 'default'}>{bom.status}</Tag>
          </Space>
        }
        extra={
          <Space wrap>
            {/* Approve: QUALIFIED_PERSON only, only when DRAFT */}
            {bom.status === 'DRAFT' && userLevel >= ROLE_LEVEL.QUALIFIED_PERSON && (
              <Popconfirm
                title="Approve this BOM?"
                description="Once approved, it can be used for batch production."
                onConfirm={() => changeStatus('APPROVED')}
                okText="Approve"
              >
                <Button type="primary" icon={<CheckCircleOutlined />} loading={actionLoading}>
                  Approve
                </Button>
              </Popconfirm>
            )}
            {/* Retire: QA_MANAGER+, only when APPROVED */}
            {bom.status === 'APPROVED' && userLevel >= ROLE_LEVEL.QA_MANAGER && (
              <Popconfirm
                title="Retire this BOM?"
                description="This BOM will no longer be available for new batches."
                onConfirm={() => changeStatus('RETIRED')}
                okText="Retire"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<StopOutlined />} loading={actionLoading}>
                  Retire
                </Button>
              </Popconfirm>
            )}
          </Space>
        }
      >
        <Descriptions column={screens.md ? 3 : 1} size="small">
          <Descriptions.Item label="Product Name">{bom.product_name}</Descriptions.Item>
          <Descriptions.Item label="Variant">{bom.product_variant || '—'}</Descriptions.Item>
          <Descriptions.Item label="Version">v{bom.version}</Descriptions.Item>
          <Descriptions.Item label="Base Batch Size">
            {bom.base_batch_size} {bom.base_unit}
          </Descriptions.Item>
          <Descriptions.Item label="Product Code">{bom.product_code || '—'}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={STATUS_COLOR[bom.status] || 'default'}>{bom.status}</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Tabs items={tabItems} defaultActiveKey="components" />
    </div>
  );
}
