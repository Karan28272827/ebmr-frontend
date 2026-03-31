import React, { useState, useRef, useEffect } from 'react';
import { Input, Spin, Tag, Tooltip, Button } from 'antd';

// ── Types ──────────────────────────────────────────────────────────────────────

interface SourceChunk {
  text: string;
  score: number;
  source_type: string;
  source_id: string;
  metadata: Record<string, string>;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceChunk[];
  timestamp: Date;
  isLoading?: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const RAG_URL = (import.meta as any).env?.VITE_RAG_SERVICE_URL || 'http://localhost:8000';

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  sop:          { label: 'SOP',          color: 'blue'   },
  batch_record: { label: 'Batch Record', color: 'green'  },
  qc_spec:      { label: 'QC Spec',      color: 'purple' },
  deviation:    { label: 'Deviation',    color: 'orange' },
};

const SUGGESTIONS = [
  'What are the granulation parameters for tablet manufacturing?',
  'Show me the assay acceptance criteria for API materials',
  'What deviations have been recorded and how were they resolved?',
  'What is the IQC procedure for incoming raw materials?',
];

// ── Component ──────────────────────────────────────────────────────────────────

const ChatbotWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendQuery = async (question: string) => {
    if (!question.trim() || loading) return;

    const userId = crypto.randomUUID();
    const loadingId = crypto.randomUUID();

    setMessages(prev => [
      ...prev,
      { id: userId, role: 'user', content: question, timestamp: new Date() },
      { id: loadingId, role: 'assistant', content: '', timestamp: new Date(), isLoading: true },
    ]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${RAG_URL}/query/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',   // bypasses ngrok interstitial page
        },
        body: JSON.stringify({ question, top_k: 5 }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setMessages(prev => prev.map(m =>
        m.id === loadingId
          ? {
              ...m,
              isLoading: false,
              content: data.results?.length > 0
                ? `Found ${data.results.length} relevant source${data.results.length > 1 ? 's' : ''}:`
                : (data.message || 'No relevant results found.'),
              sources: data.results || [],
            }
          : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === loadingId
          ? { ...m, isLoading: false, content: 'Could not connect to the knowledge base. Please try again.' }
          : m
      ));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="eBMR Knowledge Assistant"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 52, height: 52, borderRadius: '50%',
          background: '#1677ff', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color: '#fff',
        }}
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 999,
          width: 420, height: 600,
          background: '#fff', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          border: '1px solid #e8e8e8',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{ padding: '12px 16px', background: '#1677ff', color: '#fff', flexShrink: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>eBMR Knowledge Assistant</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Search SOPs, QC specs, batch records & deviations</div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                <div style={{ fontSize: 14, marginBottom: 16 }}>
                  Ask anything about your SOPs, batch specs, or QC parameters
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>Suggested questions:</div>
                  {SUGGESTIONS.map(q => (
                    <button key={q} onClick={() => sendQuery(q)} style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 12px', marginBottom: 6, borderRadius: 8,
                      border: '1px solid #e8e8e8', background: '#f8f9fa',
                      cursor: 'pointer', fontSize: 12, color: '#1677ff',
                    }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id}>
                {msg.role === 'user' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{
                      background: '#1677ff', color: '#fff',
                      borderRadius: '12px 12px 2px 12px',
                      padding: '8px 12px', maxWidth: '80%', fontSize: 13,
                    }}>
                      {msg.content}
                    </div>
                  </div>
                )}

                {msg.role === 'assistant' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ maxWidth: '95%' }}>
                      {msg.isLoading ? (
                        <div style={{
                          background: '#f0f2f5', borderRadius: '12px 12px 12px 2px',
                          padding: '10px 14px',
                        }}>
                          <Spin size="small" />
                          <span style={{ fontSize: 12, marginLeft: 8 }}>Searching knowledge base…</span>
                        </div>
                      ) : (
                        <>
                          <div style={{
                            background: '#f0f2f5', borderRadius: '12px 12px 12px 2px',
                            padding: '8px 12px', fontSize: 13, marginBottom: 6,
                          }}>
                            {msg.content}
                          </div>

                          {msg.sources?.map((src, i) => (
                            <div key={i} style={{
                              background: '#fafafa', border: '1px solid #e8e8e8',
                              borderRadius: 8, padding: '10px 12px', marginBottom: 6, fontSize: 12,
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Tag color={SOURCE_LABELS[src.source_type]?.color || 'default'} style={{ margin: 0 }}>
                                  {SOURCE_LABELS[src.source_type]?.label || src.source_type}
                                </Tag>
                                <Tooltip title="Cosine similarity score">
                                  <span style={{ color: '#888', fontSize: 11 }}>
                                    {Math.round(src.score * 100)}% match
                                  </span>
                                </Tooltip>
                              </div>

                              {src.metadata?.sop_code && (
                                <div style={{ color: '#555', fontWeight: 600, marginBottom: 4 }}>
                                  {src.metadata.sop_code}
                                  {src.metadata.section_title ? ` — ${src.metadata.section_title}` : ''}
                                </div>
                              )}
                              {src.metadata?.spec_code && (
                                <div style={{ color: '#555', fontWeight: 600, marginBottom: 4 }}>
                                  {src.metadata.spec_code} · {src.metadata.product_name}
                                </div>
                              )}
                              {src.metadata?.batch_number && (
                                <div style={{ color: '#555', fontWeight: 600, marginBottom: 4 }}>
                                  Batch: {src.metadata.batch_number} · {src.metadata.product_name}
                                </div>
                              )}
                              {src.metadata?.deviation_label && (
                                <div style={{ color: '#555', fontWeight: 600, marginBottom: 4 }}>
                                  {src.metadata.deviation_label} · {src.metadata.field_name}
                                </div>
                              )}

                              <div style={{ color: '#333', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                                {src.text.length > 320 ? src.text.slice(0, 320) + '…' : src.text}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #e8e8e8', display: 'flex', gap: 8, flexShrink: 0 }}>
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onPressEnter={() => sendQuery(input)}
              placeholder="Ask about SOPs, batch specs, QC parameters…"
              disabled={loading}
              style={{ flex: 1, borderRadius: 8 }}
              maxLength={500}
            />
            <Button
              type="primary"
              onClick={() => sendQuery(input)}
              disabled={!input.trim() || loading}
              style={{ borderRadius: 8 }}
            >
              Ask
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
