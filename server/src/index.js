import 'dotenv/config';
import http from 'node:http';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import { initDatabase } from './lib/database.js';

const port = Number(process.env.PORT || 4000);
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: clientOrigin,
  },
});

const db = initDatabase();

app.use(cors({ origin: clientOrigin }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  const row = db.prepare('select count(*) as count from users').get();

  res.json({
    status: 'ok',
    app: 'PulseQuiz',
    database: 'sqlite',
    usersTableRows: row.count,
  });
});

io.on('connection', (socket) => {
  socket.emit('server:ready', {
    message: 'PulseQuiz socket server is ready',
  });
});

server.listen(port, () => {
  console.log(`PulseQuiz API listening on http://localhost:${port}`);
});
