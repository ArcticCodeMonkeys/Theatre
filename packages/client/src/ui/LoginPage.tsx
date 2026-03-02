import React from 'react';

const API = 'http://localhost:3001';

interface Props {
  error?: boolean;
}

export function LoginPage({ error }: Props) {
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Logo / title */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎭</div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#cdd6f4', letterSpacing: '-0.02em' }}>
            Theatre
          </h1>
          <p style={{ margin: '8px 0 0', color: '#888', fontSize: 14 }}>
            Virtual Tabletop for Ruin
          </p>
        </div>

        {error && (
          <div style={errorBannerStyle}>
            Sign-in failed. Please try again.
          </div>
        )}

        <a href={`${API}/auth/google`} style={googleBtnStyle}>
          <GoogleIcon />
          <span>Sign in with Google</span>
        </a>

        <p style={{ margin: '20px 0 0', color: '#555', fontSize: 11, textAlign: 'center' }}>
          Your session is stored locally. No personal data is shared beyond your Google profile.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.797 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#0d0d1a',
  fontFamily: 'system-ui, sans-serif',
};

const cardStyle: React.CSSProperties = {
  background: '#13132a',
  border: '1px solid #2a2a4a',
  borderRadius: 12,
  padding: '40px 48px',
  width: 360,
  boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
};

const googleBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  width: '100%',
  padding: '12px 20px',
  background: '#fff',
  color: '#333',
  border: 'none',
  borderRadius: 6,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
  boxSizing: 'border-box',
  transition: 'background 0.15s',
};

const errorBannerStyle: React.CSSProperties = {
  background: '#3a1a1a',
  border: '1px solid #f38ba840',
  color: '#f38ba8',
  borderRadius: 6,
  padding: '10px 14px',
  fontSize: 13,
  marginBottom: 16,
  textAlign: 'center',
};
