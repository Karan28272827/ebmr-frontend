import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Select, Input, Card, Row, Col, Spin, Typography } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Grid } from 'antd';
import dayjs from 'dayjs';
import { authApi } from '../../api/axios';

const { useBreakpoint } = Grid;

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default',
  UNDER_REVIEW: 'processing',
  APPROVED: 'success',
  RETIRED: 'default',
};

export default function SopList() {
  const [sops, setSops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const screens = useBreakpoint();

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (categoryFilter) params.set('productCategory', categoryFilter);
    setLoading(true);
    authApi
      .get(`/sop?${params}`)
      .then((r) => setSops(r.data))
      .catch(() => setSops([]))
      .finally(() => setLoading(false));
  }, [statusFilter, categoryFilter]);

  const filtered = sops.filter(
    (s) =>
      !search ||
      s.title?.toLowerCase().includes(search.toLowerCase()) ||
      s.sop_code?.toLowerCase().includes(search.toLowerCase()),
  );

  const columns = [
    {
      title: 'SOP Code',
      dataIndex: 'sop_code',
      key: 'sop_code',
      render: (v: string, r: any) => (
        <Button type="link" onClick={() => navigate(`/sop/${r.id}`)} style={{ padding: 0 }}>
          {v}
        </Button>
      ),
    },
    { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: 'Version', dataIndex: 'version', key: 'version', width: 90 },
    { title: 'Category', dataIndex: 'product_category', key: 'product_category', width: 120 },
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
      title: 'Approved At',
      dataIndex: 'approved_at',
      key: 'approved_at',
      width: 150,
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD') : '—'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 90,
      render: (_: any, r: any) => (
        <Button
          icon={<EyeOutlined />}
          size="small"
          onClick={() => navigate(`/sop/${r.id}`)}
        >
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
          SOP Library
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/sop/new')}>
          New SOP
        </Button>
      </div>

      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Search SOPs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 220 }}
          allowClear
        />
        <Select
          placeholder="Filter by Status"
          allowClear
          style={{ width: 160 }}
          onChange={(v) => setStatusFilter(v ?? '')}
          options={['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'RETIRED'].map((v) => ({
            value: v,
            label: v.replace(/_/g, ' '),
          }))}
        />
        <Select
          placeholder="Filter by Category"
          allowClear
          style={{ width: 160 }}
          onChange={(v) => setCategoryFilter(v ?? '')}
          options={['CAPSULE', 'TABLET', 'SYRUP', 'INJECTABLE'].map((v) => ({
            value: v,
            label: v,
          }))}
        />
      </Space>

      {loading ? (
        <Spin style={{ display: 'block', textAlign: 'center', margin: 40 }} />
      ) : screens.md ? (
        <Card>
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 20 }}
            size="middle"
          />
        </Card>
      ) : (
        <Row gutter={[12, 12]}>
          {filtered.map((s) => (
            <Col xs={24} key={s.id}>
              <Card
                size="small"
                extra={
                  <Button size="small" onClick={() => navigate(`/sop/${s.id}`)}>
                    View
                  </Button>
                }
              >
                <b>{s.sop_code}</b> — {s.title}
                <br />
                <Tag color={STATUS_COLOR[s.status] || 'default'}>{s.status?.replace(/_/g, ' ')}</Tag>
                {' '}v{s.version} | {s.product_category}
              </Card>
            </Col>
          ))}
          {filtered.length === 0 && (
            <Col xs={24}>
              <Typography.Text type="secondary">No SOPs found.</Typography.Text>
            </Col>
          )}
        </Row>
      )}
    </div>
  );
}
