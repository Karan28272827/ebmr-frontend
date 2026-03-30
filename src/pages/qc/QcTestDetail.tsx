import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Button, Space, Typography, Spin, Input, Checkbox, Progress,
  Row, Col, Select, Divider, message, Descriptions, Alert,
} from 'antd';
import { Grid } from 'antd';
import { ArrowLeftOutlined, CheckOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { authApi } from '../../api/axios';
import { useAppSelector } from '../../store/hooks';

const { useBreakpoint } = Grid;

const STAGE_COLOR: Record<string, string> = { IQC: 'blue', LQC: 'cyan', OQC: 'green' };
const STATUS_COLOR: Record<string, string> = {
  PENDING: 'default',
  IN_PROGRESS: 'processing',
  COMPLETED: 'success',
  FAILED: 'error',
};

const ROLE_LEVEL: Record<string, number> = {
  BATCH_OPERATOR: 1,
  SUPERVISOR: 2,
  QA_REVIEWER: 3,
  QA_MANAGER: 4,
  QUALIFIED_PERSON: 5,
};

export default function QcTestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const screens = useBreakpoint();

  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resultValues, setResultValues] = useState<Record<string, string>>({});
  const [resultNotes, setResultNotes] = useState<Record<string, string>>({});
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict] = useState('');
  const [verdictNotes, setVerdictNotes] = useState('');
  const [recordingVerdict, setRecordingVerdict] = useState(false);

  const roleLevel = ROLE_LEVEL[user?.role || ''] || 0;
  const isQaReviewer = roleLevel >= ROLE_LEVEL.QA_REVIEWER;

  const load = async () => {
    setLoading(true);
    try {
      const res = await authApi.get(`/qc/tests/${id}`);
      setTest(res.data);
      // Pre-fill any existing results
      const existing: Record<string, string> = {};
      const existingNotes: Record<string, string> = {};
      (res.data.results || []).forEach((r: any) => {
        existing[r.parameter_id] = String(r.actual_value ?? '');
        existingNotes[r.parameter_id] = r.notes || '';
      });
      setResultValues(existing);
      setResultNotes(existingNotes);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load QC test');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const calcStatus = (param: any, value: string): 'PASS' | 'FAIL' | null => {
    const num = parseFloat(value);
    if (isNaN(num)) return null;
    if (param.min_value !== undefined && param.min_value !== null && num < param.min_value) return 'FAIL';
    if (param.max_value !== undefined && param.max_value !== null && num > param.max_value) return 'FAIL';
    return 'PASS';
  };

  const checklist = test?.checklist_execution?.items || [];
  const mandatoryChecklistItems = checklist.filter((i: any) => i.is_mandatory);
  const allMandatoryChecked = mandatoryChecklistItems.every((i: any) => checkedItems[i.id]);
  const checkedCount = checklist.filter((i: any) => checkedItems[i.id]).length;

  const params = test?.parameters || [];
  const mandatoryParams = params.filter((p: any) => p.is_mandatory);
  const allMandatoryFilled = mandatoryParams.every((p: any) => {
    const v = resultValues[p.id];
    return v !== undefined && v !== '';
  });

  const handleSubmitResults = async () => {
    setSubmitting(true);
    try {
      const results = params.map((p: any) => ({
        parameter_id: p.id,
        actual_value: resultValues[p.id] !== undefined ? parseFloat(resultValues[p.id]) : null,
        status: calcStatus(p, resultValues[p.id] || ''),
        notes: resultNotes[p.id] || '',
      }));
      await authApi.post(`/qc/tests/${id}/results`, { results });
      message.success('Results submitted successfully');
      load();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to submit results');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordVerdict = async () => {
    if (!verdict) { message.warning('Please select a verdict'); return; }
    setRecordingVerdict(true);
    try {
      await authApi.patch(`/qc/tests/${id}/verdict`, { verdict, notes: verdictNotes });
      message.success('Verdict recorded');
      load();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to record verdict');
    } finally {
      setRecordingVerdict(false);
    }
  };

  if (loading) {
    return <Spin style={{ display: 'block', textAlign: 'center', margin: 80 }} />;
  }

  if (!test) return null;

  const paramColumns = [
    { title: 'Parameter', dataIndex: 'name', key: 'name' },
    { title: 'Unit', dataIndex: 'unit', key: 'unit', width: 80 },
    { title: 'Test Method', dataIndex: 'test_method', key: 'test_method', ellipsis: true },
    {
      title: 'Min | Target | Max',
      key: 'range',
      width: 160,
      render: (_: any, p: any) => (
        <Space size={4}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{p.min_value ?? '—'}</Typography.Text>
          <Typography.Text>|</Typography.Text>
          <Typography.Text>{p.target_value ?? '—'}</Typography.Text>
          <Typography.Text>|</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{p.max_value ?? '—'}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Actual Value',
      key: 'actual',
      width: 140,
      render: (_: any, p: any) => (
        <Input
          value={resultValues[p.id] || ''}
          onChange={(e) => setResultValues((prev) => ({ ...prev, [p.id]: e.target.value }))}
          placeholder="Enter value"
          suffix={p.unit || ''}
          style={{ width: 120 }}
          disabled={test.status === 'COMPLETED'}
        />
      ),
    },
    {
      title: 'Status',
      key: 'calc_status',
      width: 90,
      render: (_: any, p: any) => {
        const s = calcStatus(p, resultValues[p.id] || '');
        if (!s) return <Tag>—</Tag>;
        return <Tag color={s === 'PASS' ? 'success' : 'error'}>{s}</Tag>;
      },
    },
    {
      title: 'Notes',
      key: 'notes',
      render: (_: any, p: any) => (
        <Input
          value={resultNotes[p.id] || ''}
          onChange={(e) => setResultNotes((prev) => ({ ...prev, [p.id]: e.target.value }))}
          placeholder="Optional"
          disabled={test.status === 'COMPLETED'}
        />
      ),
    },
    {
      title: '',
      key: 'mandatory',
      width: 90,
      render: (_: any, p: any) =>
        p.is_mandatory ? <Tag color="red">Required</Tag> : null,
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/qc/tests')}>
          Back
        </Button>
      </Space>

      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <Descriptions
          title={
            <Space wrap>
              <Typography.Text strong style={{ fontSize: 16 }}>{test.test_code}</Typography.Text>
              <Tag color={STAGE_COLOR[test.qc_stage] || 'default'}>{test.qc_stage}</Tag>
              <Tag color={STATUS_COLOR[test.status] || 'default'}>{test.status?.replace(/_/g, ' ')}</Tag>
            </Space>
          }
          size="small"
          column={{ xs: 1, sm: 2, md: 3 }}
        >
          <Descriptions.Item label="Batch / Receipt">
            {test.batch_id ? (
              <Link to={`/batches/${test.batch_id}`}>{test.reference}</Link>
            ) : test.receipt_id ? (
              <Link to={`/materials/receipts/${test.receipt_id}`}>{test.reference}</Link>
            ) : (
              test.reference || '—'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Assigned To">
            {test.assigned_to?.name || test.assigned_to || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Initiated At">
            {test.initiated_at ? dayjs(test.initiated_at).format('YYYY-MM-DD HH:mm') : '—'}
          </Descriptions.Item>
          {test.verdict && (
            <Descriptions.Item label="Verdict">
              <Tag color={test.verdict === 'PASS' ? 'success' : test.verdict === 'FAIL' ? 'error' : 'warning'}>
                {test.verdict}
              </Tag>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Checklist */}
      {checklist.length > 0 && (
        <Card
          title="Pre-Test Checklist"
          style={{ marginBottom: 16 }}
          extra={
            <Typography.Text type="secondary">
              {checkedCount}/{checklist.length} items complete
            </Typography.Text>
          }
        >
          <Progress
            percent={checklist.length > 0 ? Math.round((checkedCount / checklist.length) * 100) : 0}
            style={{ marginBottom: 16 }}
          />
          <Space direction="vertical" style={{ width: '100%' }}>
            {checklist.map((item: any) => (
              <Card key={item.id} size="small" style={{ background: '#fafafa' }}>
                <Space align="start">
                  <Checkbox
                    checked={!!checkedItems[item.id]}
                    onChange={(e) =>
                      setCheckedItems((prev) => ({ ...prev, [item.id]: e.target.checked }))
                    }
                    disabled={test.status === 'COMPLETED'}
                  />
                  <div style={{ flex: 1 }}>
                    <Typography.Text>
                      {item.instruction}
                      {item.is_mandatory && <Tag color="red" style={{ marginLeft: 8 }}>Required</Tag>}
                    </Typography.Text>
                    {item.requires_value && (
                      <Input
                        placeholder="Enter value"
                        style={{ marginTop: 4, maxWidth: 240 }}
                        disabled={test.status === 'COMPLETED'}
                      />
                    )}
                  </div>
                </Space>
              </Card>
            ))}
          </Space>
        </Card>
      )}

      {/* Parameter Results */}
      {checklist.length === 0 || allMandatoryChecked ? (
        <Card
          title="Parameter Results"
          style={{ marginBottom: 16 }}
          extra={
            test.status !== 'COMPLETED' && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                disabled={!allMandatoryFilled}
                loading={submitting}
                onClick={handleSubmitResults}
              >
                Submit Results
              </Button>
            )
          }
        >
          {!allMandatoryFilled && test.status !== 'COMPLETED' && (
            <Alert
              message="Fill in all required parameters before submitting."
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
            />
          )}

          {screens.md ? (
            <Table
              dataSource={params}
              columns={paramColumns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          ) : (
            <Row gutter={[8, 8]}>
              {params.map((p: any) => {
                const s = calcStatus(p, resultValues[p.id] || '');
                return (
                  <Col xs={24} key={p.id}>
                    <Card
                      size="small"
                      title={
                        <Space>
                          <Typography.Text strong>{p.name}</Typography.Text>
                          {p.is_mandatory && <Tag color="red">Required</Tag>}
                          {s && <Tag color={s === 'PASS' ? 'success' : 'error'}>{s}</Tag>}
                        </Space>
                      }
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Typography.Text type="secondary">
                          Unit: {p.unit || '—'} | Min: {p.min_value ?? '—'} | Target: {p.target_value ?? '—'} | Max: {p.max_value ?? '—'}
                        </Typography.Text>
                        <Input
                          value={resultValues[p.id] || ''}
                          onChange={(e) => setResultValues((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          placeholder="Enter actual value"
                          suffix={p.unit || ''}
                          size="large"
                          disabled={test.status === 'COMPLETED'}
                        />
                        <Input
                          value={resultNotes[p.id] || ''}
                          onChange={(e) => setResultNotes((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          placeholder="Notes (optional)"
                          disabled={test.status === 'COMPLETED'}
                        />
                      </Space>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}

          {!screens.md && test.status !== 'COMPLETED' && (
            <Button
              type="primary"
              size="large"
              block
              icon={<CheckOutlined />}
              disabled={!allMandatoryFilled}
              loading={submitting}
              onClick={handleSubmitResults}
              style={{ marginTop: 16 }}
            >
              Submit Results
            </Button>
          )}
        </Card>
      ) : (
        <Alert
          message="Complete all mandatory checklist items before recording parameter results."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Verdict Section */}
      {(test.status === 'COMPLETED' || test.results?.length > 0) && isQaReviewer && (
        <Card title="Verdict">
          {test.verdict ? (
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="Verdict">
                <Tag color={test.verdict === 'PASS' ? 'success' : test.verdict === 'FAIL' ? 'error' : 'warning'}>
                  {test.verdict}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Notes">{test.verdict_notes || '—'}</Descriptions.Item>
              <Descriptions.Item label="Recorded By">
                {test.verdict_by?.name || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Recorded At">
                {test.verdict_at ? dayjs(test.verdict_at).format('YYYY-MM-DD HH:mm') : '—'}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Space direction="vertical" style={{ width: '100%', maxWidth: 400 }}>
              <Select
                placeholder="Select verdict"
                style={{ width: '100%' }}
                value={verdict || undefined}
                onChange={setVerdict}
                options={[
                  { value: 'PASS', label: 'PASS' },
                  { value: 'FAIL', label: 'FAIL' },
                  { value: 'CONDITIONAL_PASS', label: 'CONDITIONAL PASS' },
                ]}
              />
              <Input.TextArea
                rows={3}
                placeholder="Verdict notes..."
                value={verdictNotes}
                onChange={(e) => setVerdictNotes(e.target.value)}
              />
              <Button
                type="primary"
                onClick={handleRecordVerdict}
                loading={recordingVerdict}
                disabled={!verdict}
                size={screens.md ? 'middle' : 'large'}
                block={!screens.md}
              >
                Record Verdict
              </Button>
            </Space>
          )}
        </Card>
      )}
    </div>
  );
}
