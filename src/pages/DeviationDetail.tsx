import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Form, Input, Alert, Space, Typography, Spin, Select, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { authApi } from '../api/axios';
import { useAppSelector } from '../store/hooks';

const STATUS_COLOR: Record<string, string> = { OPEN: 'error', UNDER_REVIEW: 'warning', CLOSED: 'success' };
const ROLE_LEVEL: Record<string, number> = {
  BATCH_OPERATOR: 1, SUPERVISOR: 2, QA_REVIEWER: 3, QA_MANAGER: 4, QUALIFIED_PERSON: 5,
};

export default function DeviationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const [deviation, setDeviation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [form] = Form.useForm();

  const canQA = (ROLE_LEVEL[user?.role || ''] || 0) >= ROLE_LEVEL.QA_REVIEWER;

  const load = async () => {
    const res = await authApi.get(`/deviations/${id}`);
    setDeviation(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleClose = async () => {
    const { resolutionNotes } = await form.validateFields();
    setActionLoading(true);
    try {
      await authApi.put(`/deviations/${id}/close`, { resolutionNotes });
      message.success('Deviation closed');
      await load();
      form.resetFields();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to close deviation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    setActionLoading(true);
    try {
      await authApi.put(`/deviations/${id}/status`, { status });
      message.success('Status updated');
      await load();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Spin style={{ display: 'block', marginTop: 100, textAlign: 'center' }} />;
  if (!deviation) return <Alert message="Not found" type="error" />;

  return (
    <div style={{ maxWidth: 720 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/deviations')}>Back</Button>
        <Button onClick={() => navigate(`/batches/${deviation.batchId}`)}>View Batch</Button>
      </Space>

      <Card
        title={
          <Space>
            <Typography.Text strong>Deviation</Typography.Text>
            <Tag color={STATUS_COLOR[deviation.status]}>{deviation.status}</Tag>
          </Space>
        }
        extra={
          canQA && deviation.status !== 'CLOSED' && (
            <Select value={deviation.status} onChange={handleStatusChange} style={{ width: 160 }} loading={actionLoading}>
              <Select.Option value="OPEN">OPEN</Select.Option>
              <Select.Option value="UNDER_REVIEW">UNDER REVIEW</Select.Option>
            </Select>
          )
        }
        style={{ marginBottom: 16 }}
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Batch">{deviation.batch?.batchNumber}</Descriptions.Item>
          <Descriptions.Item label="Product">{deviation.batch?.productName}</Descriptions.Item>
          <Descriptions.Item label="Step Number">{deviation.stepNumber}</Descriptions.Item>
          <Descriptions.Item label="Field">{deviation.fieldName}</Descriptions.Item>
          <Descriptions.Item label="Actual Value">{deviation.actualValue}</Descriptions.Item>
          <Descriptions.Item label="Expected Range">{deviation.expectedRange}</Descriptions.Item>
          <Descriptions.Item label="Raised By">{deviation.raiser?.name} ({deviation.raiser?.role})</Descriptions.Item>
          <Descriptions.Item label="Raised At">{dayjs(deviation.raisedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          {deviation.closedBy && (
            <>
              <Descriptions.Item label="Closed At">{dayjs(deviation.closedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="Resolution">{deviation.resolutionNotes}</Descriptions.Item>
            </>
          )}
        </Descriptions>
      </Card>

      {canQA && deviation.status !== 'CLOSED' && (
        <Card title="Close Deviation">
          <Form form={form} layout="vertical" onFinish={handleClose}>
            <Form.Item name="resolutionNotes" label="Resolution Notes" rules={[{ required: true, message: 'Resolution notes are required' }]}>
              <Input.TextArea rows={4} placeholder="Describe the investigation findings and corrective actions taken..." />
            </Form.Item>
            <Button type="primary" danger htmlType="submit" loading={actionLoading}>
              Close Deviation
            </Button>
          </Form>
        </Card>
      )}
    </div>
  );
}
