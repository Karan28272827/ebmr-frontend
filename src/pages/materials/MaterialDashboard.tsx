import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Tabs,
  Row,
  Col,
  Statistic,
  Alert,
  Typography,
  Spin,
  message,
} from 'antd';
import {
  InboxOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { authApi } from '../../api/axios';

const QC_STATUS_COLOR: Record<string, string> = {
  PENDING_IQC: 'default',
  IQC_IN_PROGRESS: 'processing',
  IQC_PASSED: 'success',
  IQC_FAILED: 'error',
  IN_STORES: 'success',
};

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: 'error',
  HIGH: 'warning',
  MEDIUM: 'orange',
  LOW: 'default',
};

function expiryColor(expiryDate: string): string {
  const diff = dayjs(expiryDate).diff(dayjs(), 'day');
  if (diff < 30) return '#ff4d4f';
  if (diff < 90) return '#fa8c16';
  return '#52c41a';
}

export default function MaterialDashboard() {
  const [stock, setStock] = useState<any[]>([]);
  const [pendingIqc, setPendingIqc] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [stockRes, receiptsRes, alertsRes] = await Promise.all([
        authApi.get('/materials/stock'),
        authApi.get('/materials/receipts'),
        authApi.get('/materials/expiry-alerts'),
      ]);
      setStock(stockRes.data);
      const allReceipts: any[] = receiptsRes.data;
      setReceipts(allReceipts);
      setPendingIqc(allReceipts.filter((r: any) => r.qc_status === 'PENDING_IQC'));
      setExpiryAlerts(alertsRes.data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load material dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    setAcknowledging(alertId);
    try {
      await authApi.patch(`/materials/expiry-alerts/${alertId}/acknowledge`);
      message.success('Alert acknowledged');
      load();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to acknowledge alert');
    } finally {
      setAcknowledging(null);
    }
  };

  const criticalAlerts = expiryAlerts.filter((a: any) => a.severity === 'CRITICAL');
  const inStoresCount = stock.reduce((sum: number, s: any) => sum + (s.total_qty > 0 ? 1 : 0), 0);

  const stockColumns = [
    {
      title: 'Material Code',
      dataIndex: 'material_code',
      key: 'material_code',
      render: (v: string) => <Typography.Text code>{v}</Typography.Text>,
    },
    { title: 'Material Name', dataIndex: 'material_name', key: 'material_name', ellipsis: true },
    {
      title: 'Total Qty',
      dataIndex: 'total_qty',
      key: 'total_qty',
      render: (v: number, r: any) => `${v} ${r.unit || ''}`,
    },
    { title: 'Unit', dataIndex: 'unit', key: 'unit', width: 70 },
    { title: 'Lots', dataIndex: 'lots_count', key: 'lots_count', width: 70 },
    {
      title: 'Earliest Expiry',
      dataIndex: 'earliest_expiry',
      key: 'earliest_expiry',
      render: (v: string) =>
        v ? (
          <Typography.Text style={{ color: expiryColor(v) }}>
            {dayjs(v).format('YYYY-MM-DD')}
          </Typography.Text>
        ) : (
          '—'
        ),
    },
  ];

  const pendingIqcColumns = [
    {
      title: 'Receipt Code',
      dataIndex: 'receipt_code',
      render: (v: string, r: any) => (
        <Button
          type="link"
          onClick={() => navigate(`/materials/receipts/${r.id}`)}
          style={{ padding: 0 }}
        >
          {v}
        </Button>
      ),
    },
    { title: 'Supplier', dataIndex: 'supplier', ellipsis: true },
    { title: 'Material', dataIndex: 'material_name', ellipsis: true },
    { title: 'Qty', dataIndex: 'quantity', render: (v: number, r: any) => `${v} ${r.unit || ''}` },
    {
      title: 'Received At',
      dataIndex: 'received_at',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD'),
    },
    {
      title: 'Actions',
      render: (_: any, r: any) => (
        <Button size="small" onClick={() => navigate(`/materials/receipts/${r.id}`)}>
          View
        </Button>
      ),
    },
  ];

  const receiptsColumns = [
    {
      title: 'Receipt Code',
      dataIndex: 'receipt_code',
      render: (v: string, r: any) => (
        <Button
          type="link"
          onClick={() => navigate(`/materials/receipts/${r.id}`)}
          style={{ padding: 0 }}
        >
          {v}
        </Button>
      ),
    },
    { title: 'Material', dataIndex: 'material_name', ellipsis: true },
    { title: 'Supplier', dataIndex: 'supplier', ellipsis: true },
    { title: 'Qty', dataIndex: 'quantity', render: (v: number, r: any) => `${v} ${r.unit || ''}` },
    {
      title: 'Received At',
      dataIndex: 'received_at',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD'),
    },
    {
      title: 'Expiry',
      dataIndex: 'expiry_date',
      render: (v: string) =>
        v ? (
          <Typography.Text style={{ color: expiryColor(v) }}>
            {dayjs(v).format('YYYY-MM-DD')}
          </Typography.Text>
        ) : (
          '—'
        ),
    },
    {
      title: 'QC Status',
      dataIndex: 'qc_status',
      render: (v: string) => (
        <Tag color={QC_STATUS_COLOR[v] || 'default'}>{v?.replace(/_/g, ' ')}</Tag>
      ),
    },
  ];

  const alertColumns = [
    { title: 'Material', dataIndex: 'material_name', ellipsis: true },
    { title: 'Material Code', dataIndex: 'material_code' },
    { title: 'Lot', dataIndex: 'lot_number' },
    {
      title: 'Expiry Date',
      dataIndex: 'expiry_date',
      render: (v: string) => (
        <Typography.Text style={{ color: expiryColor(v) }}>
          {dayjs(v).format('YYYY-MM-DD')}
        </Typography.Text>
      ),
    },
    { title: 'Days Left', dataIndex: 'days_to_expiry', render: (v: number) => `${v} days` },
    {
      title: 'Severity',
      dataIndex: 'severity',
      render: (v: string) => <Tag color={SEVERITY_COLOR[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Actions',
      render: (_: any, r: any) =>
        !r.acknowledged_at && (
          <Button
            size="small"
            loading={acknowledging === r.id}
            onClick={() => handleAcknowledge(r.id)}
          >
            Acknowledge
          </Button>
        ),
    },
  ];

  if (loading) {
    return <Spin style={{ display: 'block', textAlign: 'center', margin: 80 }} />;
  }

  const tabItems = [
    {
      key: 'stock',
      label: 'Stock Register',
      children: (
        <Table
          dataSource={stock}
          columns={stockColumns}
          rowKey="id"
          pagination={{ pageSize: 20 }}
          size="middle"
        />
      ),
    },
    {
      key: 'pending_iqc',
      label: `Pending IQC (${pendingIqc.length})`,
      children: (
        <Table
          dataSource={pendingIqc}
          columns={pendingIqcColumns}
          rowKey="id"
          pagination={{ pageSize: 20 }}
          size="middle"
        />
      ),
    },
    {
      key: 'receipts',
      label: 'Receipts',
      children: (
        <Table
          dataSource={receipts}
          columns={receiptsColumns}
          rowKey="id"
          pagination={{ pageSize: 20 }}
          size="middle"
          onRow={(r) => ({
            onClick: () => navigate(`/materials/receipts/${r.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      ),
    },
    {
      key: 'expiry_alerts',
      label: `Expiry Alerts (${expiryAlerts.length})`,
      children: (
        <Table
          dataSource={expiryAlerts}
          columns={alertColumns}
          rowKey="id"
          pagination={{ pageSize: 20 }}
          size="middle"
        />
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
          Material Dashboard
        </Typography.Title>
        <Space wrap>
          <Button onClick={() => navigate('/materials/receipts')}>Receipts</Button>
          <Button onClick={() => navigate('/materials/intent')}>Intents</Button>
          <Button onClick={() => navigate('/materials/po')}>PO Tracker</Button>
        </Space>
      </div>

      {criticalAlerts.length > 0 && (
        <Alert
          type="error"
          showIcon
          message={`${criticalAlerts.length} CRITICAL expiry alert(s) require attention`}
          description={criticalAlerts
            .map(
              (a: any) =>
                `${a.material_name} (${a.material_code}) — expires ${dayjs(a.expiry_date).format('YYYY-MM-DD')}`,
            )
            .join(', ')}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} md={6}>
          <Card>
            <Statistic title="Total Materials" value={stock.length} prefix={<InboxOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card>
            <Statistic
              title="Pending IQC"
              value={pendingIqc.length}
              prefix={<ExperimentOutlined />}
              valueStyle={{ color: pendingIqc.length > 0 ? '#faad14' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card>
            <Statistic
              title="In Stores"
              value={inStoresCount}
              prefix={<InboxOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card>
            <Statistic
              title="Expiry Alerts (Critical)"
              value={criticalAlerts.length}
              prefix={<WarningOutlined />}
              valueStyle={{ color: criticalAlerts.length > 0 ? '#ff4d4f' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs items={tabItems} defaultActiveKey="stock" />
      </Card>
    </div>
  );
}
