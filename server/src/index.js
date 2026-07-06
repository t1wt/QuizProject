import 'dotenv/config';
import http from 'node:http';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import { initDatabase } from './lib/database.js';
import { createAuthRouter } from './routes/auth.js';
import { createQuizRouter } from './routes/quizzes.js';
import { createResultRouter } from './routes/results.js';
import { createSessionRouter } from './routes/sessions.js';
import { registerSocketHandlers } from './socket.js';

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

app.use('/api/auth', createAuthRouter(db));
app.use('/api/quizzes', createQuizRouter(db));
app.use('/api/results', createResultRouter(db));
app.use('/api/sessions', createSessionRouter(db, io));

app.get('/api/health', (req, res) => {
  const row = db.prepare('select count(*) as count from users').get();

  res.json({
    status: 'ok',
    app: 'Project.Quiz',
    database: 'sqlite',
    usersTableRows: row.count,
  });
});

registerSocketHandlers(io, db);

server.listen(port, () => {
  console.log(`Project.Quiz API listening on http://localhost:${port}`);
});
