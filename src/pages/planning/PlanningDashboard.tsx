import React, { useEffect, useState } from 'react';
import {
  Row, Col, Card, Typography, Button, Tag, Spin, Alert, Space, Badge, Statistic, message, Grid, Divider,
} from 'antd';
import {
  CalendarOutlined, WarningOutlined, ExclamationCircleOutlined, CheckCircleOutlined,
  ArrowRightOutlined, PlusOutlined, BellOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { authApi } from '../../api/axios';

dayjs.extend(isoWeek);

const { useBreakpoint } = Grid;

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default',
  PENDING_APPROVAL: 'processing',
  APPROVED: 'success',
  IN_PROGRESS: 'blue',
  COMPLETED: 'success',
  CANCELLED: 'red',
};

const BATCH_STATUS_COLOR: Record<string, string> = {
  PLANNED: 'default',
  INITIATED: 'blue',
  IN_PROGRESS: 'processing',
  COMPLETED: 'success',
  CANCELLED: 'red',
};

function groupByWeek(batches: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  for (const b of batches) {
    const week = dayjs(b.planned_start).startOf('isoWeek').format('YYYY-MM-DD');
    if (!groups[week]) groups[week] = [];
    groups[week].push(b);
  }
  return groups;
}

export default function PlanningDashboard() {
  const [calendarBatches, setCalendarBatches] = useState<any[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<any[]>([]);
  const [shortageAlerts, setShortageAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState({ plansThisMonth: 0, batchesScheduled: 0, batchesInitiated: 0 });
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const navigate = useNavigate();
  const screens = useBreakpoint();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [calRes, expiryRes] = await Promise.allSettled([
          authApi.get('/plans/calendar'),
          authApi.get('/plans/expiry-alerts'),
        ]);

        if (calRes.status === 'fulfilled') {
          const data = calRes.value.data;
          setCalendarBatches(Array.isArray(data.batches) ? data.batches : Array.isArray(data) ? data : []);
          if (data.stats) setStats(data.stats);
          if (data.shortageAlerts) setShortageAlerts(data.shortageAlerts);
        }
        if (expiryRes.status === 'fulfilled') {
          setExpiryAlerts(Array.isArray(expiryRes.value.data) ? expiryRes.value.data : []);
        }
      } catch {
        message.error('Failed to load planning data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    setAcknowledging(alertId);
    try {
      await authApi.post(`/plans/expiry-alerts/${alertId}/acknowledge`);
      setExpiryAlerts((prev) => prev.filter((a) => a.id !== alertId));
      message.success('Alert acknowledged');
    } catch {
      message.error('Failed to acknowledge alert');
    } finally {
      setAcknowledging(null);
    }
  };

  const critical = expiryAlerts.filter((a) => a.days_remaining <= 7);
  const warnings = expiryAlerts.filter((a) => a.days_remaining > 7 && a.days_remaining <= 30);
  const conflicts = calendarBatches.filter((b) => b.has_conflict);

  const weekGroups = groupByWeek(calendarBatches);
  const sortedWeeks = Object.keys(weekGroups).sort();

  const expiryBadgeColor = (days: number) => {
    if (days <= 7) return 'error';
    if (days <= 30) return 'warning';
    return 'success';
  };

  return (
    <div>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Production Planning
        </Typography.Title>
        <Space wrap>
          <Button icon={<PlusOutlined />} type="primary" onClick={() => navigate('/planning/new')}>
            New Plan
          </Button>
          <Button onClick={() => navigate('/planning/plans')}>All Plans</Button>
        </Space>
      </div>

      {/* Alert banners */}
      {critical.length > 0 && (
        <Alert
          type="error"
          icon={<ExclamationCircleOutlined />}
          showIcon
          message={`${critical.length} Critical Expiry Alert${critical.length > 1 ? 's' : ''} — materials expiring within 7 days`}
          style={{ marginBottom: 8 }}
          closable
        />
      )}
      {warnings.length > 0 && (
        <Alert
          type="warning"
          icon={<WarningOutlined />}
          showIcon
          message={`${warnings.length} Expiry Warning${warnings.length > 1 ? 's' : ''} — materials expiring within 30 days`}
          style={{ marginBottom: 8 }}
          closable
        />
      )}
      {conflicts.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`${conflicts.length} Batch Conflict${conflicts.length > 1 ? 's' : ''} detected on production lines`}
          style={{ marginBottom: 8 }}
          closable
        />
      )}

      {/* Stats row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Plans This Month" value={stats.plansThisMonth} prefix={<CalendarOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Batches Scheduled" value={stats.batchesScheduled} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Shortage Alerts" value={shortageAlerts.length} valueStyle={{ color: shortageAlerts.length > 0 ? '#cf1322' : undefined }} prefix={<WarningOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Batches Initiated" value={stats.batchesInitiated} prefix={<BellOutlined />} />
          </Card>
        </Col>
      </Row>

      {loading ? (
        <Spin style={{ display: 'block', textAlign: 'center', margin: 60 }} />
      ) : (
        <Row gutter={[16, 16]}>
          {/* LEFT: Calendar/List of planned batches */}
          <Col xs={24} lg={16}>
            <Card
              title={<Space><CalendarOutlined /> Monthly Batch Schedule</Space>}
              extra={
                <Button type="link" onClick={() => navigate('/planning/calendar')} icon={<ArrowRightOutlined />}>
                  View Full Calendar
                </Button>
              }
            >
              {sortedWeeks.length === 0 ? (
                <Typography.Text type="secondary">No batches scheduled. Create a plan to get started.</Typography.Text>
              ) : (
                sortedWeeks.map((weekStart) => {
                  const batches = weekGroups[weekStart];
                  const weekEnd = dayjs(weekStart).endOf('isoWeek').format('MMM D');
                  const weekLabel = `Week of ${dayjs(weekStart).format('MMM D')} – ${weekEnd}`;
                  return (
                    <div key={weekStart} style={{ marginBottom: 20 }}>
                      <Typography.Text type="secondary" strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {weekLabel}
                      </Typography.Text>
                      <Divider style={{ margin: '6px 0 10px' }} />
                      <Space direction="vertical" style={{ width: '100%' }} size={8}>
                        {batches.map((batch: any) => (
                          <Card
                            key={batch.id}
                            size="small"
                            style={{
                              borderLeft: `4px solid ${batch.has_conflict ? '#ff4d4f' : '#1890ff'}`,
                              cursor: 'pointer',
                            }}
                            onClick={() => navigate(`/planning/${batch.plan_id}`)}
                          >
                            <Row justify="space-between" align="top" gutter={[8, 4]}>
                              <Col xs={24} sm={16}>
                                <Typography.Text strong>{batch.product_name}</Typography.Text>
                                <br />
                                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                  {batch.batch_size} kg | Line: {batch.production_line || '—'}
                                </Typography.Text>
                                <br />
                                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                  {dayjs(batch.planned_start).format('MMM D HH:mm')} → {dayjs(batch.planned_end).format('MMM D HH:mm')}
                                </Typography.Text>
                              </Col>
                              <Col xs={24} sm={8} style={{ textAlign: screens.sm ? 'right' : 'left' }}>
                                <Tag color={BATCH_STATUS_COLOR[batch.status] || 'default'}>
                                  {(batch.status || 'PLANNED').replace(/_/g, ' ')}
                                </Tag>
                              </Col>
                            </Row>
                          </Card>
                        ))}
                      </Space>
                    </div>
                  );
                })
              )}
            </Card>
          </Col>

          {/* RIGHT: Alerts panels */}
          <Col xs={24} lg={8}>
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              {/* Expiry Alerts panel */}
              <Card
                title={
                  <Space>
                    <WarningOutlined style={{ color: '#ff4d4f' }} />
                    Expiry Alerts
                    {expiryAlerts.length > 0 && <Badge count={expiryAlerts.length} />}
                  </Space>
                }
                size="small"
              >
                {expiryAlerts.length === 0 ? (
                  <Typography.Text type="secondary">No expiry alerts.</Typography.Text>
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }} size={8}>
                    {expiryAlerts.map((alert: any) => (
                      <Card
                        key={alert.id}
                        size="small"
                        style={{ borderLeft: `3px solid ${alert.days_remaining <= 7 ? '#ff4d4f' : '#faad14'}` }}
                      >
                        <div style={{ marginBottom: 4 }}>
                          <Typography.Text strong style={{ fontSize: 13 }}>{alert.material_name}</Typography.Text>
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            Receipt: {alert.receipt_code}
                          </Typography.Text>
                        </div>
                        <div style={{ marginBottom: 6 }}>
                          <Space size={4} wrap>
                            <Typography.Text style={{ fontSize: 12 }}>
                              Expires: {dayjs(alert.expiry_date).format('YYYY-MM-DD')}
                            </Typography.Text>
                            <Tag color={expiryBadgeColor(alert.days_remaining)} style={{ fontSize: 11 }}>
                              {alert.days_remaining}d left
                            </Tag>
                          </Space>
                        </div>
                        <Button
                          size="small"
                          onClick={() => handleAcknowledge(alert.id)}
                          loading={acknowledging === alert.id}
                        >
                          Acknowledge
                        </Button>
                      </Card>
                    ))}
                  </Space>
                )}
              </Card>

              {/* Shortage Alerts */}
              <Card
                title={
                  <Space>
                    <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                    Shortage Alerts
                    {shortageAlerts.length > 0 && <Badge count={shortageAlerts.length} color="orange" />}
                  </Space>
                }
                size="small"
              >
                {shortageAlerts.length === 0 ? (
                  <Typography.Text type="secondary">No shortage alerts.</Typography.Text>
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }} size={8}>
                    {shortageAlerts.map((alert: any, idx: number) => (
                      <Card key={alert.id || idx} size="small" style={{ borderLeft: '3px solid #faad14' }}>
                        <Typography.Text strong style={{ fontSize: 13 }}>{alert.material_name}</Typography.Text>
                        <br />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          Required: {alert.required_qty} {alert.unit} | Available: {alert.available_qty} {alert.unit}
                        </Typography.Text>
                        <br />
                        <Tag color="orange" style={{ marginTop: 4, fontSize: 11 }}>
                          Shortfall: {alert.shortfall} {alert.unit}
                        </Tag>
                      </Card>
                    ))}
                  </Space>
                )}
              </Card>
            </Space>
          </Col>
        </Row>
      )}
    </div>
  );
}
