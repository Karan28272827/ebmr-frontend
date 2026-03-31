import React, { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tabs,
  Typography,
  Alert,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/axios';
import { useAppSelector } from '../../store/hooks';
import dayjs from 'dayjs';

const STATUS_COLOR: Record<string, string> = {
  OPEN: 'orange',
  IN_PROGRESS: 'blue',
  EFFECTIVENESS_CHECK: 'purple',
  CLOSED: 'green',
};
const ROLE_LEVEL: Record<string, number> = {
  BATCH_OPERATOR: 1,
  SUPERVISOR: 2,
  LAB_ANALYST: 3,
  QA_REVIEWER: 4,
  QA_MANAGER: 5,
  QUALIFIED_PERSON: 6,
  SYSTEM_ADMIN: 7,
};

export default function CapaDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAppSelector((s: any) => s.auth);
  const [capa, setCapa] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [closeModal, setCloseModal] = useState(false);
  const [updateModal, setUpdateModal] = useState(false);
  const [form] = Form.useForm();
  const [closeForm] = Form.useForm();
  const hasRole = (r: string) => (ROLE_LEVEL[user?.role || ''] || 0) >= (ROLE_LEVEL[r] || 0);

  const load = async () => {
    try {
      const res = await authApi.get(`/capa/${id}`);
      setCapa(res.data);
    } catch {
      message.error('Failed to load CAPA');
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, [id]);

  const handleUpdate = async (vals: any) => {
    try {
      await authApi.patch(`/capa/${id}`, vals);
      message.success('Updated');
      setUpdateModal(false);
      load();
    } catch {
      message.error('Update failed');
    }
  };

  const handleClose = async (vals: any) => {
    try {
      await authApi.post(`/capa/${id}/close`, vals);
      message.success('CAPA closed');
      setCloseModal(false);
      load();
    } catch {
      message.error('Close failed');
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await authApi.patch(`/capa/${id}`, { status });
      message.success('Status updated');
      load();
    } catch {
      message.error('Failed');
    }
  };

  if (loading || !capa) return null;
  const isOverdue =
    capa.due_date && dayjs(capa.due_date).isBefore(dayjs()) && capa.status !== 'CLOSED';

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {capa.capa_code}
        </Typography.Title>
        <Tag color={STATUS_COLOR[capa.status] || 'default'}>{capa.status.replace(/_/g, ' ')}</Tag>
        <Tag
          color={
            capa.priority === 'CRITICAL' ? 'red' : capa.priority === 'HIGH' ? 'volcano' : 'gold'
          }
        >
          {capa.priority}
        </Tag>
      </Space>
      {isOverdue && (
        <Alert message="This CAPA is overdue" type="error" style={{ marginBottom: 12 }} />
      )}
      <Tabs
        items={[
          {
            key: '1',
            label: 'Overview',
            children: (
              <Card>
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="Source">{capa.source}</Descriptions.Item>
                  <Descriptions.Item label="Source Ref">{capa.source_ref}</Descriptions.Item>
                  <Descriptions.Item label="Raised By">{capa.raised_by}</Descriptions.Item>
                  <Descriptions.Item label="Raised At">
                    {dayjs(capa.raised_at).format('DD MMM YYYY')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Due Date" span={2}>
                    {capa.due_date ? dayjs(capa.due_date).format('DD MMM YYYY') : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Description" span={2}>
                    {capa.description}
                  </Descriptions.Item>
                  <Descriptions.Item label="Root Cause" span={2}>
                    {capa.root_cause || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Immediate Action" span={2}>
                    {capa.immediate_action || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Corrective Action" span={2}>
                    {capa.corrective_action || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Preventive Action" span={2}>
                    {capa.preventive_action || '—'}
                  </Descriptions.Item>
                  {capa.effectiveness_check && (
                    <Descriptions.Item label="Effectiveness Check" span={2}>
                      {capa.effectiveness_check}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            ),
          },
          {
            key: '2',
            label: 'Actions',
            children: (
              <Card>
                <Space wrap>
                  {capa.status === 'OPEN' && (
                    <Button type="primary" onClick={() => handleStatusChange('IN_PROGRESS')}>
                      Start Investigation
                    </Button>
                  )}
                  {capa.status === 'IN_PROGRESS' && (
                    <Button onClick={() => setUpdateModal(true)}>Update Actions</Button>
                  )}
                  {capa.status === 'IN_PROGRESS' && (
                    <Button onClick={() => handleStatusChange('EFFECTIVENESS_CHECK')}>
                      Submit for Effectiveness Check
                    </Button>
                  )}
                  {capa.status === 'EFFECTIVENESS_CHECK' && hasRole('QA_MANAGER') && (
                    <Button type="primary" danger onClick={() => setCloseModal(true)}>
                      Close CAPA
                    </Button>
                  )}
                </Space>
              </Card>
            ),
          },
        ]}
      />
      <Modal
        title="Update CAPA Actions"
        open={updateModal}
        onCancel={() => setUpdateModal(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate} initialValues={capa}>
          <Form.Item name="root_cause" label="Root Cause">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="immediate_action" label="Immediate Action">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="corrective_action" label="Corrective Action">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="preventive_action" label="Preventive Action">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Close CAPA"
        open={closeModal}
        onCancel={() => setCloseModal(false)}
        onOk={() => closeForm.submit()}
      >
        <Form form={closeForm} layout="vertical" onFinish={handleClose}>
          <Form.Item
            name="effectiveness_check"
            label="Effectiveness Check Notes"
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
