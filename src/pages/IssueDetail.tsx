import React, { useEffect, useState } from 'react';
import {
  Card,
  Tag,
  Button,
  Space,
  Typography,
  Descriptions,
  Alert,
  Input,
  Select,
  message,
  Spin,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { authApi } from '../api/axios';
import { useAppSelector } from '../store/hooks';

const SEVERITY_COLOR: Record<string, string> = {
  LOW: 'default',
  MEDIUM: 'blue',
  HIGH: 'orange',
  CRITICAL: 'red',
};
const STATUS_COLOR: Record<string, string> = {
  OPEN: 'error',
  IN_PROGRESS: 'processing',
  RESOLVED: 'success',
  CLOSED: 'default',
};
const ROLE_LEVEL: Record<string, number> = {
  BATCH_OPERATOR: 1,
  SUPERVISOR: 2,
  QA_REVIEWER: 3,
  QA_MANAGER: 4,
  QUALIFIED_PERSON: 5,
};

export default function IssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const [issue, setIssue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resolution, setResolution] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    try {
      const res = await authApi.get(`/issues/${id}`);
      setIssue(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const isSupervisor = (ROLE_LEVEL[user?.role || ''] || 0) >= ROLE_LEVEL.SUPERVISOR;
  const isQA = (ROLE_LEVEL[user?.role || ''] || 0) >= ROLE_LEVEL.QA_REVIEWER;

  const updateStatus = async (status: string) => {
    setActionLoading(true);
    try {
      await authApi.put(`/issues/${id}/status`, { status });
      message.success(`Status updated to ${status}`);
      load();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!resolution.trim()) {
      message.warning('Enter resolution notes');
      return;
    }
    setActionLoading(true);
    try {
      await authApi.put(`/issues/${id}/resolve`, { resolution });
      message.success('Issue resolved');
      setResolution('');
      load();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    setActionLoading(true);
    try {
      await authApi.put(`/issues/${id}/close`, {});
      message.success('Issue closed');
      load();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Spin style={{ display: 'block', marginTop: 100, textAlign: 'center' }} />;
  if (!issue) return <Alert message="Issue not found" type="error" />;

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/issues')}
        style={{ marginBottom: 16 }}
      >
        Back to Issues
      </Button>

      <Card
        title={
          <Space>
            <Tag color={SEVERITY_COLOR[issue.severity]}>{issue.severity}</Tag>
            <Typography.Text strong style={{ fontSize: 16 }}>
              {issue.title}
            </Typography.Text>
            <Tag color={STATUS_COLOR[issue.status]}>{issue.status.replace('_', ' ')}</Tag>
          </Space>
        }
        extra={
          <Space>
            {isSupervisor && issue.status === 'OPEN' && (
              <Button loading={actionLoading} onClick={() => updateStatus('IN_PROGRESS')}>
                Mark In Progress
              </Button>
            )}
            {isQA && issue.status !== 'CLOSED' && issue.status !== 'RESOLVED' && (
              <Button danger loading={actionLoading} onClick={() => updateStatus('CLOSED')}>
                Force Close
              </Button>
            )}
            {isQA && issue.status === 'RESOLVED' && (
              <Button type="primary" loading={actionLoading} onClick={handleClose}>
                Close Issue
              </Button>
            )}
          </Space>
        }
      >
        <Descriptions column={2} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Raised By">
            {issue.raiser?.name} ({issue.raiser?.role})
          </Descriptions.Item>
          <Descriptions.Item label="Raised At">
            {dayjs(issue.raisedAt).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          {issue.batch && (
            <Descriptions.Item label="Batch">
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() => navigate(`/batches/${issue.batchId}`)}
              >
                {issue.batch.batchNumber} — {issue.batch.productName}
              </Button>
            </Descriptions.Item>
          )}
          {issue.assignee && (
            <Descriptions.Item label="Assigned To">{issue.assignee?.name}</Descriptions.Item>
          )}
          {issue.resolvedBy && (
            <Descriptions.Item label="Resolved By">{issue.resolver?.name}</Descriptions.Item>
          )}
          {issue.resolvedAt && (
            <Descriptions.Item label="Resolved At">
              {dayjs(issue.resolvedAt).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
          )}
        </Descriptions>

        <Typography.Title level={5}>Description</Typography.Title>
        <Typography.Paragraph>{issue.description}</Typography.Paragraph>

        {issue.resolution && (
          <>
            <Typography.Title level={5}>Resolution</Typography.Title>
            <Alert message={issue.resolution} type="success" showIcon />
          </>
        )}

        {isSupervisor && !['RESOLVED', 'CLOSED'].includes(issue.status) && (
          <Card size="small" title="Resolve Issue" style={{ marginTop: 16 }}>
            <Space.Compact style={{ width: '100%' }} direction="vertical">
              <Input.TextArea
                rows={3}
                placeholder="Describe how the issue was resolved..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              />
              <Button
                type="primary"
                loading={actionLoading}
                onClick={handleResolve}
                style={{ marginTop: 8 }}
              >
                Mark as Resolved
              </Button>
            </Space.Compact>
          </Card>
        )}
      </Card>
    </div>
  );
}
