import React, { useEffect, useState } from 'react';
import {
  Card, Tabs, Tag, Button, Space, Typography, Spin, Collapse, Table, Badge, message, Descriptions, Select, Input,
} from 'antd';
import {
  CheckCircleOutlined, StopOutlined, SendOutlined, ArrowLeftOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { authApi } from '../../api/axios';
import { useAppSelector } from '../../store/hooks';
import ESignatureModal from '../../components/ESignatureModal';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default',
  UNDER_REVIEW: 'processing',
  APPROVED: 'success',
  RETIRED: 'default',
};

const ROLE_LEVEL: Record<string, number> = {
  BATCH_OPERATOR: 1,
  SUPERVISOR: 2,
  QA_REVIEWER: 3,
  QA_MANAGER: 4,
  QUALIFIED_PERSON: 5,
};

export default function SopDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const [sop, setSop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [eSignOpen, setESignOpen] = useState(false);
  const [eSignLoading, setESignLoading] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');
  const [statusChanging, setStatusChanging] = useState(false);

  const roleLevel = ROLE_LEVEL[user?.role || ''] || 0;
  const isQaManager = roleLevel >= ROLE_LEVEL.QA_MANAGER;

  const load = async () => {
    setLoading(true);
    try {
      const res = await authApi.get(`/sop/${id}`);
      setSop(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load SOP');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'APPROVED') {
      setPendingStatus(newStatus);
      setESignOpen(true);
      return;
    }
    setStatusChanging(true);
    try {
      await authApi.patch(`/sop/${id}/status`, { status: newStatus });
      message.success(`SOP status changed to ${newStatus.replace(/_/g, ' ')}`);
      load();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusChanging(false);
    }
  };

  const handleESign = async (signature: { meaning: string; password: string }) => {
    setESignLoading(true);
    try {
      await authApi.patch(`/sop/${id}/status`, {
        status: pendingStatus,
        signature,
      });
      message.success('SOP approved with e-signature');
      setESignOpen(false);
      load();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to approve SOP');
    } finally {
      setESignLoading(false);
    }
  };

  if (loading) {
    return <Spin style={{ display: 'block', textAlign: 'center', margin: 80 }} />;
  }

  if (!sop) return null;

  const qcStages = ['IQC', 'LQC', 'OQC'];

  const paramColumns = [
    { title: 'Code', dataIndex: 'param_code', key: 'param_code', width: 120 },
    { title: 'Parameter', dataIndex: 'name', key: 'name' },
    { title: 'Unit', dataIndex: 'unit', key: 'unit', width: 80 },
    { title: 'Min', dataIndex: 'min_value', key: 'min_value', width: 80, render: (v: any) => v ?? '—' },
    { title: 'Target', dataIndex: 'target_value', key: 'target_value', width: 80, render: (v: any) => v ?? '—' },
    { title: 'Max', dataIndex: 'max_value', key: 'max_value', width: 80, render: (v: any) => v ?? '—' },
    {
      title: 'Mandatory',
      dataIndex: 'is_mandatory',
      key: 'is_mandatory',
      width: 100,
      render: (v: boolean) =>
        v ? <Badge status="error" text="Required" /> : <Badge status="default" text="Optional" />,
    },
  ];

  const tabItems = [
    {
      key: 'sections',
      label: 'Sections',
      children: (
        <Collapse
          items={(sop.sections || []).map((sec: any) => ({
            key: sec.id,
            label: (
              <Space>
                <Typography.Text strong>{sec.section_number}. {sec.title}</Typography.Text>
                {sec.is_critical && <Tag color="red">Critical</Tag>}
              </Space>
            ),
            children: (
              <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {sec.content || <Typography.Text type="secondary">No content.</Typography.Text>}
              </Typography.Paragraph>
            ),
          }))}
        />
      ),
    },
    {
      key: 'qc_params',
      label: 'QC Parameters',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {qcStages.map((stage) => {
            const params = (sop.qc_parameters || []).filter((p: any) => p.stage === stage);
            if (params.length === 0) return null;
            return (
              <Card key={stage} size="small" title={<Tag color="blue">{stage}</Tag>}>
                <Table
                  dataSource={params}
                  columns={paramColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </Card>
            );
          })}
          {(sop.qc_parameters || []).length === 0 && (
            <Typography.Text type="secondary">No QC parameters defined.</Typography.Text>
          )}
        </Space>
      ),
    },
    {
      key: 'linked_boms',
      label: 'Linked BOMs',
      children: (
        <Table
          dataSource={sop.linked_boms || []}
          rowKey="id"
          pagination={false}
          size="small"
          columns={[
            {
              title: 'BOM Code',
              dataIndex: 'bom_code',
              render: (v: string, r: any) => (
                <Button type="link" onClick={() => navigate(`/bom/${r.id}`)} style={{ padding: 0 }}>
                  {v}
                </Button>
              ),
            },
            { title: 'Product', dataIndex: 'product_name' },
            { title: 'Version', dataIndex: 'version' },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (v: string) => <Tag color={STATUS_COLOR[v] || 'default'}>{v}</Tag>,
            },
          ]}
          locale={{ emptyText: 'No linked BOMs.' }}
        />
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/sop')}>
          Back
        </Button>
      </Space>

      <Card
        title={
          <Space wrap>
            <Typography.Text strong style={{ fontSize: 16 }}>
              {sop.sop_code}
            </Typography.Text>
            <Typography.Text>{sop.title}</Typography.Text>
            <Tag>{sop.version}</Tag>
            <Tag color={STATUS_COLOR[sop.status] || 'default'}>{sop.status?.replace(/_/g, ' ')}</Tag>
            <Tag>{sop.product_category}</Tag>
          </Space>
        }
        extra={
          <Space wrap>
            {sop.status === 'DRAFT' && (
              <Button
                icon={<SendOutlined />}
                onClick={() => handleStatusChange('UNDER_REVIEW')}
                loading={statusChanging}
              >
                Submit for Review
              </Button>
            )}
            {sop.status === 'UNDER_REVIEW' && isQaManager && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handleStatusChange('APPROVED')}
                loading={statusChanging}
              >
                Approve
              </Button>
            )}
            {sop.status === 'APPROVED' && isQaManager && (
              <Button
                danger
                icon={<StopOutlined />}
                onClick={() => handleStatusChange('RETIRED')}
                loading={statusChanging}
              >
                Retire
              </Button>
            )}
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="Effective Date">
            {sop.effective_date ? dayjs(sop.effective_date).format('YYYY-MM-DD') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Review Date">
            {sop.review_date ? dayjs(sop.review_date).format('YYYY-MM-DD') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Approved At">
            {sop.approved_at ? dayjs(sop.approved_at).format('YYYY-MM-DD HH:mm') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Approved By">
            {sop.approved_by?.name || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Created">
            {sop.created_at ? dayjs(sop.created_at).format('YYYY-MM-DD') : '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Tabs items={tabItems} />
      </Card>

      <ESignatureModal
        open={eSignOpen}
        title="Approve SOP"
        meanings={['I approve this SOP', 'I certify this SOP is compliant', 'I confirm this SOP is ready for production']}
        onConfirm={handleESign}
        onCancel={() => { setESignOpen(false); setPendingStatus(''); }}
        loading={eSignLoading}
      />
    </div>
  );
}
