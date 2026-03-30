import React, { useEffect, useState } from 'react';
import {
  Steps, Card, Form, Input, Button, Typography, Space, Table, DatePicker, Select,
  InputNumber, message, Tag, Alert, Spin, Modal, Grid, Row, Col,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, ArrowLeftOutlined, WarningOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { authApi } from '../../api/axios';

const { useBreakpoint } = Grid;

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

interface PlannedBatch {
  key: string;
  bom_id: string;
  product_name: string;
  batch_size: number;
  production_line: string;
  planned_start: string;
  planned_end: string;
  priority: string;
}

export default function PlanNew() {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const [currentStep, setCurrentStep] = useState(0);
  const [planForm] = Form.useForm();
  const [batchForm] = Form.useForm();

  const [planId, setPlanId] = useState<string | null>(null);
  const [batches, setBatches] = useState<PlannedBatch[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [bomsLoading, setBomsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [simulationResults, setSimulationResults] = useState<any[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [addBatchVisible, setAddBatchVisible] = useState(false);
  const [addingBatch, setAddingBatch] = useState(false);

  useEffect(() => {
    setBomsLoading(true);
    authApi
      .get('/bom')
      .then((r) => setBoms(Array.isArray(r.data) ? r.data : r.data.boms || []))
      .catch(() => setBoms([]))
      .finally(() => setBomsLoading(false));
  }, []);

  // Step 1: Create plan
  const handleCreatePlan = async () => {
    try {
      const values = await planForm.validateFields();
      setSaving(true);
      const res = await authApi.post('/plans', {
        plan_name: values.plan_name,
        period: values.period,
        description: values.description,
      });
      setPlanId(res.data.id);
      message.success('Plan created');
      setCurrentStep(1);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.message || 'Failed to create plan');
    } finally {
      setSaving(false);
    }
  };

  // Step 2: Add batch
  const handleAddBatch = async () => {
    try {
      const values = await batchForm.validateFields();
      setAddingBatch(true);
      const selectedBom = boms.find((b) => b.id === values.bom_id);
      const payload = {
        bom_id: values.bom_id,
        batch_size: values.batch_size,
        production_line: values.production_line,
        planned_start: values.planned_start.toISOString(),
        planned_end: values.planned_end.toISOString(),
        priority: values.priority,
      };
      const res = await authApi.post(`/plans/${planId}/batches`, payload);
      const newBatch: PlannedBatch = {
        key: res.data.id,
        bom_id: values.bom_id,
        product_name: selectedBom?.product_name || values.bom_id,
        batch_size: values.batch_size,
        production_line: values.production_line,
        planned_start: values.planned_start.toISOString(),
        planned_end: values.planned_end.toISOString(),
        priority: values.priority,
      };
      setBatches((prev) => [...prev, newBatch]);
      batchForm.resetFields();
      setAddBatchVisible(false);
      message.success('Batch added');
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.message || 'Failed to add batch');
    } finally {
      setAddingBatch(false);
    }
  };

  const handleRemoveBatch = async (key: string) => {
    try {
      await authApi.delete(`/plans/${planId}/batches/${key}`);
      setBatches((prev) => prev.filter((b) => b.key !== key));
    } catch {
      setBatches((prev) => prev.filter((b) => b.key !== key));
    }
  };

  // Step 3: Simulate
  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const res = await authApi.post(`/plans/${planId}/simulate`);
      setSimulationResults(Array.isArray(res.data) ? res.data : res.data.results || []);
      setCurrentStep(2);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  // Step 4: Submit for approval
  const handleSubmit = async () => {
    setSaving(true);
    try {
      await authApi.patch(`/plans/${planId}/status`, { status: 'PENDING_APPROVAL' });
      message.success('Plan submitted for approval');
      navigate(`/planning/${planId}`);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to submit plan');
    } finally {
      setSaving(false);
    }
  };

  const hasShortages = simulationResults.some((r) => r.has_shortages);

  const batchColumns = [
    { title: 'Product', dataIndex: 'product_name', key: 'product_name' },
    { title: 'Batch Size', dataIndex: 'batch_size', key: 'batch_size', render: (v: number) => `${v} kg` },
    { title: 'Line', dataIndex: 'production_line', key: 'production_line' },
    {
      title: 'Planned Start',
      dataIndex: 'planned_start',
      key: 'planned_start',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Planned End',
      dataIndex: 'planned_end',
      key: 'planned_end',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (v: string) => {
        const color = v === 'CRITICAL' ? 'red' : v === 'HIGH' ? 'orange' : v === 'MEDIUM' ? 'blue' : 'default';
        return <Tag color={color}>{v}</Tag>;
      },
    },
    {
      title: '',
      key: 'remove',
      width: 60,
      render: (_: any, r: PlannedBatch) => (
        <Button
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveBatch(r.key)}
        />
      ),
    },
  ];

  const simColumns = [
    { title: 'Product', dataIndex: 'product_name', key: 'product_name' },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, r: any) => (
        r.has_shortages
          ? <Tag color="error"><WarningOutlined /> Shortage</Tag>
          : <Tag color="success"><CheckCircleOutlined /> OK</Tag>
      ),
    },
    {
      title: 'Shortages',
      key: 'shortages',
      render: (_: any, r: any) =>
        r.shortages?.length > 0
          ? r.shortages.map((s: any, i: number) => (
              <div key={i} style={{ fontSize: 12 }}>
                <Typography.Text type="danger">{s.material_name}: need {s.required} {s.unit}, have {s.available} {s.unit}</Typography.Text>
              </div>
            ))
          : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'FEFO Recommendations',
      key: 'fefo',
      render: (_: any, r: any) =>
        r.fefo_recommendations?.length > 0
          ? r.fefo_recommendations.map((f: any, i: number) => (
              <div key={i} style={{ fontSize: 12 }}>
                {f.material_name}: use batch {f.receipt_code} (exp {dayjs(f.expiry_date).format('YYYY-MM-DD')})
              </div>
            ))
          : <Typography.Text type="secondary">—</Typography.Text>,
    },
  ];

  const formLayout = screens.md ? 'horizontal' : 'vertical';
  const labelCol = screens.md ? { span: 6 } : undefined;
  const wrapperCol = screens.md ? { span: 16 } : undefined;

  const steps = [
    { title: 'Plan Details' },
    { title: 'Add Batches' },
    { title: 'Simulation' },
    { title: 'Submit' },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/planning/plans')}>
          Back
        </Button>
      </Space>

      <Typography.Title level={4} style={{ marginBottom: 24 }}>
        New Production Plan
      </Typography.Title>

      <Steps
        current={currentStep}
        items={steps}
        style={{ marginBottom: 32 }}
        size={screens.sm ? 'default' : 'small'}
      />

      {/* Step 0: Plan Details */}
      {currentStep === 0 && (
        <Card title="Plan Details">
          <Form
            form={planForm}
            layout={formLayout}
            labelCol={labelCol}
            wrapperCol={wrapperCol}
          >
            <Form.Item
              name="plan_name"
              label="Plan Name"
              rules={[{ required: true, message: 'Plan name is required' }]}
            >
              <Input placeholder="e.g. Q2 2026 Production Plan" size="large" />
            </Form.Item>
            <Form.Item
              name="period"
              label="Period"
              rules={[{ required: true, message: 'Period is required' }]}
            >
              <Input placeholder="e.g. Q1 2026" size="large" />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={3} placeholder="Optional description..." />
            </Form.Item>
            <Form.Item wrapperCol={screens.md ? { offset: 6, span: 16 } : undefined}>
              <Button type="primary" size="large" onClick={handleCreatePlan} loading={saving}>
                Create Plan & Continue
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}

      {/* Step 1: Add Batches */}
      {currentStep === 1 && (
        <Card
          title="Planned Batches"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddBatchVisible(true)}>
              Add Batch
            </Button>
          }
        >
          {batches.length === 0 ? (
            <Typography.Text type="secondary">No batches added yet. Click "Add Batch" to begin.</Typography.Text>
          ) : (
            <Table
              dataSource={batches}
              columns={batchColumns}
              rowKey="key"
              pagination={false}
              size="small"
              scroll={{ x: 700 }}
            />
          )}

          <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button onClick={() => setCurrentStep(0)}>Back</Button>
            <Button
              type="primary"
              onClick={handleSimulate}
              loading={simulating}
              disabled={batches.length === 0}
            >
              Run Simulation
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Simulation Results */}
      {currentStep === 2 && (
        <Card title="Simulation Results">
          {hasShortages && (
            <Alert
              type="warning"
              showIcon
              message="Shortages detected in one or more batches. Review and fix before submitting."
              style={{ marginBottom: 16 }}
            />
          )}
          {simulationResults.length === 0 ? (
            <Typography.Text type="secondary">No simulation data available.</Typography.Text>
          ) : (
            <Table
              dataSource={simulationResults}
              columns={simColumns}
              rowKey={(r, i) => r.batch_id || String(i)}
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
            />
          )}
          <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button onClick={() => setCurrentStep(1)}>Back</Button>
            <Button type="primary" onClick={() => setCurrentStep(3)}>
              Continue to Submit
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Submit */}
      {currentStep === 3 && (
        <Card title="Submit Plan">
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {hasShortages && (
              <Alert
                type="warning"
                showIcon
                message="This plan has material shortages. You can still submit, but shortages must be resolved before initiation."
              />
            )}
            <Typography.Text>
              Plan is ready to be submitted for approval. Once submitted, a QA Manager can approve it.
            </Typography.Text>
            <Row gutter={16}>
              <Col>
                <Typography.Text strong>Batches planned: </Typography.Text>
                <Typography.Text>{batches.length}</Typography.Text>
              </Col>
              <Col>
                <Typography.Text strong>Shortages: </Typography.Text>
                <Typography.Text type={hasShortages ? 'danger' : 'success'}>
                  {hasShortages ? 'Yes' : 'None'}
                </Typography.Text>
              </Col>
            </Row>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button onClick={() => setCurrentStep(2)}>Back</Button>
              <Button
                type="primary"
                size="large"
                onClick={handleSubmit}
                loading={saving}
              >
                Submit for Approval
              </Button>
            </div>
          </Space>
        </Card>
      )}

      {/* Add Batch Modal */}
      <Modal
        title="Add Planned Batch"
        open={addBatchVisible}
        onCancel={() => { setAddBatchVisible(false); batchForm.resetFields(); }}
        onOk={handleAddBatch}
        okText="Add Batch"
        confirmLoading={addingBatch}
        style={!screens.sm ? { top: 0 } : undefined}
        width={screens.sm ? 560 : '100%'}
        destroyOnClose
      >
        <Form form={batchForm} layout="vertical">
          <Form.Item
            name="bom_id"
            label="Bill of Materials (Product)"
            rules={[{ required: true, message: 'Select a BOM' }]}
          >
            <Select
              placeholder="Select BOM"
              loading={bomsLoading}
              size="large"
              showSearch
              optionFilterProp="label"
              options={boms.map((b) => ({
                value: b.id,
                label: `${b.bom_code} — ${b.product_name}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="batch_size"
            label="Batch Size (kg)"
            rules={[{ required: true, message: 'Enter batch size' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} size="large" placeholder="e.g. 500" />
          </Form.Item>
          <Form.Item
            name="production_line"
            label="Production Line"
            rules={[{ required: true, message: 'Enter production line' }]}
          >
            <Input placeholder="e.g. Line A" size="large" />
          </Form.Item>
          <Form.Item
            name="planned_start"
            label="Planned Start"
            rules={[{ required: true, message: 'Select planned start date' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} size="large" />
          </Form.Item>
          <Form.Item
            name="planned_end"
            label="Planned End"
            rules={[{ required: true, message: 'Select planned end date' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} size="large" />
          </Form.Item>
          <Form.Item
            name="priority"
            label="Priority"
            initialValue="MEDIUM"
          >
            <Select
              size="large"
              options={PRIORITIES.map((p) => ({ value: p, label: p }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
