import React, { useState } from 'react';
import { AppUser } from '../types/user';

const API = 'http://localhost:3001';

interface Props {
  user: AppUser;
  onDone: (username: string) => void;
}

export function UsernameModal({ user, onDone }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed) { setError('Please enter a username.'); return; }
    if (trimmed.length < 2) { setError('Username must be at least 2 characters.'); return; }
    if (!/^[a-zA-Z0-9_\- ]+$/.test(trimmed)) {
      setError('Only letters, numbers, spaces, _ and - allowed.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/me/username`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Failed to save username.');
        setSaving(false);
        return;
      }
      onDone(trimmed);
    } catch {
      setError('Network error. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 16 }}>👤</div>
        <h2 style={{ margin: '0 0 6px', textAlign: 'center', color: '#cdd6f4', fontSize: 20, fontWeight: 800 }}>
          Welcome to Theatre
        </h2>
        <p style={{ margin: '0 0 24px', textAlign: 'center', color: '#888', fontSize: 13 }}>
          Signed in as {user.email}.<br />Choose a display name for the table.
        </p>

        <input
          autoFocus
          value={value}
          maxLength={32}
          onChange={e => { setValue(e.target.value); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="Display name…"
          style={inputStyle}
        />

        {error && (
          <div style={{ color: '#f38ba8', fontSize: 12, marginTop: 6 }}>{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving || !value.trim()}
          style={{ ...btnStyle, opacity: saving || !value.trim() ? 0.5 : 1, marginTop: 16 }}
        >
          {saving ? 'Saving…' : 'Enter the table →'}
        </button>
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 99999,
  background: 'rgba(0,0,0,0.85)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'system-ui, sans-serif',
};

const cardStyle: React.CSSProperties = {
  background: '#13132a',
  border: '1px solid #2a2a4a',
  borderRadius: 12,
  padding: '36px 40px',
  width: 340,
  boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0d0d1a',
  border: '1px solid #3a3a6a',
  borderRadius: 6,
  color: '#cdd6f4',
  fontSize: 15,
  padding: '10px 12px',
  boxSizing: 'border-box',
  outline: 'none',
};

const btnStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px',
  background: '#7b8cde',
  border: 'none',
  borderRadius: 6,
  color: '#fff',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
};
