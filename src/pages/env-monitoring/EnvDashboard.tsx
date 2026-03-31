import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Typography,
  Statistic,
  message,
  Tabs,
} from 'antd';
import { PlusOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { authApi } from '../../api/axios';
import dayjs from 'dayjs';

const READING_COLOR: Record<string, string> = { PASS: 'green', FAIL: 'red', WARNING: 'orange' };

export default function EnvDashboard() {
  const [dashboard, setDashboard] = useState<any>({});
  const [areas, setAreas] = useState<any[]>([]);
  const [readings, setReadings] = useState<any[]>([]);
  const [loadingDash, setLoadingDash] = useState(true);
  const [loadingReadings, setLoadingReadings] = useState(true);
  const [areaModal, setAreaModal] = useState(false);
  const [readingModal, setReadingModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [areaFilter, setAreaFilter] = useState<string | undefined>();
  const [areaForm] = Form.useForm();
  const [readingForm] = Form.useForm();

  const fetchDashboard = async () => {
    setLoadingDash(true);
    try {
      const [dashRes, areasRes] = await Promise.all([
        authApi.get('/env-monitoring/dashboard'),
        authApi.get('/env-monitoring/areas'),
      ]);
      setDashboard(dashRes.data);
      setAreas(areasRes.data);
    } catch {
      message.error('Failed to load environmental monitoring data');
    }
    setLoadingDash(false);
  };

  const fetchReadings = async () => {
    setLoadingReadings(true);
    try {
      const params = new URLSearchParams();
      if (areaFilter) params.set('areaId', areaFilter);
      params.set('days', '30');
      const res = await authApi.get(`/env-monitoring/readings?${params}`);
      setReadings(res.data);
    } catch {
      message.error('Failed to load readings');
    }
    setLoadingReadings(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, []);
  useEffect(() => {
    fetchReadings();
  }, [areaFilter]);

  const handleCreateArea = async (vals: any) => {
    setSubmitting(true);
    try {
      await authApi.post('/env-monitoring/areas', vals);
      message.success('Monitoring area created');
      setAreaModal(false);
      areaForm.resetFields();
      fetchDashboard();
    } catch {
      message.error('Failed to create area');
    }
    setSubmitting(false);
  };

  const handleRecordReading = async (vals: any) => {
    setSubmitting(true);
    try {
      await authApi.post('/env-monitoring/readings', vals);
      message.success('Reading recorded');
      setReadingModal(false);
      readingForm.resetFields();
      fetchReadings();
      fetchDashboard();
    } catch {
      message.error('Failed to record reading');
    }
    setSubmitting(false);
  };

  const areaColumns = [
    { title: 'Area Name', dataIndex: 'area_name', key: 'area_name' },
    { title: 'Room Class', dataIndex: 'room_class', key: 'room_class' },
    { title: 'Location', dataIndex: 'location', key: 'location', ellipsis: true },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
  ];

  const readingColumns = [
    { title: 'Area', key: 'area', render: (_: any, r: any) => r.area?.area_name || '—' },
    { title: 'Type', dataIndex: 'reading_type', key: 'reading_type' },
    { title: 'Value', key: 'value', render: (_: any, r: any) => `${r.value} ${r.unit || ''}` },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      render: (v: string) => <Tag color={READING_COLOR[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Recorded At',
      dataIndex: 'recorded_at',
      key: 'recorded_at',
      render: (v: string) => dayjs(v).format('DD MMM YYYY HH:mm'),
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>
        <EnvironmentOutlined /> Environmental Monitoring
      </Typography.Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        {[
          { label: 'Active Areas', value: dashboard.active_areas || 0, color: '#1677ff' },
          { label: 'Readings (30d)', value: dashboard.readings_30d || 0, color: '#52c41a' },
          { label: 'Failures (30d)', value: dashboard.failures_30d || 0, color: '#ff4d4f' },
          { label: 'Warnings (30d)', value: dashboard.warnings_30d || 0, color: '#fa8c16' },
        ].map((s) => (
          <Col key={s.label} xs={12} sm={6}>
            <Card size="small">
              <Statistic title={s.label} value={s.value} valueStyle={{ color: s.color }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Tabs
        items={[
          {
            key: 'readings',
            label: 'Readings',
            children: (
              <Card>
                <Space style={{ marginBottom: 12 }}>
                  <Select
                    allowClear
                    placeholder="Filter by area"
                    style={{ width: 200 }}
                    onChange={setAreaFilter}
                    options={areas.map((a) => ({ value: a.id, label: a.area_name }))}
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setReadingModal(true)}
                  >
                    Record Reading
                  </Button>
                </Space>
                <Table
                  dataSource={readings}
                  columns={readingColumns}
                  rowKey="id"
                  loading={loadingReadings}
                  size="small"
                />
              </Card>
            ),
          },
          {
            key: 'areas',
            label: 'Monitoring Areas',
            children: (
              <Card
                extra={
                  <Button icon={<PlusOutlined />} size="small" onClick={() => setAreaModal(true)}>
                    Add Area
                  </Button>
                }
              >
                <Table
                  dataSource={areas}
                  columns={areaColumns}
                  rowKey="id"
                  loading={loadingDash}
                  size="small"
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="Add Monitoring Area"
        open={areaModal}
        onCancel={() => setAreaModal(false)}
        onOk={() => areaForm.submit()}
        confirmLoading={submitting}
      >
        <Form form={areaForm} layout="vertical" onFinish={handleCreateArea}>
          <Form.Item name="area_name" label="Area Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="room_class" label="Room Class" rules={[{ required: true }]}>
            <Select
              options={['A', 'B', 'C', 'D'].map((c) => ({ value: c, label: `Class ${c}` }))}
            />
          </Form.Item>
          <Form.Item name="location" label="Location">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Record Environmental Reading"
        open={readingModal}
        onCancel={() => setReadingModal(false)}
        onOk={() => readingForm.submit()}
        confirmLoading={submitting}
      >
        <Form form={readingForm} layout="vertical" onFinish={handleRecordReading}>
          <Form.Item name="area_id" label="Area" rules={[{ required: true }]}>
            <Select options={areas.map((a) => ({ value: a.id, label: a.area_name }))} />
          </Form.Item>
          <Form.Item name="reading_type" label="Reading Type" rules={[{ required: true }]}>
            <Select
              options={[
                'TEMPERATURE',
                'HUMIDITY',
                'PARTICLE_COUNT',
                'PRESSURE_DIFFERENTIAL',
                'MICROBIAL',
              ].map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
            />
          </Form.Item>
          <Space>
            <Form.Item name="value" label="Value" rules={[{ required: true }]}>
              <InputNumber style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="unit" label="Unit">
              <Input style={{ width: 80 }} placeholder="°C / % / CFU" />
            </Form.Item>
          </Space>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
