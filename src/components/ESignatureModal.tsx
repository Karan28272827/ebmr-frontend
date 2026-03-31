import React, { useState } from 'react';
import { Modal, Form, Input, Select, Alert, Typography } from 'antd';

interface Props {
  open: boolean;
  title: string;
  meanings: string[];
  onConfirm: (signature: { meaning: string; password: string }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ESignatureModal({
  open,
  title,
  meanings,
  onConfirm,
  onCancel,
  loading,
}: Props) {
  const [form] = Form.useForm();
  const [error, setError] = useState<string | null>(null);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setError(null);
      onConfirm(values);
    } catch {
      setError('Please fill in all fields');
    }
  };

  return (
    <Modal
      open={open}
      title={
        <Typography.Text strong style={{ color: '#1677ff' }}>
          E-Signature Required: {title}
        </Typography.Text>
      }
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        setError(null);
        onCancel();
      }}
      okText="Sign & Confirm"
      confirmLoading={loading}
      destroyOnClose
    >
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Your electronic signature is required for this critical action. Please re-enter your
        password to confirm.
      </Typography.Text>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 12 }} />}
      <Form form={form} layout="vertical">
        <Form.Item name="meaning" label="Signature Meaning" rules={[{ required: true }]}>
          <Select placeholder="Select meaning">
            {meanings.map((m) => (
              <Select.Option key={m} value={m}>
                {m}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="password" label="Password" rules={[{ required: true }]}>
          <Input.Password placeholder="Re-enter your password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
