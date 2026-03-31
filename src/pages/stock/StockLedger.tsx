import React, { useEffect, useState } from 'react';
import { Table, Card, Tag, Input, Space, Typography, message } from 'antd';
import { authApi } from '../../api/axios';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const MT_COLOR: Record<string, string> = { RECEIPT: 'green', ISSUANCE: 'orange', ADJUSTMENT: 'blue', RETURN: 'cyan', EXPIRY_WRITE_OFF: 'red' };

export default function StockLedger() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = async (code?: string) => {
    setLoading(true);
    try {
      const params = code ? `?materialCode=${code}` : '';
      const res = await authApi.get(`/stock/ledger${params}`);
      setData(res.data);
    } catch { message.error('Failed to load ledger'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const columns = [
    { title: 'Date', dataIndex: 'recorded_at', key: 'date', render: (v: string) => dayjs(v).format('DD MMM YYYY HH:mm') },
    { title: 'Material Code', dataIndex: 'material_code', key: 'mc' },
    { title: 'Material Name', dataIndex: 'material_name', key: 'mn', ellipsis: true },
    { title: 'Type', dataIndex: 'movement_type', key: 'type', render: (v: string) => <Tag color={MT_COLOR[v] || 'default'}>{v.replace(/_/g,' ')}</Tag> },
    { title: 'Qty', dataIndex: 'quantity', key: 'qty', render: (v: number, r: any) => `${v.toLocaleString()} ${r.unit}` },
    { title: 'Balance After', dataIndex: 'balance_after', key: 'bal', render: (v: number, r: any) => `${v.toLocaleString()} ${r.unit}` },
    { title: 'Reference', dataIndex: 'reference_type', key: 'ref', render: (v: string, r: any) => `${v}: ${r.reference_id.slice(0, 8)}...` },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', ellipsis: true, render: (v: string) => v || '—' },
  ];

  return (
    <div>
      <Typography.Title level={4}>Stock Ledger</Typography.Title>
      <Card>
        <Space style={{ marginBottom: 12 }}>
          <Input.Search placeholder="Filter by material code" style={{ width: 240 }} onSearch={(v) => load(v || undefined)} onChange={e => { if (!e.target.value) load(); }} allowClear />
        </Space>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }} />
      </Card>
    </div>
  );
}
