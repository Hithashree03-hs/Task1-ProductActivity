import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'https://task1-productactivity.onrender.com';

let socket: Socket | null = null;

export const connectSocket = (
  token: string
): Socket => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log(
      'Socket.IO connected:',
      socket?.id
    );
  });

  socket.on('connect_error', (error) => {
    console.error(
      'Socket.IO connection error:',
      error.message
    );
  });

  socket.on('disconnect', (reason) => {
    console.log(
      'Socket.IO disconnected:',
      reason
    );
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
