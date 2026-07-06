import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, verifyAuthToken } from '../lib/auth.js';
import { emitSessionState, getSessionByCode, getSessionState } from '../lib/sessionState.js';

const createSessionSchema = z.object({
  quizId: z.coerce.number().int().positive(),
});

const joinSchema = z.object({
  name: z.string().trim().min(2, 'Введите имя участника'),
});

const answerSchema = z.object({
  participantId: z.coerce.number().int().positive(),
  answerIds: z.array(z.coerce.number().int().positive()).min(1, 'Выберите ответ'),
});

function sendZodError(res, error) {
  const issue = error.issues?.[0];
  return res.status(400).json({
    message: issue?.message || 'Проверьте данные',
  });
}

function requireOrganizer(req, res, next) {
  if (req.user.role !== 'organizer') {
    return res.status(403).json({ message: 'Доступно только организатору' });
  }

  return next();
}

function getOptionalUser(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return null;
  }

  try {
    return verifyAuthToken(token);
  } catch {
    return null;
  }
}

function generateRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function createUniqueRoomCode(db) {
  let roomCode = generateRoomCode();

  while (db.prepare('select id from quiz_sessions where room_code = ?').get(roomCode)) {
    roomCode = generateRoomCode();
  }

  return roomCode;
}

function getOwnedSession(db, roomCode, organizerId) {
  return db
    .prepare(
      `select quiz_sessions.*
       from quiz_sessions
       join quizzes on quizzes.id = quiz_sessions.quiz_id
       where quiz_sessions.room_code = ? and quizzes.organizer_id = ?`,
    )
    .get(roomCode.toUpperCase(), organizerId);
}

function getQuestionIds(db, quizId) {
  return db
    .prepare('select id from questions where quiz_id = ? order by position')
    .all(quizId)
    .map((question) => question.id);
}

function isAnswerCorrect(db, questionId, answerIds) {
  const correctAnswerIds = db
    .prepare('select id from answers where question_id = ? and is_correct = 1 order by id')
    .all(questionId)
    .map((answer) => answer.id);
  const selectedIds = [...answerIds].sort((left, right) => left - right);

  return (
    selectedIds.length === correctAnswerIds.length &&
    selectedIds.every((answerId, index) => answerId === correctAnswerIds[index])
  );
}

function isQuestionExpired(session) {
  const startedAt = session.current_question_started_at || session.started_at;

  if (!startedAt) {
    return false;
  }

  const elapsedSeconds = Math.floor((Date.now() - new Date(`${startedAt}Z`).getTime()) / 1000);
  return elapsedSeconds >= session.time_limit_seconds;
}

