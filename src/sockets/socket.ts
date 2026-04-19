import { io, Socket } from 'socket.io-client';

const socket: Socket = io(import.meta.env.VITE_API_URL, {
  transports:      ['websocket'],
  withCredentials: true,
  autoConnect:     false   // connect manually after login
});

export default socket;