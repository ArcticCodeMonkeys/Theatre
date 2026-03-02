import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthGate } from './ui/AuthGate';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthGate>
      {user => <App user={user} />}
    </AuthGate>
  </React.StrictMode>
);