export function createSessionRouter(db, io) {
  const router = Router();

  router.post('/', requireAuth, requireOrganizer, (req, res) => {
    const parsed = createSessionSchema.safeParse(req.body);

    if (!parsed.success) {
      return sendZodError(res, parsed.error);
    }

    const quiz = db
      .prepare(
        `select id, title, status
         from quizzes
         where id = ? and organizer_id = ?`,
      )
      .get(parsed.data.quizId, req.user.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Квиз не найден' });
    }

    if (quiz.status !== 'ready') {
      return res.status(409).json({ message: 'Запускать можно только готовый квиз' });
    }

    const roomCode = createUniqueRoomCode(db);

    db.prepare('insert into quiz_sessions (quiz_id, room_code, status) values (?, ?, ?)')
      .run(quiz.id, roomCode, 'waiting');

    return res.status(201).json({ session: getSessionState(db, roomCode) });
  });

  router.get('/:roomCode', (req, res) => {
    const state = getSessionState(db, req.params.roomCode);

    if (!state) {
      return res.status(404).json({ message: 'Комната не найдена' });
    }

    return res.json({ session: state });
  });

  router.post('/:roomCode/join', (req, res) => {
    const parsed = joinSchema.safeParse(req.body);

    if (!parsed.success) {
      return sendZodError(res, parsed.error);
    }

    const session = getSessionByCode(db, req.params.roomCode);

    if (!session) {
      return res.status(404).json({ message: 'Комната не найдена' });
    }

    if (session.status === 'finished') {
      return res.status(409).json({ message: 'Квиз уже завершен' });
    }

    const authUser = getOptionalUser(req);
    const existingParticipant = authUser
      ? db
          .prepare(
            `select id, guest_name, score
             from session_participants
             where session_id = ? and user_id = ?`,
          )
          .get(session.id, authUser.id)
      : db
          .prepare(
            `select id, guest_name, score
             from session_participants
             where session_id = ? and guest_name = ?`,
          )
          .get(session.id, parsed.data.name);

    const participantId =
      existingParticipant?.id ||
      db
        .prepare('insert into session_participants (session_id, user_id, guest_name) values (?, ?, ?)')
        .run(session.id, authUser?.id || null, parsed.data.name).lastInsertRowid;

    const state = emitSessionState(io, db, session.room_code);

    return res.status(201).json({
      participant: {
        id: participantId,
        name: parsed.data.name,
      },
      session: state,
    });
  });

  router.post('/:roomCode/start', requireAuth, requireOrganizer, (req, res) => {
    const session = getOwnedSession(db, req.params.roomCode, req.user.id);

    if (!session) {
      return res.status(404).json({ message: 'Комната не найдена' });
    }

    if (session.status !== 'waiting') {
      return res.status(409).json({ message: 'Квиз уже запущен' });
    }

    const [firstQuestionId] = getQuestionIds(db, session.quiz_id);

    if (!firstQuestionId) {
      return res.status(409).json({ message: 'В квизе нет вопросов' });
    }

    db.prepare(
      `update quiz_sessions
       set status = 'active',
           current_question_id = ?,
           current_question_started_at = current_timestamp,
           started_at = current_timestamp
       where id = ?`,
    ).run(firstQuestionId, session.id);

    return res.json({ session: emitSessionState(io, db, session.room_code) });
  });

  router.post('/:roomCode/next', requireAuth, requireOrganizer, (req, res) => {
    const session = getOwnedSession(db, req.params.roomCode, req.user.id);

    if (!session) {
      return res.status(404).json({ message: 'Комната не найдена' });
    }

    if (session.status !== 'active') {
      return res.status(409).json({ message: 'Квиз не активен' });
    }

    const questionIds = getQuestionIds(db, session.quiz_id);
    const currentIndex = questionIds.indexOf(session.current_question_id);
    const nextQuestionId = questionIds[currentIndex + 1];

    if (nextQuestionId) {
      db.prepare(
        `update quiz_sessions
         set current_question_id = ?, current_question_started_at = current_timestamp
         where id = ?`,
      )
        .run(nextQuestionId, session.id);
    } else {
      db.prepare(
        `update quiz_sessions
         set status = 'finished',
             current_question_id = null,
             current_question_started_at = null,
             finished_at = current_timestamp
         where id = ?`,
      ).run(session.id);
    }

    return res.json({ session: emitSessionState(io, db, session.room_code) });
  });

  router.post('/:roomCode/answers', (req, res) => {
    const parsed = answerSchema.safeParse(req.body);

    if (!parsed.success) {
      return sendZodError(res, parsed.error);
    }

    const session = getSessionByCode(db, req.params.roomCode);

    if (!session) {
      return res.status(404).json({ message: 'Комната не найдена' });
    }

    if (session.status !== 'active' || !session.current_question_id) {
      return res.status(409).json({ message: 'Сейчас нет активного вопроса' });
    }

    if (isQuestionExpired(session)) {
      emitSessionState(io, db, session.room_code);
      return res.status(409).json({ message: 'Время на ответ истекло' });
    }

    const participant = db
      .prepare(
        `select id
         from session_participants
         where id = ? and session_id = ?`,
      )
      .get(parsed.data.participantId, session.id);

    if (!participant) {
      return res.status(404).json({ message: 'Участник не найден в комнате' });
    }

    const existingAnswer = db
      .prepare(
        `select id
         from participant_answers
         where session_participant_id = ? and question_id = ?
         limit 1`,
      )
      .get(participant.id, session.current_question_id);

    if (existingAnswer) {
      return res.status(409).json({ message: 'Ответ уже принят' });
    }

    const submitAnswer = db.transaction(() => {
      const insertAnswer = db.prepare(
        `insert into participant_answers (session_participant_id, question_id, answer_id)
         values (?, ?, ?)`,
      );

      parsed.data.answerIds.forEach((answerId) => {
        insertAnswer.run(participant.id, session.current_question_id, answerId);
      });

      const correct = isAnswerCorrect(db, session.current_question_id, parsed.data.answerIds);

      if (correct) {
        db.prepare('update session_participants set score = score + 100 where id = ?')
          .run(participant.id);
      }

      return correct;
    });

    const correct = submitAnswer();

    return res.status(201).json({
      correct,
      session: emitSessionState(io, db, session.room_code),
    });
  });

  return router;
}
