import { io, Socket } from 'socket.io-client';

// Single shared socket connection used by the whole client.
const socket: Socket = io('http://localhost:3001', {
  withCredentials: true,
  autoConnect: true,
});

export default socket;
