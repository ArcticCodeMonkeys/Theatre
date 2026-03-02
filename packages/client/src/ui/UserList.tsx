import React from 'react';
import { AppUser } from '../types/user';

const API = 'http://localhost:3001';

export interface OnlineUser {
  id: number;
  username: string;
  avatar_url: string | null;
}

interface Props {
  users: OnlineUser[];
  self: AppUser;
}

export function UserList({ users, self }: Props) {
  if (users.length === 0) return null;
  return (
    <div style={containerStyle}>
      {users.map(u => (
        <div key={u.id} style={userRowStyle} title={u.username}>
          {u.avatar_url ? (
            <img
              src={u.avatar_url}
              style={avatarStyle}
              referrerPolicy="no-referrer"
              alt={u.username}
            />
          ) : (
            <div style={{ ...avatarStyle, background: '#2a2a4a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#7b8cde' }}>
              {u.username[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <span style={{ color: u.id === self.id ? '#a6e3a1' : '#cdd6f4', fontSize: 11, fontWeight: u.id === self.id ? 700 : 400, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {u.username}{u.id === self.id ? ' (you)' : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 12,
  left: 12,
  zIndex: 500,
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  pointerEvents: 'none',
};

const userRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  background: 'rgba(13,13,26,0.82)',
  border: '1px solid #2a2a4a',
  borderRadius: 20,
  padding: '3px 10px 3px 3px',
  backdropFilter: 'blur(4px)',
  maxWidth: 160,
};

const avatarStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: '50%',
  objectFit: 'cover',
  flexShrink: 0,
};
