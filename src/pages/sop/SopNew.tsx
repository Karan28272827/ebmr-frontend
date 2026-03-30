import React, { useState } from 'react';
import { Card, Form, Input, Select, Button, Space, Typography, DatePicker, message } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/axios';

const PRODUCT_CATEGORIES = ['CAPSULE', 'TABLET', 'SYRUP', 'INJECTABLE'];

export default function SopNew() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = {
        ...values,
        effective_date: values.effective_date?.toISOString(),
        review_date: values.review_date?.toISOString(),
      };
      const res = await authApi.post('/sop', payload);
      message.success('SOP created successfully');
      navigate(`/sop/${res.data.id}`);
    } catch (err: any) {
      if (!err.errorFields) {
        message.error(err.response?.data?.message || 'Failed to create SOP');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/sop')}>
          Back
        </Button>
      </Space>

      <Card
        title={
          <Typography.Title level={4} style={{ margin: 0 }}>
            New SOP
          </Typography.Title>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ version: 'v1.0' }}
          style={{ maxWidth: 640 }}
        >
          <Form.Item
            name="sop_code"
            label="SOP Code"
            rules={[{ required: true, message: 'SOP code is required' }]}
            extra="e.g. SOP-MFG-001 (leave blank to auto-generate)"
          >
            <Input placeholder="SOP-XXX-001" style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Title is required' }]}
          >
            <Input placeholder="Standard Operating Procedure for..." />
          </Form.Item>

          <Form.Item
            name="version"
            label="Version"
            rules={[{ required: true, message: 'Version is required' }]}
          >
            <Input placeholder="v1.0" />
          </Form.Item>

          <Form.Item
            name="product_category"
            label="Product Category"
            rules={[{ required: true, message: 'Product category is required' }]}
          >
            <Select placeholder="Select product category">
              {PRODUCT_CATEGORIES.map((cat) => (
                <Select.Option key={cat} value={cat}>
                  {cat}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="effective_date" label="Effective Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="review_date" label="Review Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSubmit}
                loading={saving}
              >
                Create SOP
              </Button>
              <Button onClick={() => navigate('/sop')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
