import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Tag, Button, Space, Timeline, Typography, Spin, Descriptions,
  Modal, Form, Input, Select, Table, message, Grid, Alert,
} from 'antd';
import { ArrowLeftOutlined, PaperClipOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { authApi } from '../../api/axios';
import { useAppSelector } from '../../store/hooks';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const { Option } = Select;

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default',
  UNDER_REVIEW: 'processing',
  APPROVED: 'success',
  RETIRED: 'default',
};

const DOC_TYPE_COLOR: Record<string, string> = {
  SOP: 'blue',
  WORK_INSTRUCTION: 'cyan',
  TEST_METHOD: 'purple',
  FORM: 'geekblue',
  CHECKLIST: 'green',
  SPECIFICATION: 'volcano',
};

const QA_MANAGER_ROLES = ['QA_MANAGER', 'ADMIN', 'SUPER_ADMIN'];

export default function ProcessFlowDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const user = useAppSelector((state: any) => state.auth.user);

  const [flow, setFlow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [submittingDoc, setSubmittingDoc] = useState(false);
  const [docForm] = Form.useForm();

  const isQaManager = QA_MANAGER_ROLES.includes(user?.role || '');

  const load = async () => {
    setLoading(true);
    try {
      const res = await authApi.get(`/process-flow/${id}`);
      setFlow(res.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        message.error('Process flow not found');
        navigate('/docs');
      } else {
        message.error(err.response?.data?.message || 'Failed to load process flow');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await authApi.patch(`/process-flow/${id}/status`, { status: 'APPROVED' });
      message.success('Process flow approved');
      load();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to approve');
    } finally {
      setApproving(false);
    }
  };

  const handleAttachDocument = async (values: any) => {
    setSubmittingDoc(true);
    try {
      await authApi.post(`/process-flow/${id}/documents`, values);
      message.success('Document attached');
      setDocModalOpen(false);
      load();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to attach document');
    } finally {
      setSubmittingDoc(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!flow) return null;

  const metrics = flow.baseline_metrics || {};
  const hasMetrics = metrics.expected_yield_pct != null || metrics.avg_cycle_time_hrs != null || metrics.target_defect_rate != null;
  const stages: any[] = flow.stages || [];
  const documents: any[] = flow.documents || [];

  const docColumns = [
    {
      title: 'Type',
      dataIndex: 'doc_type',
      key: 'doc_type',
      render: (t: string) => <Tag color={DOC_TYPE_COLOR[t] || 'default'}>{t?.replace(/_/g, ' ')}</Tag>,
    },
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { title: 'Version', dataIndex: 'version', key: 'version' },
    {
      title: 'Uploaded At',
      dataIndex: 'uploaded_at',
      key: 'uploaded_at',
      render: (d: string) => d ? dayjs(d).format('DD MMM YYYY') : '-',
    },
    {
      title: 'Reference',
      dataIndex: 'file_reference',
      key: 'file_reference',
      render: (ref: string) => ref || '-',
    },
  ];

  return (
    <div style={{ padding: screens.md ? 24 : 12 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/docs')}>
              Back
            </Button>
            <div>
              <Space>
                <Tag color="default">{flow.flow_code}</Tag>
                <Title level={3} style={{ margin: 0 }}>{flow.title}</Title>
                <Tag color={STATUS_COLOR[flow.status] || 'default'}>{flow.status}</Tag>
              </Space>
              <br />
              <Space style={{ marginTop: 4 }}>
                <Text type="secondary">{flow.product_name}</Text>
                <Text type="secondary">·</Text>
                <Text type="secondary">Version: {flow.version}</Text>
              </Space>
            </div>
          </Space>
        </Col>
        <Col>
          {isQaManager && flow.status !== 'APPROVED' && (
            <Button type="primary" loading={approving} onClick={handleApprove}>
              Approve
            </Button>
          )}
        </Col>
      </Row>

      {/* Baseline Metrics */}
      {hasMetrics && (
        <Card title="Baseline Metrics" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            {metrics.expected_yield_pct != null && (
              <Col xs={24} sm={8}>
                <Card size="small" style={{ textAlign: 'center', background: '#f6ffed' }}>
                  <Text type="secondary">Expected Yield</Text>
                  <br />
                  <Text strong style={{ fontSize: 24 }}>{metrics.expected_yield_pct}%</Text>
                </Card>
              </Col>
            )}
            {metrics.avg_cycle_time_hrs != null && (
              <Col xs={24} sm={8}>
                <Card size="small" style={{ textAlign: 'center', background: '#e6f7ff' }}>
                  <Text type="secondary">Avg Cycle Time</Text>
                  <br />
                  <Text strong style={{ fontSize: 24 }}>{metrics.avg_cycle_time_hrs} hrs</Text>
                </Card>
              </Col>
            )}
            {metrics.target_defect_rate != null && (
              <Col xs={24} sm={8}>
                <Card size="small" style={{ textAlign: 'center', background: '#fff7e6' }}>
                  <Text type="secondary">Target Defect Rate</Text>
                  <br />
                  <Text strong style={{ fontSize: 24 }}>{metrics.target_defect_rate}%</Text>
                </Card>
              </Col>
            )}
          </Row>
        </Card>
      )}

      {/* Process Stages */}
      <Card title="Process Stages" style={{ marginBottom: 16 }}>
        {stages.length === 0 ? (
          <Text type="secondary">No stages defined.</Text>
        ) : (
          <Timeline mode="left">
            {stages.map((stage: any) => (
              <Timeline.Item
                key={stage.id || stage.stage_number}
                color={stage.critical ? 'red' : 'blue'}
                label={<Text type="secondary">Stage {stage.stage_number}</Text>}
              >
                <Card
                  size="small"
                  style={{
                    borderLeft: stage.critical ? '3px solid #ff4d4f' : '3px solid #1890ff',
                    marginBottom: 4,
                  }}
                  title={
                    <Space>
                      <Text strong>{stage.stage_name}</Text>
                      {stage.department && <Tag color="blue">{stage.department}</Tag>}
                      {stage.critical && <Tag color="error">CRITICAL</Tag>}
                      {stage.duration_min && (
                        <Tag color="default">{stage.duration_min} min</Tag>
                      )}
                    </Space>
                  }
                >
                  {stage.responsible_role && (
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                      Responsible: <Tag>{stage.responsible_role.replace(/_/g, ' ')}</Tag>
                    </Text>
                  )}

                  {/* Decision point */}
                  {stage.decision_condition && (
                    <Alert
                      type="warning"
                      showIcon
                      style={{ marginBottom: 8 }}
                      message={
                        <Text>
                          <strong>Decision:</strong> {stage.decision_condition}
                          {stage.decision_yes && <> → Yes: <Tag color="success">{stage.decision_yes}</Tag></>}
                          {stage.decision_no && <> | No: <Tag color="error">{stage.decision_no}</Tag></>}
                        </Text>
                      }
                    />
                  )}

                  {/* Inputs → Process → Outputs */}
                  {(stage.inputs?.length > 0 || stage.outputs?.length > 0) && (
                    <Row gutter={8} style={{ marginTop: 8 }}>
                      {stage.inputs?.length > 0 && (
                        <Col xs={24} sm={8}>
                          <Text type="secondary" strong>Inputs</Text>
                          <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
                            {(Array.isArray(stage.inputs) ? stage.inputs : stage.inputs.split(',')).map(
                              (inp: string, i: number) => (
                                <li key={i}><Text style={{ fontSize: 12 }}>{inp.trim()}</Text></li>
                              )
                            )}
                          </ul>
                        </Col>
                      )}
                      {stage.inputs?.length > 0 && stage.outputs?.length > 0 && (
                        <Col xs={0} sm={8} style={{ textAlign: 'center', paddingTop: 20 }}>
                          <Text type="secondary">→ Process →</Text>
                        </Col>
                      )}
                      {stage.outputs?.length > 0 && (
                        <Col xs={24} sm={8}>
                          <Text type="secondary" strong>Outputs</Text>
                          <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
                            {(Array.isArray(stage.outputs) ? stage.outputs : stage.outputs.split(',')).map(
                              (out: string, i: number) => (
                                <li key={i}><Text style={{ fontSize: 12 }}>{out.trim()}</Text></li>
                              )
                            )}
                          </ul>
                        </Col>
                      )}
                    </Row>
                  )}
                </Card>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Card>

      {/* Documents */}
      <Card
        title="Documents"
        extra={
          isQaManager && (
            <Button
              icon={<PlusOutlined />}
              size="small"
              onClick={() => { docForm.resetFields(); setDocModalOpen(true); }}
            >
              Attach Document
            </Button>
          )
        }
      >
        <Table
          dataSource={documents}
          columns={docColumns}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: 'No documents attached.' }}
        />
      </Card>

      {/* Attach Document Modal */}
      <Modal
        title="Attach Document"
        open={docModalOpen}
        onCancel={() => setDocModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={docForm} layout="vertical" onFinish={handleAttachDocument}>
          <Form.Item
            label="Document Type"
            name="doc_type"
            rules={[{ required: true, message: 'Please select document type' }]}
          >
            <Select placeholder="Select type">
              <Option value="SOP">SOP</Option>
              <Option value="WORK_INSTRUCTION">Work Instruction</Option>
              <Option value="TEST_METHOD">Test Method</Option>
              <Option value="FORM">Form</Option>
              <Option value="CHECKLIST">Checklist</Option>
              <Option value="SPECIFICATION">Specification</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="Document title" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="Version"
                name="version"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="e.g. v1.0" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="File Reference" name="file_reference">
                <Input placeholder="File path or URL" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setDocModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submittingDoc} icon={<PaperClipOutlined />}>
                Attach
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
