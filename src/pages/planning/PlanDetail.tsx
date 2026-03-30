import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Button, Typography, Space, Spin, message, Modal, Form,
  Input, Select, Descriptions, Badge, Grid, Row, Col, Alert,
} from 'antd';
import {
  ArrowLeftOutlined, CheckCircleOutlined, PlayCircleOutlined, WarningOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { authApi } from '../../api/axios';
import { useAppSelector } from '../../store/hooks';

const { useBreakpoint } = Grid;

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default',
  PENDING_APPROVAL: 'processing',
  APPROVED: 'success',
  IN_PROGRESS: 'blue',
  COMPLETED: 'success',
  CANCELLED: 'red',
};

const BATCH_STATUS_COLOR: Record<string, string> = {
  PLANNED: 'default',
  INITIATED: 'blue',
  IN_PROGRESS: 'processing',
  COMPLETED: 'success',
  CANCELLED: 'red',
};

const ROLE_LEVEL: Record<string, number> = {
  BATCH_OPERATOR: 1,
  SUPERVISOR: 2,
  QA_REVIEWER: 3,
  QA_MANAGER: 4,
  QUALIFIED_PERSON: 5,
  SYSTEM_ADMIN: 6,
};

export default function PlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { user } = useAppSelector((s) => s.auth);

  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  // Initiate batch modal
  const [initiateVisible, setInitiateVisible] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [initiateForm] = Form.useForm();
  const [initiating, setInitiating] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  const roleLevel = ROLE_LEVEL[user?.role || ''] || 0;
  const isQaManager = roleLevel >= ROLE_LEVEL.QA_MANAGER;
  const isSupervisor = roleLevel >= ROLE_LEVEL.SUPERVISOR;

  const load = async () => {
    setLoading(true);
    try {
      const res = await authApi.get(`/plans/${id}`);
      setPlan(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (initiateVisible) {
      authApi.get('/batch-templates')
        .then((r) => setTemplates(Array.isArray(r.data) ? r.data : []))
        .catch(() => setTemplates([]));
    }
  }, [initiateVisible]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await authApi.patch(`/plans/${id}/status`, { status: 'APPROVED' });
      message.success('Plan approved');
      load();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to approve plan');
    } finally {
      setApproving(false);
    }
  };

  const openInitiateModal = (batch: any) => {
    setSelectedBatch(batch);
    initiateForm.resetFields();
    setInitiateVisible(true);
  };

  const handleInitiate = async () => {
    try {
      const values = await initiateForm.validateFields();
      setInitiating(true);
      const res = await authApi.post(`/plans/${id}/batches/${selectedBatch.id}/initiate`, {
        batchNumber: values.batchNumber,
        templateId: values.templateId,
      });
      message.success('Batch initiated successfully');
      setInitiateVisible(false);
      const newBatchId = res.data?.batchId || res.data?.id;
      if (newBatchId) {
        navigate(`/batches/${newBatchId}`);
      } else {
        load();
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.message || 'Failed to initiate batch');
    } finally {
      setInitiating(false);
    }
  };

  const expandedRowRender = (record: any) => {
    const sim = record.simulation_result;
    if (!sim) return <Typography.Text type="secondary">No simulation data available.</Typography.Text>;

    return (
      <div style={{ padding: '8px 0' }}>
        <Typography.Text strong style={{ marginBottom: 8, display: 'block' }}>
          Simulation Details
        </Typography.Text>
        {sim.material_checks?.length > 0 ? (
          <Table
            dataSource={sim.material_checks}
            rowKey={(r, i) => r.material_id || String(i)}
            pagination={false}
            size="small"
            columns={[
              { title: 'Material', dataIndex: 'material_name', key: 'material_name' },
              { title: 'Required', dataIndex: 'required_qty', key: 'required_qty', render: (v: any, r: any) => `${v} ${r.unit}` },
              { title: 'Available', dataIndex: 'available_qty', key: 'available_qty', render: (v: any, r: any) => `${v} ${r.unit}` },
              {
                title: 'Status',
                key: 'check_status',
                render: (_: any, r: any) => (
                  r.available_qty >= r.required_qty
                    ? <Tag color="success">OK</Tag>
                    : <Tag color="error">Shortage: {r.required_qty - r.available_qty} {r.unit}</Tag>
                ),
              },
              {
                title: 'FEFO Batch',
                dataIndex: 'fefo_receipt_code',
                key: 'fefo_receipt_code',
                render: (v: string) => v || '—',
              },
            ]}
          />
        ) : (
          <Typography.Text type="secondary">No material checks recorded.</Typography.Text>
        )}
      </div>
    );
  };

  const batchColumns = [
    { title: '#', key: 'index', width: 50, render: (_: any, __: any, i: number) => i + 1 },
    { title: 'Product', dataIndex: 'product_name', key: 'product_name' },
    { title: 'Batch Size', dataIndex: 'batch_size', key: 'batch_size', render: (v: number) => `${v} kg` },
    { title: 'Production Line', dataIndex: 'production_line', key: 'production_line' },
    {
      title: 'Planned Start',
      dataIndex: 'planned_start',
      key: 'planned_start',
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—'),
    },
    {
      title: 'Planned End',
      dataIndex: 'planned_end',
      key: 'planned_end',
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={BATCH_STATUS_COLOR[v] || 'default'}>{(v || 'PLANNED').replace(/_/g, ' ')}</Tag>,
    },
    {
      title: 'Simulation',
      key: 'simulation',
      render: (_: any, r: any) => {
        if (!r.simulation_result) return <Tag>Not Run</Tag>;
        return r.simulation_result.has_shortages
          ? <Tag color="error"><WarningOutlined /> Shortage</Tag>
          : <Tag color="success"><CheckCircleOutlined /> OK</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: any) => (
        isSupervisor && plan?.status === 'APPROVED' && r.status !== 'INITIATED' && r.status !== 'COMPLETED' ? (
          <Button
            size="small"
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => openInitiateModal(r)}
          >
            Initiate Batch
          </Button>
        ) : null
      ),
    },
  ];

  if (loading) {
    return <Spin style={{ display: 'block', textAlign: 'center', margin: 80 }} />;
  }
  if (!plan) return null;

  const plannedBatches = plan.planned_batches || [];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/planning/plans')}>
          Back
        </Button>
      </Space>

      <Card
        style={{ marginBottom: 16 }}
        title={
          <Space wrap>
            <Typography.Text strong style={{ fontSize: 16 }}>{plan.plan_code}</Typography.Text>
            <Typography.Text>{plan.plan_name}</Typography.Text>
            <Tag>{plan.period}</Tag>
            <Tag color={STATUS_COLOR[plan.status] || 'default'}>{(plan.status || '').replace(/_/g, ' ')}</Tag>
          </Space>
        }
        extra={
          <Space wrap>
            {plan.status === 'PENDING_APPROVAL' && isQaManager && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleApprove}
                loading={approving}
                size={screens.sm ? 'middle' : 'large'}
              >
                Approve
              </Button>
            )}
          </Space>
        }
      >
        <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="Period">{plan.period}</Descriptions.Item>
          <Descriptions.Item label="Created">
            {plan.created_at ? dayjs(plan.created_at).format('YYYY-MM-DD') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Approved By">{plan.approved_by?.name || '—'}</Descriptions.Item>
          {plan.description && (
            <Descriptions.Item label="Description" span={3}>{plan.description}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title="Planned Batches">
        {plannedBatches.length === 0 ? (
          <Typography.Text type="secondary">No batches in this plan.</Typography.Text>
        ) : (
          <Table
            dataSource={plannedBatches}
            columns={batchColumns}
            rowKey="id"
            pagination={false}
            size="middle"
            scroll={{ x: 900 }}
            expandable={{
              expandedRowRender,
              rowExpandable: (r) => !!r.simulation_result,
            }}
          />
        )}
      </Card>

      {/* Initiate Batch Modal */}
      <Modal
        title={`Initiate Batch — ${selectedBatch?.product_name || ''}`}
        open={initiateVisible}
        onCancel={() => { setInitiateVisible(false); setSelectedBatch(null); }}
        onOk={handleInitiate}
        okText="Initiate Batch"
        confirmLoading={initiating}
        style={!screens.sm ? { top: 0 } : undefined}
        width={screens.sm ? 480 : '100%'}
        destroyOnClose
      >
        <Alert
          type="info"
          message="Initiating a batch will create a new Batch Record in Draft state."
          style={{ marginBottom: 16 }}
          showIcon
        />
        <Form form={initiateForm} layout="vertical">
          <Form.Item
            name="batchNumber"
            label="Batch Number"
            rules={[{ required: true, message: 'Enter batch number' }]}
          >
            <Input placeholder="e.g. BN-2026-001" size="large" />
          </Form.Item>
          <Form.Item name="templateId" label="Batch Template (optional)">
            <Select
              placeholder="Select template"
              allowClear
              size="large"
              options={templates.map((t) => ({ value: t.id, label: `${t.template_code} — ${t.name}` }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
