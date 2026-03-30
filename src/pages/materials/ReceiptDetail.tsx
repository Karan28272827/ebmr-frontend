import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Tag, Button, Space, Alert, Typography, Spin, Descriptions,
  Modal, Form, Input, message, Grid, Table,
} from 'antd';
import { ArrowLeftOutlined, LinkOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { authApi } from '../../api/axios';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const QC_STATUS_COLOR: Record<string, string> = {
  PENDING_IQC: 'default',
  IQC_IN_PROGRESS: 'processing',
  IQC_PASSED: 'success',
  IQC_FAILED: 'error',
  IN_STORES: 'success',
  CONSUMED: 'default',
};

const QC_VERDICT_COLOR: Record<string, string> = {
  PASS: 'success',
  FAIL: 'error',
  PENDING: 'default',
};

function expiryAlert(expiryDate: string) {
  const diff = dayjs(expiryDate).diff(dayjs(), 'day');
  if (diff < 0) {
    return <Alert type="error" showIcon message={`EXPIRED — ${Math.abs(diff)} days ago`} style={{ marginBottom: 16 }} />;
  }
  if (diff < 30) {
    return (
      <Alert
        type="error"
        showIcon
        message={`EXPIRY CRITICAL — ${diff} days remaining`}
        description={`This material expires on ${dayjs(expiryDate).format('DD MMM YYYY')}. Immediate action required.`}
        style={{ marginBottom: 16 }}
      />
    );
  }
  if (diff < 90) {
    return (
      <Alert
        type="warning"
        showIcon
        message={`Expiry Warning — ${diff} days remaining`}
        description={`This material expires on ${dayjs(expiryDate).format('DD MMM YYYY')}.`}
        style={{ marginBottom: 16 }}
      />
    );
  }
  return null;
}

export default function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const screens = useBreakpoint();

  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [grnModalOpen, setGrnModalOpen] = useState(false);
  const [submittingGrn, setSubmittingGrn] = useState(false);
  const [grnForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await authApi.get(`/materials/receipts/${id}`);
      setReceipt(res.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        message.error('Receipt not found');
        navigate('/materials/receipts');
      } else {
        message.error(err.response?.data?.message || 'Failed to load receipt');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  const handleCreateGrn = async (values: any) => {
    setSubmittingGrn(true);
    try {
      await authApi.post('/materials/grn', {
        po_id: receipt.po_id,
        receipt_ids: [receipt.id],
        store_location: values.store_location,
        invoice_ref: values.invoice_ref || undefined,
      });
      message.success('GRN created and material moved to stores');
      setGrnModalOpen(false);
      load();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to create GRN');
    } finally {
      setSubmittingGrn(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!receipt) return null;

  const showGrnButton = receipt.qc_status === 'IQC_PASSED' && !receipt.grn_id;

  const batchUsageColumns = [
    { title: 'Batch Code', dataIndex: 'batch_code', key: 'batch_code' },
    { title: 'Qty Used', dataIndex: 'qty_used', key: 'qty_used' },
    { title: 'Used At', dataIndex: 'used_at', key: 'used_at', render: (d: string) => dayjs(d).format('DD MMM YYYY') },
  ];

  return (
    <div style={{ padding: screens.md ? 24 : 12 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/materials/receipts')}>
              Back
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              {receipt.receipt_code}
            </Title>
            <Tag color={QC_STATUS_COLOR[receipt.qc_status] || 'default'}>
              {receipt.qc_status?.replace(/_/g, ' ')}
            </Tag>
          </Space>
        </Col>
        <Col>
          {showGrnButton && (
            <Button type="primary" onClick={() => { grnForm.resetFields(); setGrnModalOpen(true); }}>
              Move to Stores / Create GRN
            </Button>
          )}
        </Col>
      </Row>

      {/* Expiry Alert Banner */}
      {receipt.expiry_date && expiryAlert(receipt.expiry_date)}

      <Row gutter={[16, 16]}>
        {/* LEFT COLUMN */}
        <Col xs={24} md={12}>
          {/* Receipt Details */}
          <Card title="Receipt Details" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Receipt Code">{receipt.receipt_code}</Descriptions.Item>
              <Descriptions.Item label="Received Qty">
                {receipt.received_qty} {receipt.unit}
              </Descriptions.Item>
              <Descriptions.Item label="Received At">
                {receipt.received_at ? dayjs(receipt.received_at).format('DD MMM YYYY HH:mm') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Received By">
                {receipt.received_by?.name || receipt.received_by || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Store Location">
                {receipt.store_location || <Text type="secondary">Not assigned</Text>}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Supplier Info */}
          <Card title="Supplier Information">
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="PO Number">{receipt.po?.po_number || '-'}</Descriptions.Item>
              <Descriptions.Item label="Supplier">{receipt.po?.supplier_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Supplier Code">{receipt.po?.supplier_code || '-'}</Descriptions.Item>
              <Descriptions.Item label="Supplier Batch No.">{receipt.supplier_batch_no || '-'}</Descriptions.Item>
              <Descriptions.Item label="Manufacture Date">
                {receipt.manufacture_date ? dayjs(receipt.manufacture_date).format('DD MMM YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Expiry Date">
                {receipt.expiry_date ? (
                  <Space>
                    <Text>{dayjs(receipt.expiry_date).format('DD MMM YYYY')}</Text>
                    {(() => {
                      const diff = dayjs(receipt.expiry_date).diff(dayjs(), 'day');
                      if (diff < 0) return <Tag color="error">EXPIRED</Tag>;
                      if (diff < 30) return <Tag color="error">CRITICAL ({diff}d)</Tag>;
                      if (diff < 90) return <Tag color="warning">WARNING ({diff}d)</Tag>;
                      return <Tag color="success">OK ({diff}d)</Tag>;
                    })()}
                  </Space>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="CoA Reference">
                {receipt.coa_reference || <Text type="secondary">Not provided</Text>}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* RIGHT COLUMN */}
        <Col xs={24} md={12}>
          {/* IQC Test */}
          <Card title="IQC Test" style={{ marginBottom: 16 }}>
            {receipt.qc_tests && receipt.qc_tests.length > 0 ? (
              receipt.qc_tests.map((test: any) => (
                <Descriptions key={test.id} column={1} size="small" bordered style={{ marginBottom: 8 }}>
                  <Descriptions.Item label="Test Code">
                    <Button
                      type="link"
                      style={{ padding: 0 }}
                      icon={<LinkOutlined />}
                      onClick={() => navigate(`/qc/tests/${test.id}`)}
                    >
                      {test.test_code}
                    </Button>
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag color={QC_STATUS_COLOR[test.status] || 'default'}>
                      {test.status?.replace(/_/g, ' ')}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Verdict">
                    {test.verdict ? (
                      <Tag color={QC_VERDICT_COLOR[test.verdict] || 'default'}>{test.verdict}</Tag>
                    ) : (
                      <Text type="secondary">Pending</Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Initiated At">
                    {test.initiated_at ? dayjs(test.initiated_at).format('DD MMM YYYY HH:mm') : '-'}
                  </Descriptions.Item>
                </Descriptions>
              ))
            ) : (
              <Alert
                type="info"
                showIcon
                message="IQC test pending"
                description="No IQC test has been initiated for this receipt yet."
              />
            )}
          </Card>

          {/* GRN Status */}
          <Card title="GRN Status" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="GRN Number">
                {receipt.grn?.grn_number || (
                  <Text type="secondary">Not yet created</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Accounts Status">
                {receipt.grn?.accounts_status ? (
                  <Tag>{receipt.grn.accounts_status.replace(/_/g, ' ')}</Tag>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Descriptions.Item>
              {receipt.grn?.invoice_ref && (
                <Descriptions.Item label="Invoice Ref">
                  {receipt.grn.invoice_ref}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Batch Usages */}
          {receipt.batch_usages && receipt.batch_usages.length > 0 && (
            <Card title="Batch Usages">
              <Table
                dataSource={receipt.batch_usages}
                columns={batchUsageColumns}
                rowKey="id"
                size="small"
                pagination={false}
              />
            </Card>
          )}
        </Col>
      </Row>

      {/* Create GRN Modal */}
      <Modal
        title="Move to Stores / Create GRN"
        open={grnModalOpen}
        onCancel={() => setGrnModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          message="This will create a Goods Receipt Note and mark the material as In Stores."
          style={{ marginBottom: 16 }}
        />
        <Form form={grnForm} layout="vertical" onFinish={handleCreateGrn}>
          <Form.Item
            label="Store Location"
            name="store_location"
            rules={[{ required: true, message: 'Please enter store location' }]}
          >
            <Input placeholder="e.g. Rack A3, Cold Storage 2" />
          </Form.Item>
          <Form.Item label="Invoice Reference (optional)" name="invoice_ref">
            <Input placeholder="Supplier invoice number" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setGrnModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submittingGrn}>
                Create GRN
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
