import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Select, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { authApi } from '../api/axios';

const STATUS_COLOR: Record<string, string> = { OPEN: 'error', UNDER_REVIEW: 'warning', CLOSED: 'success' };

export default function Deviations() {
  const navigate = useNavigate();
  const [deviations, setDeviations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const load = () => {
    const params = statusFilter ? `?status=${statusFilter}` : '';
    authApi.get(`/deviations${params}`).then((r) => { setDeviations(r.data); setLoading(false); });
  };

  useEffect(() => { load(); }, [statusFilter]);

  const columns = [
    { title: 'Batch', key: 'batch', render: (_: any, r: any) => <a onClick={() => navigate(`/batches/${r.batchId}`)}>{r.batch?.batchNumber}</a> },
    { title: 'Product', key: 'product', render: (_: any, r: any) => r.batch?.productName },
    { title: 'Step', dataIndex: 'stepNumber', key: 'stepNumber' },
    { title: 'Field', dataIndex: 'fieldName', key: 'fieldName' },
    { title: 'Actual', dataIndex: 'actualValue', key: 'actualValue' },
    { title: 'Expected', dataIndex: 'expectedRange', key: 'expectedRange' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
    { title: 'Raised At', dataIndex: 'raisedAt', key: 'raisedAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, r: any) => <Button size="small" onClick={() => navigate(`/deviations/${r.id}`)}>View</Button>,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Deviations</Typography.Title>
        <Select placeholder="Filter by status" allowClear style={{ width: 180 }} value={statusFilter} onChange={setStatusFilter}>
          <Select.Option value="OPEN">OPEN</Select.Option>
          <Select.Option value="UNDER_REVIEW">UNDER REVIEW</Select.Option>
          <Select.Option value="CLOSED">CLOSED</Select.Option>
        </Select>
      </div>
      <Card>
        <Table dataSource={deviations} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} />
      </Card>
    </div>
  );
}
