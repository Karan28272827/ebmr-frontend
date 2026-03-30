import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Button, Space, Form, Input, InputNumber, Select, Tag, Typography,
  Checkbox, message, Grid,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/axios';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;
const { Option } = Select;

const ROLES = [
  'PRODUCTION_OPERATOR',
  'PRODUCTION_SUPERVISOR',
  'QA_OFFICER',
  'QA_MANAGER',
  'WAREHOUSE_OPERATOR',
  'WAREHOUSE_MANAGER',
  'BATCH_MANAGER',
  'LAB_ANALYST',
  'MAINTENANCE_TECH',
];

interface StageRow {
  key: number;
  stage_name: string;
  department: string;
  responsible_role: string;
  duration_min: number | null;
  critical: boolean;
  inputs: string;
  outputs: string;
}

let stageKeyCounter = 1;

export default function ProcessFlowNew() {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [bomList, setBomList] = useState<any[]>([]);
  const [loadingBom, setLoadingBom] = useState(false);

  useEffect(() => {
    setLoadingBom(true);
    authApi
      .get('/bom')
      .then((r) => setBomList(r.data))
      .catch(() => setBomList([]))
      .finally(() => setLoadingBom(false));
  }, []);

  const addStage = () => {
    const key = stageKeyCounter++;
    setStages((prev) => [
      ...prev,
      {
        key,
        stage_name: '',
        department: '',
        responsible_role: '',
        duration_min: null,
        critical: false,
        inputs: '',
        outputs: '',
      },
    ]);
  };

  const removeStage = (key: number) => {
    setStages((prev) => prev.filter((s) => s.key !== key));
  };

  const updateStage = (key: number, field: keyof StageRow, value: any) => {
    setStages((prev) =>
      prev.map((s) => (s.key === key ? { ...s, [field]: value } : s))
    );
  };

  const handleFinish = async (values: any) => {
    setSubmitting(true);
    try {
      const payload = {
        flow_code: values.flow_code || undefined,
        title: values.title,
        product_code: values.product_code,
        product_name: values.product_name,
        version: values.version || 'v1.0',
        description: values.description,
        bom_id: values.bom_id || undefined,
        baseline_metrics: {
          expected_yield_pct: values.expected_yield_pct ?? undefined,
          avg_cycle_time_hrs: values.avg_cycle_time_hrs ?? undefined,
          target_defect_rate: values.target_defect_rate ?? undefined,
        },
        stages: stages.map((s, idx) => ({
          stage_number: idx + 1,
          stage_name: s.stage_name,
          department: s.department || undefined,
          responsible_role: s.responsible_role || undefined,
          duration_min: s.duration_min ?? undefined,
          critical: s.critical,
          inputs: s.inputs
            ? s.inputs.split(',').map((v: string) => v.trim()).filter(Boolean)
            : [],
          outputs: s.outputs
            ? s.outputs.split(',').map((v: string) => v.trim()).filter(Boolean)
            : [],
        })),
      };
      const res = await authApi.post('/process-flow', payload);
      message.success('Process flow created successfully');
      navigate(`/docs/process-flow/${res.data.id}`);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to create process flow');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: screens.md ? 24 : 12, maxWidth: 900, margin: '0 auto' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>New Process Flow</Title>
        </Col>
        <Col>
          <Button onClick={() => navigate('/docs')}>Cancel</Button>
        </Col>
      </Row>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ version: 'v1.0' }}
      >
        {/* Basic Information */}
        <Card title="Basic Information" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Flow Code (optional — auto-generated if blank)"
                name="flow_code"
              >
                <Input placeholder="e.g. PF-TAB-001 (leave blank to auto-generate)" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Version"
                name="version"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="v1.0" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item
                label="Title"
                name="title"
                rules={[{ required: true, message: 'Title is required' }]}
              >
                <Input placeholder="Process flow title" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Product Code"
                name="product_code"
                rules={[{ required: true, message: 'Product code is required' }]}
              >
                <Input placeholder="e.g. TAB-500MG" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Product Name"
                name="product_name"
                rules={[{ required: true, message: 'Product name is required' }]}
              >
                <Input placeholder="e.g. Paracetamol 500mg Tablet" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item
                label="Description"
                name="description"
                rules={[{ required: true, message: 'Description is required' }]}
              >
                <TextArea rows={3} placeholder="Describe this process flow..." />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Link BOM (optional)" name="bom_id">
                <Select
                  allowClear
                  showSearch
                  placeholder="Select BOM"
                  loading={loadingBom}
                  optionFilterProp="children"
                >
                  {bomList.map((b: any) => (
                    <Option key={b.id} value={b.id}>
                      {b.bom_code} — {b.product_name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Baseline Metrics */}
        <Card title="Baseline Metrics" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={8}>
              <Form.Item label="Expected Yield (%)" name="expected_yield_pct">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  placeholder="e.g. 95"
                  addonAfter="%"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Avg Cycle Time (hours)" name="avg_cycle_time_hrs">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="e.g. 8.5"
                  addonAfter="hrs"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Target Defect Rate (%)" name="target_defect_rate">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  placeholder="e.g. 0.5"
                  addonAfter="%"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Process Stages */}
        <Card
          title="Process Stages"
          style={{ marginBottom: 16 }}
          extra={
            <Button icon={<PlusOutlined />} type="dashed" size="small" onClick={addStage}>
              Add Stage
            </Button>
          }
        >
          {stages.length === 0 && (
            <Text type="secondary">
              No stages added. Click "Add Stage" to define process steps.
            </Text>
          )}

          {stages.map((stage, idx) => (
            <Card
              key={stage.key}
              size="small"
              style={{
                marginBottom: 12,
                borderLeft: stage.critical ? '3px solid #ff4d4f' : '3px solid #1890ff',
              }}
              title={
                <Space>
                  <Text strong>Stage {idx + 1}</Text>
                  {stage.critical && <Tag color="error">CRITICAL</Tag>}
                </Space>
              }
              extra={
                <Button
                  icon={<DeleteOutlined />}
                  size="small"
                  danger
                  type="text"
                  onClick={() => removeStage(stage.key)}
                />
              }
            >
              <Row gutter={[12, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Stage Name" style={{ marginBottom: 8 }}>
                    <Input
                      value={stage.stage_name}
                      placeholder="e.g. Dispensing"
                      onChange={(e) => updateStage(stage.key, 'stage_name', e.target.value)}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Department" style={{ marginBottom: 8 }}>
                    <Input
                      value={stage.department}
                      placeholder="e.g. Production, QA"
                      onChange={(e) => updateStage(stage.key, 'department', e.target.value)}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Responsible Role" style={{ marginBottom: 8 }}>
                    <Select
                      allowClear
                      value={stage.responsible_role || undefined}
                      placeholder="Select role"
                      style={{ width: '100%' }}
                      onChange={(v) => updateStage(stage.key, 'responsible_role', v || '')}
                    >
                      {ROLES.map((r) => (
                        <Option key={r} value={r}>{r.replace(/_/g, ' ')}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={12} sm={6}>
                  <Form.Item label="Duration (min)" style={{ marginBottom: 8 }}>
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      value={stage.duration_min ?? undefined}
                      onChange={(v) => updateStage(stage.key, 'duration_min', v)}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={6} style={{ display: 'flex', alignItems: 'center', paddingTop: 28 }}>
                  <Checkbox
                    checked={stage.critical}
                    onChange={(e) => updateStage(stage.key, 'critical', e.target.checked)}
                  >
                    Critical Step
                  </Checkbox>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Inputs (comma-separated)"
                    style={{ marginBottom: 8 }}
                  >
                    <Input
                      value={stage.inputs}
                      placeholder="e.g. Raw material, Weighing slip"
                      onChange={(e) => updateStage(stage.key, 'inputs', e.target.value)}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Outputs (comma-separated)"
                    style={{ marginBottom: 8 }}
                  >
                    <Input
                      value={stage.outputs}
                      placeholder="e.g. Dispensed material, Dispensing record"
                      onChange={(e) => updateStage(stage.key, 'outputs', e.target.value)}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          ))}

          {stages.length > 0 && (
            <Button icon={<PlusOutlined />} type="dashed" block onClick={addStage}>
              Add Another Stage
            </Button>
          )}
        </Card>

        {/* Submit */}
        <Row justify="end">
          <Col>
            <Space>
              <Button onClick={() => navigate('/docs')}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Create Process Flow
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
