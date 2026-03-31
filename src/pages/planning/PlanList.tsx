import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Select,
  Space,
  Typography,
  Spin,
  Row,
  Col,
  Grid,
  message,
} from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { authApi } from '../../api/axios';

const { useBreakpoint } = Grid;

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default',
  PENDING_APPROVAL: 'processing',
  APPROVED: 'success',
  IN_PROGRESS: 'blue',
  COMPLETED: 'success',
  CANCELLED: 'red',
};

export default function PlanList() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const navigate = useNavigate();
  const screens = useBreakpoint();

  useEffect(() => {
    const params = statusFilter ? `?status=${statusFilter}` : '';
    setLoading(true);
    authApi
      .get(`/plans${params}`)
      .then((r) => setPlans(Array.isArray(r.data) ? r.data : r.data.plans || []))
      .catch(() => {
        message.error('Failed to load plans');
        setPlans([]);
      })
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const columns = [
    {
      title: 'Plan Code',
      dataIndex: 'plan_code',
      key: 'plan_code',
      render: (v: string, r: any) => (
        <Button type="link" onClick={() => navigate(`/planning/${r.id}`)} style={{ padding: 0 }}>
          {v}
        </Button>
      ),
    },
    { title: 'Plan Name', dataIndex: 'plan_name', key: 'plan_name', ellipsis: true },
    { title: 'Period', dataIndex: 'period', key: 'period', width: 120 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (v: string) => (
        <Tag color={STATUS_COLOR[v] || 'default'}>{(v || '').replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Batches',
      key: 'batches',
      width: 100,
      render: (_: any, r: any) => r.planned_batches?.length ?? r.batch_count ?? 0,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD') : '—'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 90,
      render: (_: any, r: any) => (
        <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/planning/${r.id}`)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Production Plans
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/planning/new')}>
          New Plan
        </Button>
      </div>

      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          placeholder="Filter by Status"
          allowClear
          style={{ width: 180 }}
          onChange={(v) => setStatusFilter(v ?? '')}
          options={[
            'DRAFT',
            'PENDING_APPROVAL',
            'APPROVED',
            'IN_PROGRESS',
            'COMPLETED',
            'CANCELLED',
          ].map((v) => ({
            value: v,
            label: v.replace(/_/g, ' '),
          }))}
        />
      </Space>

      {loading ? (
        <Spin style={{ display: 'block', textAlign: 'center', margin: 60 }} />
      ) : screens.md ? (
        <Card>
          <Table
            dataSource={plans}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 20 }}
            size="middle"
            onRow={(r) => ({ onClick: () => navigate(`/planning/${r.id}`) })}
          />
        </Card>
      ) : (
        <Row gutter={[12, 12]}>
          {plans.map((p) => (
            <Col xs={24} key={p.id}>
              <Card
                size="small"
                extra={
                  <Button size="small" onClick={() => navigate(`/planning/${p.id}`)}>
                    View
                  </Button>
                }
                onClick={() => navigate(`/planning/${p.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <Typography.Text strong>{p.plan_code}</Typography.Text> — {p.plan_name}
                <br />
                <Space size={4} wrap style={{ marginTop: 4 }}>
                  <Tag color={STATUS_COLOR[p.status] || 'default'}>
                    {(p.status || '').replace(/_/g, ' ')}
                  </Tag>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {p.period} | {p.planned_batches?.length ?? p.batch_count ?? 0} batches
                  </Typography.Text>
                </Space>
              </Card>
            </Col>
          ))}
          {plans.length === 0 && (
            <Col xs={24}>
              <Typography.Text type="secondary">No plans found.</Typography.Text>
            </Col>
          )}
        </Row>
      )}
    </div>
  );
}
