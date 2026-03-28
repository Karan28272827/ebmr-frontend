import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Tag, Button, Space, Typography, Tabs, Alert, Descriptions, List, message, Spin,
} from 'antd';
import { ArrowLeftOutlined, AuditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { authApi } from '../api/axios';
import { useAppSelector } from '../store/hooks';
import StepWizard from '../components/StepWizard';
import ESignatureModal from '../components/ESignatureModal';

const STATE_COLOR: Record<string, string> = {
  DRAFT: 'default', INITIATED: 'blue', LINE_CLEARANCE: 'cyan', IN_PROGRESS: 'processing',
  DEVIATION: 'error', HOLD: 'warning', PENDING_QA: 'orange', PENDING_QP: 'purple',
  RELEASED: 'success', REJECTED: 'red',
};

const ROLE_LEVEL: Record<string, number> = {
  BATCH_OPERATOR: 1, SUPERVISOR: 2, QA_REVIEWER: 3, QA_MANAGER: 4, QUALIFIED_PERSON: 5,
};

// Which transitions are available per state, and who can do them
const TRANSITIONS: Record<string, { label: string; toState: string; minRole: string; critical: boolean; meaning: string }[]> = {
  DRAFT: [{ label: 'Initiate Batch', toState: 'INITIATED', minRole: 'BATCH_OPERATOR', critical: false, meaning: 'Performed By' }],
  INITIATED: [{ label: 'Start Line Clearance', toState: 'LINE_CLEARANCE', minRole: 'SUPERVISOR', critical: true, meaning: 'Verified By' }],
  LINE_CLEARANCE: [{ label: 'Begin Production', toState: 'IN_PROGRESS', minRole: 'SUPERVISOR', critical: true, meaning: 'Verified By' }],
  IN_PROGRESS: [
    { label: 'Submit for QA Review', toState: 'PENDING_QA', minRole: 'SUPERVISOR', critical: true, meaning: 'Verified By' },
    { label: 'Place on Hold', toState: 'HOLD', minRole: 'QA_REVIEWER', critical: false, meaning: 'Approved By' },
    { label: 'Mark Deviation', toState: 'DEVIATION', minRole: 'QA_REVIEWER', critical: false, meaning: 'Approved By' },
  ],
  DEVIATION: [
    { label: 'Resume Production', toState: 'IN_PROGRESS', minRole: 'QA_REVIEWER', critical: false, meaning: 'Approved By' },
    { label: 'Place on Hold', toState: 'HOLD', minRole: 'QA_REVIEWER', critical: false, meaning: 'Approved By' },
  ],
  HOLD: [
    { label: 'Resume Production', toState: 'IN_PROGRESS', minRole: 'QA_REVIEWER', critical: false, meaning: 'Approved By' },
    { label: 'Mark Deviation', toState: 'DEVIATION', minRole: 'QA_REVIEWER', critical: false, meaning: 'Approved By' },
  ],
  PENDING_QA: [
    { label: 'Approve — Send to QP', toState: 'PENDING_QP', minRole: 'QA_MANAGER', critical: true, meaning: 'Approved By' },
    { label: 'Place on Hold', toState: 'HOLD', minRole: 'QA_REVIEWER', critical: false, meaning: 'Approved By' },
  ],
  PENDING_QP: [
    { label: 'Release Batch', toState: 'RELEASED', minRole: 'QUALIFIED_PERSON', critical: true, meaning: 'Released By' },
    { label: 'Reject Batch', toState: 'REJECTED', minRole: 'QUALIFIED_PERSON', critical: true, meaning: 'Approved By' },
  ],
};

export default function BatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const [batch, setBatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [sigModal, setSigModal] = useState<{ open: boolean; transition?: any }>({ open: false });

  const loadBatch = useCallback(async () => {
    try {
      const res = await authApi.get(`/batches/${id}`);
      setBatch(res.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadBatch(); }, [loadBatch]);

  const canDo = (minRole: string) => (ROLE_LEVEL[user?.role || ''] || 0) >= (ROLE_LEVEL[minRole] || 0);

  const doTransition = async (trans: any, signature?: { meaning: string; password: string }) => {
    setActionLoading(true);
    try {
      if (trans.critical && signature) {
        // verify password via transition endpoint with signature
        await authApi.put(`/batches/${id}/transition`, {
          toState: trans.toState,
          signature: { meaning: signature.meaning, password: signature.password },
        });
      } else {
        await authApi.put(`/batches/${id}/transition`, { toState: trans.toState });
      }
      message.success(`Transitioned to ${trans.toState}`);
      setSigModal({ open: false });
      await loadBatch();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransitionClick = (trans: any) => {
    if (trans.critical) {
      setSigModal({ open: true, transition: trans });
    } else {
      doTransition(trans);
    }
  };

  const completeStep = async (stepNumber: number, actualValues: any) => {
    setActionLoading(true);
    try {
      const res = await authApi.put(`/batches/${id}/steps/${stepNumber}/complete`, { actualValues });
      if (res.data.deviationsRaised > 0) {
        message.warning(`Step completed — ${res.data.deviationsRaised} deviation(s) raised for out-of-range values`);
      } else {
        message.success('Step completed');
      }
      await loadBatch();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to complete step');
    } finally {
      setActionLoading(false);
    }
  };

  const skipStep = async (stepNumber: number) => {
    setActionLoading(true);
    try {
      await authApi.put(`/batches/${id}/steps/${stepNumber}/skip`);
      message.success('Step skipped');
      await loadBatch();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to skip step');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Spin style={{ display: 'block', marginTop: 100, textAlign: 'center' }} />;
  if (!batch) return <Alert message="Batch not found" type="error" />;

  const availableTransitions = (TRANSITIONS[batch.state] || []).filter((t) => canDo(t.minRole));
  const steps: any[] = batch.steps || [];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')}>Back</Button>
        <Button icon={<AuditOutlined />} onClick={() => navigate(`/batches/${id}/audit`)}>Audit Trail</Button>
      </Space>

      <Card
        title={
          <Space>
            <Typography.Text strong style={{ fontSize: 18 }}>{batch.batchNumber}</Typography.Text>
            <Tag color={STATE_COLOR[batch.state]}>{batch.state.replace(/_/g, ' ')}</Tag>
          </Space>
        }
        extra={
          <Space>
            {availableTransitions.map((t) => (
              <Button
                key={t.toState}
                type={t.critical ? 'primary' : 'default'}
                danger={t.toState === 'REJECTED'}
                onClick={() => handleTransitionClick(t)}
                loading={actionLoading}
              >
                {t.label}
              </Button>
            ))}
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Descriptions column={3}>
          <Descriptions.Item label="Product">{batch.productName}</Descriptions.Item>
          <Descriptions.Item label="Product Code">{batch.productCode}</Descriptions.Item>
          <Descriptions.Item label="Batch Size">{batch.batchSize} kg</Descriptions.Item>
          <Descriptions.Item label="Initiated By">{batch.initiator?.name}</Descriptions.Item>
          <Descriptions.Item label="Initiated At">{batch.initiatedAt ? dayjs(batch.initiatedAt).format('YYYY-MM-DD HH:mm') : '—'}</Descriptions.Item>
          <Descriptions.Item label="Created">{dayjs(batch.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Tabs
        items={[
          {
            key: 'steps',
            label: 'Step Execution',
            children: (
              <StepWizard
                steps={steps}
                userRole={user?.role || ''}
                onComplete={completeStep}
                onSkip={skipStep}
                loading={actionLoading}
              />
            ),
          },
          {
            key: 'signatures',
            label: `Signatures (${(batch.signatures || []).length})`,
            children: (
              <List
                dataSource={batch.signatures || []}
                renderItem={(sig: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Space><strong>{sig.user_name}</strong><Tag>{sig.role}</Tag><Tag color="blue">{sig.meaning}</Tag></Space>}
                      description={`${sig.step_or_transition} · ${dayjs(sig.timestamp).format('YYYY-MM-DD HH:mm:ss')}`}
                    />
                  </List.Item>
                )}
                locale={{ emptyText: 'No signatures yet' }}
              />
            ),
          },
          {
            key: 'deviations',
            label: `Deviations (${(batch.deviations || []).length})`,
            children: (
              <List
                dataSource={batch.deviations || []}
                renderItem={(dev: any) => (
                  <List.Item
                    extra={
                      <Button size="small" onClick={() => navigate(`/deviations/${dev.id}`)}>View</Button>
                    }
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <Typography.Text>Step {dev.stepNumber}: {dev.fieldName}</Typography.Text>
                          <Tag color={dev.status === 'OPEN' ? 'error' : dev.status === 'CLOSED' ? 'success' : 'warning'}>
                            {dev.status}
                          </Tag>
                        </Space>
                      }
                      description={`Actual: ${dev.actualValue} | Expected: ${dev.expectedRange} | ${dayjs(dev.raisedAt).format('YYYY-MM-DD HH:mm')}`}
                    />
                  </List.Item>
                )}
                locale={{ emptyText: 'No deviations' }}
              />
            ),
          },
        ]}
      />

      <ESignatureModal
        open={sigModal.open}
        title={sigModal.transition?.label || ''}
        meanings={sigModal.transition ? [sigModal.transition.meaning] : ['Performed By', 'Verified By', 'Approved By', 'Released By']}
        loading={actionLoading}
        onConfirm={(sig) => doTransition(sigModal.transition, sig)}
        onCancel={() => setSigModal({ open: false })}
      />
    </div>
  );
}
