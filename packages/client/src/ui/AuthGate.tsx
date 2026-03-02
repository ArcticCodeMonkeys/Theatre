import React, { useEffect, useState } from 'react';
import { AppUser } from '../types/user';
import { LoginPage } from './LoginPage';
import { UsernameModal } from './UsernameModal';

const API = 'http://localhost:3001';

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated'; error?: boolean }
  | { status: 'needs-username'; user: AppUser }
  | { status: 'ready'; user: AppUser };

interface Props {
  children: (user: AppUser) => React.ReactNode;
}

export function AuthGate({ children }: Props) {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasError = params.get('error') === '1';

    fetch(`${API}/auth/me`, { credentials: 'include' })
      .then(res => {
        if (res.status === 401) {
          setAuth({ status: 'unauthenticated', error: hasError });
          return null;
        }
        return res.json() as Promise<AppUser>;
      })
      .then(user => {
        if (!user) return;
        if (!user.username) {
          setAuth({ status: 'needs-username', user });
        } else {
          setAuth({ status: 'ready', user });
        }
      })
      .catch(() => setAuth({ status: 'unauthenticated', error: hasError }));
  }, []);

  if (auth.status === 'loading') {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0d0d1a', color: '#555', fontFamily: 'system-ui',
        fontSize: 14,
      }}>
        Loading…
      </div>
    );
  }

  if (auth.status === 'unauthenticated') {
    return <LoginPage error={auth.error} />;
  }

  if (auth.status === 'needs-username') {
    return (
      <UsernameModal
        user={auth.user}
        onDone={username => setAuth({ status: 'ready', user: { ...auth.user, username } })}
      />
    );
  }

  // status === 'ready'
  return <>{children(auth.user)}</>;
}
