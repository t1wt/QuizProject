import { io } from 'socket.io-client';

export function createRoomSocket(roomCode, onUpdate) {
  const socket = io('/', {
    path: '/socket.io',
  });

  socket.on('connect', () => {
    socket.emit('session:watch', { roomCode });
  });

  socket.on('session:update', onUpdate);

  return socket;
}
