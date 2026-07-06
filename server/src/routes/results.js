import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';

function getParticipants(db, sessionId) {
  return db
    .prepare(
      `select id, guest_name as name, score, joined_at
       from session_participants
       where session_id = ?
       order by score desc, joined_at asc`,
    )
    .all(sessionId);
}

function mapSession(row, participants) {
  const winner = participants[0] || null;

  return {
    id: row.id,
    roomCode: row.room_code,
    status: row.status,
    quizTitle: row.title,
    category: row.category,
    participantCount: participants.length,
    winnerName: winner?.name || '',
    topScore: winner?.score || 0,
    ownScore: row.own_score ?? null,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  };
}

function canReadSession(db, roomCode, user) {
  if (user.role === 'organizer') {
    return db
      .prepare(
        `select quiz_sessions.id
         from quiz_sessions
         join quizzes on quizzes.id = quiz_sessions.quiz_id
         where quiz_sessions.room_code = ? and quizzes.organizer_id = ?`,
      )
      .get(roomCode, user.id);
  }

  return db
    .prepare(
      `select quiz_sessions.id
       from quiz_sessions
       join session_participants on session_participants.session_id = quiz_sessions.id
       where quiz_sessions.room_code = ? and session_participants.user_id = ?`,
    )
    .get(roomCode, user.id);
}

export function createResultRouter(db) {
  const router = Router();

  router.use(requireAuth);

  router.get('/', (req, res) => {
    const rows =
      req.user.role === 'organizer'
        ? db
            .prepare(
              `select
                quiz_sessions.id,
                quiz_sessions.room_code,
                quiz_sessions.status,
                quiz_sessions.created_at,
                quiz_sessions.finished_at,
                quizzes.title,
                quizzes.category,
                null as own_score
               from quiz_sessions
               join quizzes on quizzes.id = quiz_sessions.quiz_id
               where quizzes.organizer_id = ?
               order by quiz_sessions.created_at desc`,
            )
            .all(req.user.id)
        : db
            .prepare(
              `select
                quiz_sessions.id,
                quiz_sessions.room_code,
                quiz_sessions.status,
                quiz_sessions.created_at,
                quiz_sessions.finished_at,
                quizzes.title,
                quizzes.category,
                session_participants.score as own_score
               from session_participants
               join quiz_sessions on quiz_sessions.id = session_participants.session_id
               join quizzes on quizzes.id = quiz_sessions.quiz_id
               where session_participants.user_id = ?
               order by quiz_sessions.created_at desc`,
            )
            .all(req.user.id);

    const results = rows.map((row) => mapSession(row, getParticipants(db, row.id)));

    return res.json({ results });
  });

  router.get('/:roomCode', (req, res) => {
    const roomCode = req.params.roomCode.toUpperCase();
    const allowedSession = canReadSession(db, roomCode, req.user);

    if (!allowedSession) {
      return res.status(404).json({ message: 'Результаты не найдены' });
    }

    const row = db
      .prepare(
        `select
          quiz_sessions.id,
          quiz_sessions.room_code,
          quiz_sessions.status,
          quiz_sessions.created_at,
          quiz_sessions.finished_at,
          quizzes.title,
          quizzes.category,
          null as own_score
         from quiz_sessions
         join quizzes on quizzes.id = quiz_sessions.quiz_id
         where quiz_sessions.room_code = ?`,
      )
      .get(roomCode);
    const participants = getParticipants(db, row.id);

    return res.json({
      result: {
        ...mapSession(row, participants),
        participants,
      },
    });
  });

  return router;
}
