import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
}

let io: Server | null = null;

export const initializeSocket = (
  httpServer: any
): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(
          new Error('Authentication token required')
        );
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET ||
          'task1_super_secret_change_later'
      ) as JwtPayload;

      socket.data.userId = decoded.userId;

      next();
    } catch (error) {
      next(
        new Error(
          'Invalid or expired authentication token'
        )
      );
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;

    socket.join(`user:${userId}`);

    console.log(
      `Socket connected for user: ${userId}`
    );

    socket.on('disconnect', () => {
      console.log(
        `Socket disconnected for user: ${userId}`
      );
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error(
      'Socket.IO has not been initialized'
    );
  }

  return io;
};