import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Tag, Button, Space, Modal, Form, Input, Table, message, Typography } from 'antd';
import { useParams } from 'react-router-dom';
import { authApi } from '../../api/axios';
import { useAppSelector } from '../../store/hooks';
import dayjs from 'dayjs';

const STATUS_COLOR: Record<string, string> = { ACTIVE: 'green', SUSPENDED: 'orange', DISQUALIFIED: 'red' };
const ROLE_LEVEL: Record<string, number> = { BATCH_OPERATOR: 1, SUPERVISOR: 2, LAB_ANALYST: 3, QA_REVIEWER: 4, QA_MANAGER: 5, QUALIFIED_PERSON: 6, SYSTEM_ADMIN: 7 };

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAppSelector((s: any) => s.auth);
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [suspendModal, setSuspendModal] = useState(false);
  const [form] = Form.useForm();
  const hasRole = (r: string) => (ROLE_LEVEL[user?.role || ''] || 0) >= (ROLE_LEVEL[r] || 0);

  const load = async () => {
    try { const res = await authApi.get(`/vendors/${id}`); setVendor(res.data); } catch { message.error('Failed to load vendor'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const qualify = async () => {
    try { await authApi.post(`/vendors/${id}/qualify`); message.success('Vendor qualified'); load(); } catch { message.error('Failed'); }
  };

  const suspend = async (vals: any) => {
    try { await authApi.post(`/vendors/${id}/suspend`, vals); message.success('Vendor suspended'); setSuspendModal(false); load(); } catch { message.error('Failed'); }
  };

  if (loading || !vendor) return null;

  const poColumns = [
    { title: 'PO Number', dataIndex: 'po_number', key: 'po_number' },
    { title: 'Material', dataIndex: 'material_name', key: 'material_name' },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity' },
    { title: 'Value', dataIndex: 'total_value', key: 'total_value', render: (v: number, r: any) => `${r.currency} ${v.toLocaleString()}` },
    { title: 'Status', dataIndex: 'status', key: 'status' },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{vendor.name}</Typography.Title>
        <Tag color={STATUS_COLOR[vendor.status] || 'default'}>{vendor.status}</Tag>
      </Space>
      {hasRole('QA_MANAGER') && (
        <Space style={{ marginBottom: 16 }}>
          {vendor.status !== 'ACTIVE' && <Button type="primary" onClick={qualify}>Qualify Vendor</Button>}
          {vendor.status === 'ACTIVE' && <Button danger onClick={() => setSuspendModal(true)}>Suspend</Button>}
        </Space>
      )}
      <Card title="Details" style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Vendor Code">{vendor.vendor_code}</Descriptions.Item>
          <Descriptions.Item label="Country">{vendor.country}</Descriptions.Item>
          <Descriptions.Item label="Contact">{vendor.contact_name || '—'}</Descriptions.Item>
          <Descriptions.Item label="Email">{vendor.contact_email || '—'}</Descriptions.Item>
          <Descriptions.Item label="Phone">{vendor.contact_phone || '—'}</Descriptions.Item>
          <Descriptions.Item label="Qualification Date">{vendor.qualification_date ? dayjs(vendor.qualification_date).format('DD MMM YYYY') : '—'}</Descriptions.Item>
          <Descriptions.Item label="Next Audit">{vendor.next_audit_date ? dayjs(vendor.next_audit_date).format('DD MMM YYYY') : '—'}</Descriptions.Item>
          <Descriptions.Item label="Materials">{(vendor.materials_supplied || []).map((m: string) => <Tag key={m}>{m}</Tag>)}</Descriptions.Item>
          <Descriptions.Item label="Address" span={2}>{vendor.address || '—'}</Descriptions.Item>
          {vendor.notes && <Descriptions.Item label="Notes" span={2}>{vendor.notes}</Descriptions.Item>}
        </Descriptions>
      </Card>
      <Card title="Recent Purchase Orders">
        <Table dataSource={vendor.purchase_orders || []} columns={poColumns} rowKey="id" size="small" pagination={{ pageSize: 5 }} />
      </Card>
      <Modal title="Suspend Vendor" open={suspendModal} onCancel={() => setSuspendModal(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={suspend}>
          <Form.Item name="reason" label="Reason for Suspension" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
