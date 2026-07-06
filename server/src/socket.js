import { getSessionState } from './lib/sessionState.js';

export function registerSocketHandlers(io, db) {
  io.on('connection', (socket) => {
    socket.emit('server:ready', {
      message: 'Project.Quiz socket server is ready',
    });

    socket.on('session:watch', ({ roomCode }) => {
      if (!roomCode) {
        return;
      }

      const normalizedRoomCode = roomCode.toUpperCase();
      socket.join(`room:${normalizedRoomCode}`);

      const state = getSessionState(db, normalizedRoomCode);

      if (state) {
        socket.emit('session:update', state);
      }
    });
  });
}
