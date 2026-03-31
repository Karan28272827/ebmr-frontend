import React, { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Typography,
  Spin,
  message,
  Popconfirm,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/axios';
import { useAppSelector } from '../../store/hooks';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default',
  APPROVED: 'green',
  SUPERSEDED: 'orange',
};

export default function QcSpecDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector((s: any) => s.auth);
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paramModalOpen, setParamModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [form] = Form.useForm();

  const fetchSpec = async () => {
    setLoading(true);
    try {
      const res = await authApi.get(`/qc-specs/${id}`);
      setSpec(res.data);
    } catch {
      message.error('Failed to load QC specification');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSpec();
  }, [id]);

  const handleAddParameter = async (vals: any) => {
    setSubmitting(true);
    try {
      await authApi.post(`/qc-specs/${id}/parameters`, vals);
      message.success('Parameter added');
      setParamModalOpen(false);
      form.resetFields();
      fetchSpec();
    } catch {
      message.error('Failed to add parameter');
    }
    setSubmitting(false);
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await authApi.post(`/qc-specs/${id}/approve`);
      message.success('QC Specification approved');
      fetchSpec();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Failed to approve');
    }
    setApproving(false);
  };

  const paramColumns = [
    { title: 'Parameter', dataIndex: 'parameter_name', key: 'parameter_name' },
    { title: 'Type', dataIndex: 'test_type', key: 'test_type' },
    { title: 'Min', dataIndex: 'min_value', key: 'min_value', render: (v: any) => v ?? '—' },
    { title: 'Max', dataIndex: 'max_value', key: 'max_value', render: (v: any) => v ?? '—' },
    { title: 'Unit', dataIndex: 'unit', key: 'unit', render: (v: string) => v || '—' },
    {
      title: 'Acceptance',
      dataIndex: 'acceptance_criteria',
      key: 'acceptance_criteria',
      ellipsis: true,
    },
  ];

  if (loading) return <Spin style={{ display: 'block', marginTop: 100 }} />;
  if (!spec) return <div>Specification not found.</div>;

  const canApprove =
    spec.status === 'DRAFT' &&
    user?.role &&
    ['QA_MANAGER', 'QUALIFIED_PERSON', 'SYSTEM_ADMIN'].includes(user.role);

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/qc-specs')}>
          Back
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {spec.spec_code} — {spec.product_name}
        </Typography.Title>
        <Tag color={STATUS_COLOR[spec.status]}>{spec.status}</Tag>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="Product Code">{spec.product_code}</Descriptions.Item>
          <Descriptions.Item label="Version">{spec.version}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={STATUS_COLOR[spec.status]}>{spec.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Approved By">
            {spec.approved_by ? spec.approver?.name || spec.approved_by : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>
            {spec.description || '—'}
          </Descriptions.Item>
        </Descriptions>
        {canApprove && (
          <div style={{ marginTop: 12 }}>
            <Popconfirm
              title="Approve this QC Specification?"
              onConfirm={handleApprove}
              okText="Approve"
            >
              <Button type="primary" icon={<CheckCircleOutlined />} loading={approving}>
                Approve Specification
              </Button>
            </Popconfirm>
          </div>
        )}
      </Card>

      <Card
        title="Test Parameters"
        extra={
          spec.status === 'DRAFT' && (
            <Button icon={<PlusOutlined />} size="small" onClick={() => setParamModalOpen(true)}>
              Add Parameter
            </Button>
          )
        }
      >
        <Table
          dataSource={spec.parameters || []}
          columns={paramColumns}
          rowKey="id"
          size="small"
          pagination={false}
        />
      </Card>

      <Modal
        title="Add Test Parameter"
        open={paramModalOpen}
        onCancel={() => setParamModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical" onFinish={handleAddParameter}>
          <Form.Item name="parameter_name" label="Parameter Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="test_type" label="Test Type" rules={[{ required: true }]}>
            <Select
              options={['PHYSICAL', 'CHEMICAL', 'MICROBIOLOGICAL', 'ORGANOLEPTIC'].map((s) => ({
                value: s,
                label: s,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="acceptance_criteria"
            label="Acceptance Criteria"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Space>
            <Form.Item name="min_value" label="Min Value">
              <InputNumber />
            </Form.Item>
            <Form.Item name="max_value" label="Max Value">
              <InputNumber />
            </Form.Item>
            <Form.Item name="unit" label="Unit">
              <Input style={{ width: 80 }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
