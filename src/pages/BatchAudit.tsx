import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Tag, Button, Select, Space, Typography, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { authApi } from '../api/axios';

const EVENT_COLOR: Record<string, string> = {
  BATCH_CREATED: 'blue',
  BATCH_STATE_CHANGED: 'purple',
  STEP_COMPLETED: 'green',
  STEP_SKIPPED: 'default',
  SIGNATURE_ADDED: 'cyan',
  DEVIATION_RAISED: 'red',
  DEVIATION_CLOSED: 'success',
  DEVIATION_STATUS_CHANGED: 'orange',
  USER_LOGIN: 'gray',
};

export default function BatchAudit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string | undefined>(undefined);

  useEffect(() => {
    authApi.get(`/audit-trail/${id}`).then((r) => {
      setLogs(r.data);
      setLoading(false);
    });
  }, [id]);

  const eventTypes = [...new Set(logs.map((l) => l.eventType))];
  const filtered = filterType ? logs.filter((l) => l.eventType === filterType) : logs;

  const columns = [
    { title: '#', key: 'idx', render: (_: any, __: any, i: number) => i + 1, width: 50 },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
      width: 170,
    },
    {
      title: 'Event',
      dataIndex: 'eventType',
      key: 'eventType',
      render: (v: string) => <Tag color={EVENT_COLOR[v] || 'default'}>{v.replace(/_/g, ' ')}</Tag>,
    },
    {
      title: 'Actor',
      key: 'actor',
      render: (_: any, r: any) => (
        <span>
          {r.actor?.name} <Tag>{r.actorRole}</Tag>
        </span>
      ),
    },
    {
      title: 'Before → After',
      key: 'states',
      render: (_: any, r: any) => (
        <Space size={4}>
          {r.beforeState?.state && <Tag>{r.beforeState.state}</Tag>}
          {r.beforeState?.state && r.afterState?.state && '→'}
          {r.afterState?.state && <Tag color="blue">{r.afterState.state}</Tag>}
          {!r.beforeState?.state && !r.afterState?.state && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {JSON.stringify(r.afterState || r.beforeState || {}).slice(0, 60)}
            </Typography.Text>
          )}
        </Space>
      ),
    },
  ];

  if (loading) return <Spin style={{ display: 'block', marginTop: 100, textAlign: 'center' }} />;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/batches/${id}`)}>
          Back to Batch
        </Button>
      </Space>
      <Card
        title={<Typography.Text strong>Audit Trail</Typography.Text>}
        extra={
          <Select
            placeholder="Filter by event type"
            allowClear
            style={{ width: 220 }}
            value={filterType}
            onChange={setFilterType}
          >
            {eventTypes.map((t) => (
              <Select.Option key={t} value={t}>
                {t.replace(/_/g, ' ')}
              </Select.Option>
            ))}
          </Select>
        }
      >
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 50 }}
          size="small"
        />
      </Card>
    </div>
  );
}
