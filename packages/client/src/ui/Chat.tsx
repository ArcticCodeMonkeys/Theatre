import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  rollExpression, buildExpression,
  RollResult,
} from '../lib/dice';

const API = 'http://localhost:3001';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: number;
  type: 'roll' | 'text';
  /** Optional nameplate shown above roll cards (e.g. "Aria — Fireball"). */
  title?: string;
  /** Human-readable label / plain text. */
  content: string;
  result?: RollResult;
  /** ISO string from DB, or local Date for optimistic messages. */
  created_at: string;
}

/** Parse a raw DB row into a ChatMessage. */
function rowToMsg(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as number,
    type: row.type as 'roll' | 'text',
    title: row.title as string | undefined,
    content: row.content as string,
    result: row.result ? JSON.parse(row.result as string) as RollResult : undefined,
    created_at: row.created_at as string,
  };
}

/** Temporary negative id for optimistic messages. */
let tempId = -1;
function makeOptimistic(type: ChatMessage['type'], content: string, result?: RollResult, title?: string): ChatMessage {
  return { id: tempId--, type, title, content, result, created_at: new Date().toISOString() };
}

// ── Constants ──────────────────────────────────────────────────────────────

const DIE_SIZES = [4, 6, 8, 10, 12] as const;
type DieSize = (typeof DIE_SIZES)[number];

type DieCounts = Record<DieSize, number>;
const EMPTY_COUNTS = (): DieCounts => ({ 4: 0, 6: 0, 8: 0, 10: 0, 12: 0 });

// ── Roll command regex ─────────────────────────────────────────────────────
// /r or /roll followed by a dice expression
const ROLL_RE = /^\/r(?:oll)?\s+(.+)$/i;

// ── Sub-components ─────────────────────────────────────────────────────────

