import React, { useState } from 'react';
import { Card, Steps, Form, InputNumber, Input, Button, Tag, Alert, Space, Typography, Descriptions } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

interface StepWizardProps {
  steps: any[];
  userRole: string;
  onComplete: (stepNumber: number, actualValues: any) => Promise<void>;
  onSkip: (stepNumber: number) => Promise<void>;
  loading?: boolean;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  PENDING: <ClockCircleOutlined style={{ color: '#1677ff' }} />,
  SKIPPED: <MinusCircleOutlined style={{ color: '#d9d9d9' }} />,
};

const ROLE_LEVEL: Record<string, number> = {
  BATCH_OPERATOR: 1, SUPERVISOR: 2, QA_REVIEWER: 3, QA_MANAGER: 4, QUALIFIED_PERSON: 5,
};

export default function StepWizard({ steps, userRole, onComplete, onSkip, loading }: StepWizardProps) {
  const [form] = Form.useForm();
  const [stepError, setStepError] = useState<string | null>(null);

  const activeIdx = steps.findIndex((s) => s.status === 'PENDING');
  const activeStep = steps[activeIdx];

  const canSkip = (ROLE_LEVEL[userRole] || 0) >= ROLE_LEVEL.SUPERVISOR;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setStepError(null);
      await onComplete(activeStep.step_number, values);
      form.resetFields();
    } catch (err: any) {
      if (err?.errorFields) return; // validation error handled by form
      setStepError(err.response?.data?.message || 'Failed to complete step');
    }
  };

  const handleSkip = async () => {
    if (!canSkip) return;
    await onSkip(activeStep.step_number);
  };

  const stepsItems = steps.map((s) => ({
    key: s.step_number,
    title: s.title,
    status: s.status === 'COMPLETED' ? 'finish' : s.status === 'SKIPPED' ? 'wait' : 'process',
    icon: STATUS_ICON[s.status],
  }));

  return (
    <div>
      <Steps current={activeIdx >= 0 ? activeIdx : steps.length} items={stepsItems} style={{ marginBottom: 24 }} />

      {activeStep ? (
        <Card title={`Step ${activeStep.step_number}: ${activeStep.title}`} style={{ marginBottom: 16 }}>
          <Typography.Paragraph type="secondary">{activeStep.instructions}</Typography.Paragraph>
          {stepError && <Alert message={stepError} type="error" showIcon style={{ marginBottom: 16 }} />}
          <Form form={form} layout="vertical">
            {(activeStep.required_fields || []).map((field: any) => (
              <Form.Item
                key={field.name}
                name={field.name}
                label={`${field.label} ${field.unit ? `(${field.unit})` : ''}`}
                rules={[{ required: true, message: `${field.label} is required` }]}
                extra={
                  field.min !== undefined || field.max !== undefined || field.exact_max !== undefined
                    ? `Range: ${field.exact_max !== undefined ? `max ${field.exact_max}` : `${field.min ?? ''}–${field.max ?? ''}`}`
                    : undefined
                }
              >
                <InputNumber style={{ width: '100%' }} step={0.1} />
              </Form.Item>
            ))}
          </Form>
          <Space>
            <Button type="primary" onClick={handleSubmit} loading={loading}>
              Complete Step
            </Button>
            {canSkip && (
              <Button onClick={handleSkip} loading={loading}>
                Skip Step
              </Button>
            )}
          </Space>
        </Card>
      ) : (
        <Card>
          <Alert message="All steps completed" type="success" showIcon />
        </Card>
      )}

      <Typography.Title level={5} style={{ marginTop: 24 }}>Step History</Typography.Title>
      {steps.filter((s) => s.status !== 'PENDING').map((s) => (
        <Card key={s.step_number} size="small" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Typography.Text strong>{s.step_number}. {s.title}</Typography.Text>
              <Tag color={s.status === 'COMPLETED' ? 'success' : 'default'} style={{ marginLeft: 8 }}>{s.status}</Tag>
            </div>
            {s.completed_at && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {s.completed_by_name} · {dayjs(s.completed_at).format('MM-DD HH:mm')}
              </Typography.Text>
            )}
          </div>
          {s.actual_values && Object.keys(s.actual_values).length > 0 && (
            <Descriptions size="small" column={3} style={{ marginTop: 8 }}>
              {Object.entries(s.actual_values).map(([k, v]) => (
                <Descriptions.Item key={k} label={k}>{String(v)}</Descriptions.Item>
              ))}
            </Descriptions>
          )}
        </Card>
      ))}
    </div>
  );
}
