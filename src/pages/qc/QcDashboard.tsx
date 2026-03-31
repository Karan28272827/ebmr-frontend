import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Tabs,
  Row,
  Col,
  Statistic,
  Spin,
  Typography,
  message,
} from 'antd';
import {
  ExperimentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { authApi } from '../../api/axios';

const STAGE_COLOR: Record<string, string> = {
  IQC: 'blue',
  LQC: 'cyan',
  OQC: 'green',
};

const TEST_STATUS_COLOR: Record<string, string> = {
  PENDING: 'default',
  IN_PROGRESS: 'processing',
  COMPLETED: 'success',
  FAILED: 'error',
};

export default function QcDashboard() {
  const [dashboard, setDashboard] = useState<any>({});
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [dashRes, testsRes] = await Promise.all([
        authApi.get('/qc/dashboard'),
        authApi.get('/qc/tests'),
      ]);
      setDashboard(dashRes.data);
      setTests(testsRes.data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load QC dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredTests = stageFilter ? tests.filter((t) => t.qc_stage === stageFilter) : tests;

  const columns = [
    {
      title: 'Test Code',
      dataIndex: 'test_code',
      key: 'test_code',
      render: (v: string, r: any) => (
        <Button type="link" onClick={() => navigate(`/qc/tests/${r.id}`)} style={{ padding: 0 }}>
          {v}
        </Button>
      ),
    },
    {
      title: 'Stage',
      dataIndex: 'qc_stage',
      key: 'qc_stage',
      width: 80,
      render: (v: string) => <Tag color={STAGE_COLOR[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (v: string) => (
        <Tag color={TEST_STATUS_COLOR[v] || 'default'}>{v?.replace(/_/g, ' ')}</Tag>
      ),
    },
    { title: 'Batch / Receipt', dataIndex: 'reference', key: 'reference', ellipsis: true },
    {
      title: 'Assigned To',
      dataIndex: 'assigned_to',
      key: 'assigned_to',
      ellipsis: true,
      render: (v: any) => v?.name || v || '—',
    },
    {
      title: 'Initiated At',
      dataIndex: 'initiated_at',
      key: 'initiated_at',
      width: 150,
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_: any, r: any) => (
        <Button size="small" onClick={() => navigate(`/qc/tests/${r.id}`)}>
          View
        </Button>
      ),
    },
  ];

  const tabItems = [
    { key: '', label: 'All' },
    { key: 'IQC', label: 'IQC' },
    { key: 'LQC', label: 'LQC' },
    { key: 'OQC', label: 'OQC' },
  ].map((tab) => ({
    key: tab.key,
    label: tab.label,
    children: (
      <Table
        dataSource={tab.key ? tests.filter((t) => t.qc_stage === tab.key) : tests}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        size="middle"
        onRow={(r) => ({ onClick: () => navigate(`/qc/tests/${r.id}`) })}
        rowClassName={() => 'clickable-row'}
      />
    ),
  }));

  if (loading) {
    return <Spin style={{ display: 'block', textAlign: 'center', margin: 80 }} />;
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          QC Dashboard
        </Typography.Title>
        <Button type="primary" onClick={() => navigate('/qc/tests')}>
          All Tests
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} md={6}>
          <Card>
            <Statistic
              title="IQC Pending"
              value={dashboard.iqc_pending ?? 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card>
            <Statistic
              title="LQC Pending"
              value={dashboard.lqc_pending ?? 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#08979c' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card>
            <Statistic
              title="OQC Pending"
              value={dashboard.oqc_pending ?? 0}
              prefix={<ExperimentOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card>
            <Statistic
              title="Overall Pass Rate"
              value={dashboard.overall_pass_rate ?? 0}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: dashboard.overall_pass_rate >= 90 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs items={tabItems} defaultActiveKey="" />
      </Card>
    </div>
  );
}
