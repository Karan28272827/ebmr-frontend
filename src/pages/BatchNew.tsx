import React, { useEffect, useState } from 'react';
import { Form, Select, InputNumber, Input, Button, Card, Typography, Alert, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/axios';

export default function BatchNew() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authApi.get('/batches/templates').then((r) => setTemplates(r.data));
  }, []);

  const onFinish = async (values: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.post('/batches', values);
      navigate(`/batches/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <Typography.Title level={4}>Create New Batch</Typography.Title>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      <Card>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="templateId" label="Product Template" rules={[{ required: true }]}>
            <Select placeholder="Select product template">
              {templates.map((t) => (
                <Select.Option key={t.id} value={t.id}>
                  {t.productName} ({t.productCode})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="batchNumber" label="Batch Number" rules={[{ required: true }]}>
            <Input placeholder="e.g. BATCH-2024-001" />
          </Form.Item>
          <Form.Item name="batchSize" label="Batch Size (kg)" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Create Batch
            </Button>
            <Button onClick={() => navigate('/dashboard')}>Cancel</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
