import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Space, Select, Input, Tabs, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { authApi } from '../../api/axios';

const STAGE_COLOR: Record<string, string> = { IQC: 'blue', LQC: 'cyan', OQC: 'green' };
const STATUS_COLOR: Record<string, string> = {
  PENDING: 'default',
  IN_PROGRESS: 'processing',
  COMPLETED: 'success',
  FAILED: 'error',
};

export default function QcTestsList() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await authApi.get(`/qc/tests?${params}`);
      setTests(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load QC tests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const filterBySearch = (list: any[]) =>
    list.filter(
      (t) =>
        !search ||
        t.test_code?.toLowerCase().includes(search.toLowerCase()) ||
        t.reference?.toLowerCase().includes(search.toLowerCase()),
    );

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
      width: 140,
      render: (v: string) => (
        <Tag color={STATUS_COLOR[v] || 'default'}>{v?.replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Batch / Receipt',
      dataIndex: 'reference',
      key: 'reference',
      ellipsis: true,
    },
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

  const makeTabContent = (stageFilter: string) => {
    const data = stageFilter
      ? filterBySearch(tests.filter((t) => t.qc_stage === stageFilter))
      : filterBySearch(tests);
    return (
      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
        size="middle"
        onRow={(r) => ({
          onClick: () => navigate(`/qc/tests/${r.id}`),
          style: { cursor: 'pointer' },
        })}
      />
    );
  };

  const tabItems = [
    { key: '', label: 'All', children: makeTabContent('') },
    { key: 'IQC', label: 'IQC', children: makeTabContent('IQC') },
    { key: 'LQC', label: 'LQC', children: makeTabContent('LQC') },
    { key: 'OQC', label: 'OQC', children: makeTabContent('OQC') },
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
          QC Tests
        </Typography.Title>
        <Button onClick={() => navigate('/qc')}>Dashboard</Button>
      </div>

      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Search by test code or reference..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260 }}
          allowClear
        />
        <Select
          placeholder="Filter by Status"
          allowClear
          style={{ width: 160 }}
          onChange={(v) => setStatusFilter(v ?? '')}
          options={['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'].map((v) => ({
            value: v,
            label: v.replace(/_/g, ' '),
          }))}
        />
      </Space>

      <Card>
        <Tabs items={tabItems} defaultActiveKey="" />
      </Card>
    </div>
  );
}