/** Single chat message bubble. */
function MsgBubble({ msg }: { msg: ChatMessage }) {
  if (msg.type === 'text') {
    return (
      <div style={bubbleStyle}>
        <span style={{ color: '#aaa', fontSize: 12 }}>{msg.content}</span>
      </div>
    );
  }

  const { result } = msg;

  // ─ Attack summary card (no dice breakdown, but has a title) ─
  if (!result) {
    return (
      <div style={{ ...bubbleStyle, background: '#13132a', border: '1px solid #3a3a6a', padding: 0, overflow: 'hidden' }}>
        {msg.title && (
          <div style={{
            background: '#1a1a3a', borderBottom: '1px solid #3a3a6a',
            padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 10, color: '#7b8cde', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              ⚔ {msg.title}
            </span>
          </div>
        )}
        <div style={{ padding: '8px 10px', color: '#aaa', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {msg.content}
        </div>
      </div>
    );
  }

  // ─ Dice roll card (has full breakdown) ─
  return (
    <div style={{ ...bubbleStyle, background: '#13132a', border: '1px solid #3a3a6a', padding: 0, overflow: 'hidden' }}>
      {/* Nameplate (optional — present if this roll was triggered by an attack) */}
      {msg.title && (
        <div style={{
          background: '#1a1a3a',
          borderBottom: '1px solid #3a3a6a',
          padding: '5px 10px',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 10, color: '#7b8cde', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            ⚔ {msg.title}
          </span>
        </div>
      )}

      <div style={{ padding: '8px 10px' }}>
        {/* Expression header */}
        <div style={{ color: '#7b8cde', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
          🎲 {result.expression}
        </div>

      {/* Per-term breakdown */}
      <div style={{ fontSize: 11, color: '#888', lineHeight: 1.6 }}>
        {result.breakdown.map((roll, i) => {
          const { term, rolls } = roll;
          const signChar = term.sign === -1 ? '−' : i === 0 ? '' : '+';

          if (term.sides === 1) {
            // Flat constant
            return (
              <div key={i}>
                <span style={{ color: '#666' }}>{signChar} {term.count}</span>
              </div>
            );
          }

          const sum = rolls.reduce((a, b) => a + b, 0);
          return (
            <div key={i} style={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
              <span style={{ color: '#666', minWidth: 16 }}>{signChar}</span>
              <span style={{ color: '#aaa' }}>{term.count}d{term.sides}</span>
              <span style={{ color: '#555' }}> → </span>
              {rolls.map((r, j) => (
                <span
                  key={j}
                  style={{
                    background: r === term.sides ? '#5a3a1a' : r === 1 ? '#3a1a2a' : '#1e1e3a',
                    color: r === term.sides ? '#f9a825' : r === 1 ? '#f38ba8' : '#cdd6f4',
                    borderRadius: 3,
                    padding: '0 4px',
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: '18px',
                  }}
                >{r}</span>
              ))}
              <span style={{ color: '#666' }}>= {term.sign * sum}</span>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div style={{ borderTop: '1px solid #2a2a4a', marginTop: 5, paddingTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#666', fontSize: 11 }}>Total</span>
        <span style={{ color: '#f1c40f', fontSize: 18, fontWeight: 800 }}>{result.total}</span>
      </div>

      {/* Below-roll content line (targets, conditions, etc.) */}
      {msg.content && (
        <div style={{ marginTop: 6, paddingTop: 5, borderTop: '1px solid #2a2a4a', color: '#888', fontSize: 11, lineHeight: 1.5 }}>
          {msg.content}
        </div>
      )}
      </div>
    </div>
  );
}

/** Dice picker popup — shows die rows + modifier + Roll button. */
interface DicePickerProps {
  onRoll: (expr: string) => void;
  onClose: () => void;
}

function DicePicker({ onRoll, onClose }: DicePickerProps) {
  const [counts, setCounts] = useState<DieCounts>(EMPTY_COUNTS());
  const [modifier, setModifier] = useState(0);

  const adjust = (die: DieSize, delta: number) =>
    setCounts(c => ({ ...c, [die]: Math.max(0, c[die] + delta) }));

  const hasAny = DIE_SIZES.some(d => counts[d] > 0) || modifier !== 0;

  const handleRoll = () => {
    const expr = buildExpression(counts as unknown as Partial<Record<number, number>>, modifier);
    onRoll(expr);
    onClose();
  };

  return (
    <div style={pickerStyle}>
      {DIE_SIZES.map(die => (
        <div key={die} style={pickerRowStyle}>
          <span style={{ color: '#7b8cde', fontSize: 11, fontWeight: 700, width: 28 }}>d{die}</span>
          <button style={pickerBtnStyle} onClick={() => adjust(die, -1)} disabled={counts[die] === 0}>−</button>
          <span style={{ color: '#cdd6f4', fontSize: 13, fontWeight: 700, width: 18, textAlign: 'center' }}>{counts[die]}</span>
          <button style={pickerBtnStyle} onClick={() => adjust(die, 1)}>+</button>
        </div>
      ))}

      {/* Modifier */}
      <div style={{ ...pickerRowStyle, marginTop: 4, borderTop: '1px solid #2a2a4a', paddingTop: 6 }}>
        <span style={{ color: '#aaa', fontSize: 11, width: 28 }}>+/−</span>
        <button style={pickerBtnStyle} onClick={() => setModifier(m => m - 1)}>−</button>
        <span style={{ color: modifier < 0 ? '#f38ba8' : modifier > 0 ? '#a6e3a1' : '#666', fontSize: 13, fontWeight: 700, width: 18, textAlign: 'center' }}>
          {modifier}
        </span>
        <button style={pickerBtnStyle} onClick={() => setModifier(m => m + 1)}>+</button>
      </div>

      <button
        style={{ ...rollBtnStyle, opacity: hasAny ? 1 : 0.4 }}
        disabled={!hasAny}
        onClick={handleRoll}
      >
        Roll
      </button>
    </div>
  );
}

// ── Imperative handle ──────────────────────────────────────────────────────

export interface ChatHandle {
  /** Add a message immediately (optimistic) and persist it to the server. */
  push: (msg: Pick<ChatMessage, 'type' | 'title' | 'content' | 'result'>) => void;
}

// ── Main Chat component ────────────────────────────────────────────────────

export const Chat = React.forwardRef<ChatHandle>(function Chat(_props, ref) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load persisted messages on mount
  useEffect(() => {
    fetch(`${API}/api/chat`)
      .then(r => r.json())
      .then((rows: Record<string, unknown>[]) => {
        setMessages(rows.map(rowToMsg));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /** POST a message to the API; replaces the optimistic entry with the confirmed DB row. */
  const persistMsg = async (optimistic: ChatMessage) => {
    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:    optimistic.type,
          title:   optimistic.title ?? null,
          content: optimistic.content,
          result:  optimistic.result ?? null,
        }),
      });
      if (!res.ok) return;
      const saved = rowToMsg(await res.json());
      setMessages(prev => prev.map(m => m.id === optimistic.id ? saved : m));
    } catch { /* keep optimistic on network failure */ }
  };

  const push = (msg: Pick<ChatMessage, 'type' | 'title' | 'content' | 'result'>) => {
    const optimistic = makeOptimistic(msg.type, msg.content, msg.result, msg.title);
    setMessages(prev => [...prev, optimistic]);
    persistMsg(optimistic);
  };

  useImperativeHandle(ref, () => ({ push }));

  const handleRollExpr = (expr: string) => {
    const result = rollExpression(expr);
    if (!result) {
      push({ type: 'text', content: `⚠ Could not parse: "${expr}"` });
      return;
    }
    push({ type: 'roll', content: expr, result });
  };

  const handleSubmit = () => {
    const raw = input.trim();
    if (!raw) return;
    setInput('');

    const rollMatch = raw.match(ROLL_RE);
    if (rollMatch) {
      handleRollExpr(rollMatch[1].trim());
    } else {
      push({ type: 'text', content: raw });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') setPickerOpen(false);
  };

  return (
    <div style={chatStyle}>
      {/* Message list */}
      <div style={msgListStyle}>
        {loading && <p style={{ color: '#444', fontSize: 12, textAlign: 'center', marginTop: 16 }}>Loading…</p>}
        {!loading && messages.length === 0 && (
          <p style={{ color: '#444', fontSize: 12, textAlign: 'center', marginTop: 16 }}>Type /r 2d6+5 or use the 🎲 button.</p>
        )}
        {messages.map(msg => <MsgBubble key={msg.id} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Dice picker (appears above input) */}
      {pickerOpen && (
        <DicePicker
          onRoll={handleRollExpr}
          onClose={() => { setPickerOpen(false); inputRef.current?.focus(); }}
        />
      )}

      {/* Input bar */}
      <div style={inputBarStyle}>
        <button
          style={{ ...diceToggleStyle, background: pickerOpen ? '#3a3a7a' : '#1e1e3a' }}
          onClick={() => setPickerOpen(o => !o)}
          title="Open dice picker"
        >
          🎲
        </button>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="/r 2d6 + 5"
          style={inputStyle}
        />
        <button style={sendBtnStyle} onClick={handleSubmit} title="Send">
          ▶
        </button>
      </div>
    </div>
  );
});

// ── Styles ─────────────────────────────────────────────────────────────────

const chatStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minHeight: 0,
};

const msgListStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '8px 6px',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const bubbleStyle: React.CSSProperties = {
  background: '#1a1a2e',
  borderRadius: 5,
  padding: '6px 8px',
  border: '1px solid #2a2a4a',
  wordBreak: 'break-word',
};

const inputBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  padding: '6px 6px 8px',
  borderTop: '1px solid #2a2a4a',
  flexShrink: 0,
  background: '#0a0a1a',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: '#1a1a2e',
  border: '1px solid #2a2a4a',
  borderRadius: 4,
  color: '#cdd6f4',
  fontSize: 12,
  padding: '4px 6px',
  outline: 'none',
  minWidth: 0,
};

const diceToggleStyle: React.CSSProperties = {
  border: '1px solid #2a2a4a',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 14,
  lineHeight: 1,
  padding: '3px 5px',
  flexShrink: 0,
};

const sendBtnStyle: React.CSSProperties = {
  background: '#3a3a6a',
  border: 'none',
  borderRadius: 4,
  color: '#cdd6f4',
  cursor: 'pointer',
  fontSize: 12,
  padding: '4px 7px',
  flexShrink: 0,
};

// Dice picker popup styles
const pickerStyle: React.CSSProperties = {
  background: '#12122a',
  border: '1px solid #3a3a7a',
  borderRadius: 6,
  padding: '10px',
  margin: '0 6px 4px',
  flexShrink: 0,
};

const pickerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 4,
};

const pickerBtnStyle: React.CSSProperties = {
  background: '#2a2a4a',
  border: '1px solid #3a3a6a',
  borderRadius: 3,
  color: '#cdd6f4',
  cursor: 'pointer',
  fontSize: 13,
  lineHeight: 1,
  padding: '1px 7px',
};

const rollBtnStyle: React.CSSProperties = {
  marginTop: 6,
  width: '100%',
  background: '#3a3a7a',
  border: 'none',
  borderRadius: 4,
  color: '#cdd6f4',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 13,
  padding: '5px 0',
};
