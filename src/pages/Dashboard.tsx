import React, { useEffect } from 'react';
import { Button, Table, Tag, Space, Typography, Card } from 'antd';
import { PlusOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchBatches } from '../store/batchSlice';

const STATE_COLOR: Record<string, string> = {
  DRAFT: 'default',
  INITIATED: 'blue',
  LINE_CLEARANCE: 'cyan',
  IN_PROGRESS: 'processing',
  DEVIATION: 'error',
  HOLD: 'warning',
  PENDING_QA: 'orange',
  PENDING_QP: 'purple',
  RELEASED: 'success',
  REJECTED: 'red',
};

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, loading } = useAppSelector((s) => s.batches);
  const { user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatch(fetchBatches());
  }, [dispatch]);

  const columns = [
    {
      title: 'Batch #',
      dataIndex: 'batchNumber',
      key: 'batchNumber',
      render: (v: string, r: any) => <a onClick={() => navigate(`/batches/${r.id}`)}>{v}</a>,
    },
    { title: 'Product', dataIndex: 'productName', key: 'productName' },
    { title: 'Size', dataIndex: 'batchSize', key: 'batchSize', render: (v: number) => `${v} kg` },
    {
      title: 'State',
      dataIndex: 'state',
      key: 'state',
      render: (v: string) => <Tag color={STATE_COLOR[v] || 'default'}>{v.replace(/_/g, ' ')}</Tag>,
    },
    {
      title: 'Deviations',
      key: 'dev',
      render: (_: any, r: any) => {
        const open = r.deviations?.filter((d: any) => d.status === 'OPEN').length || 0;
        return open > 0 ? <Tag color="error">{open} OPEN</Tag> : <Tag color="success">None</Tag>;
      },
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/batches/${r.id}`)}>
            View
          </Button>
          <Button size="small" onClick={() => navigate(`/batches/${r.id}/audit`)}>
            Audit Trail
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Batch Records
        </Typography.Title>
        {user?.role !== 'QUALIFIED_PERSON' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/batches/new')}>
            New Batch
          </Button>
        )}
      </div>
      <Card>
        <Table
          dataSource={list}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
}
