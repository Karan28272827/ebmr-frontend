import React, { useEffect, useState } from 'react';
import {
  Card,
  Tabs,
  Table,
  Tag,
  Button,
  Typography,
  Spin,
  Space,
  message,
  Grid,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  ArrowRightOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { authApi } from '../../api/axios';
import { useAppSelector } from '../../store/hooks';

const { useBreakpoint } = Grid;

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
  SYSTEM_ADMIN: 6,
};

export default function DocsCenter() {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { user } = useAppSelector((s) => s.auth);

  const [processFlows, setProcessFlows] = useState<any[]>([]);
  const [flowsLoading, setFlowsLoading] = useState(true);

  const roleLevel = ROLE_LEVEL[user?.role || ''] || 0;
  const isQaManager = roleLevel >= ROLE_LEVEL.QA_MANAGER;

  useEffect(() => {
    authApi
      .get('/process-flow')
      .then((r) => setProcessFlows(Array.isArray(r.data) ? r.data : r.data.flows || []))
      .catch(() => {
        message.error('Failed to load process flows');
        setProcessFlows([]);
      })
      .finally(() => setFlowsLoading(false));
  }, []);

  const flowColumns = [
    {
      title: 'Flow Code',
      dataIndex: 'flow_code',
      key: 'flow_code',
      render: (v: string, r: any) => (
        <Button
          type="link"
          onClick={() => navigate(`/docs/process-flow/${r.id}`)}
          style={{ padding: 0 }}
        >
          {v}
        </Button>
      ),
    },
    { title: 'Product', dataIndex: 'product_name', key: 'product_name', ellipsis: true },
    { title: 'Version', dataIndex: 'version', key: 'version', width: 90 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (v: string) => (
        <Tag color={STATUS_COLOR[v] || 'default'}>{(v || '').replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Stages',
      key: 'stages',
      width: 90,
      render: (_: any, r: any) => r.stages?.length ?? r.stage_count ?? 0,
    },
    {
      title: 'Updated',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 130,
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD') : '—'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 90,
      render: (_: any, r: any) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/docs/process-flow/${r.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'process-flows',
      label: (
        <Space>
          <BookOutlined />
          Process Flows
        </Space>
      ),
      children: (
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
            <Typography.Text type="secondary">
              Process flows define the swimlane steps for manufacturing a product.
            </Typography.Text>
            {isQaManager && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/docs/process-flow/new')}
              >
                New Process Flow
              </Button>
            )}
          </div>

          {flowsLoading ? (
            <Spin style={{ display: 'block', textAlign: 'center', margin: 40 }} />
          ) : screens.md ? (
            <Table
              dataSource={processFlows}
              columns={flowColumns}
              rowKey="id"
              pagination={{ pageSize: 20 }}
              size="middle"
              onRow={(r) => ({ onClick: () => navigate(`/docs/process-flow/${r.id}`) })}
            />
          ) : (
            <Row gutter={[12, 12]}>
              {processFlows.map((f) => (
                <Col xs={24} key={f.id}>
                  <Card
                    size="small"
                    extra={
                      <Button size="small" onClick={() => navigate(`/docs/process-flow/${f.id}`)}>
                        View
                      </Button>
                    }
                  >
                    <Typography.Text strong>{f.flow_code}</Typography.Text> — {f.product_name}
                    <br />
                    <Space size={4} wrap style={{ marginTop: 4 }}>
                      <Tag color={STATUS_COLOR[f.status] || 'default'}>
                        {(f.status || '').replace(/_/g, ' ')}
                      </Tag>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        v{f.version} | {f.stages?.length ?? f.stage_count ?? 0} stages
                      </Typography.Text>
                    </Space>
                  </Card>
                </Col>
              ))}
              {processFlows.length === 0 && (
                <Col xs={24}>
                  <Typography.Text type="secondary">No process flows found.</Typography.Text>
                </Col>
              )}
            </Row>
          )}
        </div>
      ),
    },
    {
      key: 'sops',
      label: (
        <Space>
          <FileTextOutlined />
          SOPs
        </Space>
      ),
      children: (
        <Card>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Typography.Title level={5}>SOP Library</Typography.Title>
            <Typography.Text type="secondary">
              Standard Operating Procedures define how each process step must be performed.
            </Typography.Text>
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              size="large"
              onClick={() => navigate('/sop')}
            >
              Go to SOP Library
            </Button>
          </Space>
        </Card>
      ),
    },
    {
      key: 'checklists',
      label: (
        <Space>
          <CheckSquareOutlined />
          Checklists
        </Space>
      ),
      children: (
        <Card>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Typography.Title level={5}>QC Checklists</Typography.Title>
            <Typography.Text type="secondary">
              Quality control checklists used during batch execution and line clearance.
            </Typography.Text>
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              size="large"
              onClick={() => navigate('/qc/checklists')}
            >
              Go to QC Checklists
            </Button>
          </Space>
        </Card>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        Documentation Centre
      </Typography.Title>
      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}
