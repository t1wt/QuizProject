import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth.js';

const answerSchema = z.object({
  text: z.string().trim().min(1, 'Заполните все варианты ответов'),
  isCorrect: z.boolean(),
});

const questionSchema = z.object({
  text: z.string().trim().min(3, 'Введите текст вопроса'),
  imageUrl: z.string().trim().optional().default(''),
  type: z.enum(['single', 'multiple']),
  answers: z.array(answerSchema).min(2, 'Добавьте минимум два варианта ответа'),
});

const quizSchema = z.object({
  title: z.string().trim().min(3, 'Введите название квиза'),
  category: z.string().trim().min(2, 'Введите категорию'),
  timeLimitSeconds: z.coerce.number().int().min(10).max(300),
  flowMode: z.enum(['host_controlled', 'self_paced']).default('host_controlled'),
  pointsPerQuestion: z.coerce.number().int().min(0).max(10000).default(100),
  rules: z.string().trim().min(5, 'Добавьте короткие правила'),
  status: z.enum(['draft', 'ready']).default('draft'),
  questions: z.array(questionSchema).min(1, 'Добавьте хотя бы один вопрос'),
});

function sendZodError(res, error) {
  const issue = error.issues?.[0];
  return res.status(400).json({
    message: issue?.message || 'Проверьте данные формы',
  });
}

function requireOrganizer(req, res, next) {
  if (req.user.role !== 'organizer') {
    return res.status(403).json({ message: 'Доступно только организатору' });
  }

  return next();
}

function statusLabel(status) {
  const labels = {
    draft: 'Черновик',
    ready: 'Готов к запуску',
    completed: 'Проведен',
  };

  return labels[status] || status;
}

function validateQuestionAnswers(questions) {
  for (const question of questions) {
    const correctCount = question.answers.filter((answer) => answer.isCorrect).length;

    if (question.type === 'single' && correctCount !== 1) {
      return 'Для вопроса с одним выбором отметьте один правильный ответ';
    }

    if (question.type === 'multiple' && correctCount < 1) {
      return 'Для вопроса с несколькими ответами отметьте правильные варианты';
    }
  }

  return '';
}

function mapQuiz(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    status: row.status,
    statusLabel: statusLabel(row.status),
    questions: row.questions,
    participants: row.participants,
    createdAt: row.created_at,
  };
}

function findOwnedQuiz(db, quizId, organizerId) {
  return db
    .prepare(
      `select
        id,
        organizer_id,
        title,
        category,
        status,
        time_limit_seconds,
        flow_mode,
        points_per_question,
        rules,
        created_at
       from quizzes
       where id = ? and organizer_id = ?`,
    )
    .get(quizId, organizerId);
}

function getQuizDetails(db, quizId, organizerId) {
  const quiz = findOwnedQuiz(db, quizId, organizerId);

  if (!quiz) {
    return null;
  }

  const questions = db
    .prepare(
      `select id, text, image_url, type, position
       from questions
       where quiz_id = ?
       order by position`,
    )
    .all(quiz.id);

  const answersStatement = db.prepare(
    `select id, text, is_correct, position
     from answers
     where question_id = ?
     order by position`,
  );

  return {
    id: quiz.id,
    title: quiz.title,
    category: quiz.category,
    status: quiz.status,
    statusLabel: statusLabel(quiz.status),
    timeLimitSeconds: quiz.time_limit_seconds,
    flowMode: quiz.flow_mode,
    pointsPerQuestion: quiz.points_per_question,
    rules: quiz.rules,
    questions: questions.map((question) => ({
      id: question.id,
      text: question.text,
      imageUrl: question.image_url || '',
      type: question.type,
      answers: answersStatement.all(question.id).map((answer) => ({
        id: answer.id,
        text: answer.text,
        isCorrect: Boolean(answer.is_correct),
      })),
    })),
  };
}

function insertQuestions(db, quizId, questions) {
  const insertQuestion = db.prepare(
    `insert into questions (quiz_id, text, image_url, type, position)
     values (?, ?, ?, ?, ?)`,
  );
  const insertAnswer = db.prepare(
    `insert into answers (question_id, text, is_correct, position)
     values (?, ?, ?, ?)`,
  );

  questions.forEach((question, questionIndex) => {
    const questionResult = insertQuestion.run(
      quizId,
      question.text,
      question.imageUrl || null,
      question.type,
      questionIndex + 1,
    );

    question.answers.forEach((answer, answerIndex) => {
      insertAnswer.run(
        questionResult.lastInsertRowid,
        answer.text,
        answer.isCorrect ? 1 : 0,
        answerIndex + 1,
      );
    });
  });
}

export function createQuizRouter(db) {
  const router = Router();

  router.use(requireAuth);

  router.get('/', requireOrganizer, (req, res) => {
    const rows = db
      .prepare(
        `select
          q.id,
          q.title,
          q.category,
          q.status,
          q.created_at,
          q.flow_mode,
          q.points_per_question,
          count(distinct questions.id) as questions,
          count(distinct session_participants.id) as participants
        from quizzes q
        left join questions on questions.quiz_id = q.id
        left join quiz_sessions on quiz_sessions.quiz_id = q.id
        left join session_participants on session_participants.session_id = quiz_sessions.id
        where q.organizer_id = ?
        group by q.id
        order by q.created_at desc`,
      )
      .all(req.user.id);

    return res.json({ quizzes: rows.map(mapQuiz) });
  });

  router.get('/:id', requireOrganizer, (req, res) => {
    const quiz = getQuizDetails(db, req.params.id, req.user.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Квиз не найден' });
    }

    return res.json({ quiz });
  });

  router.post('/', requireOrganizer, (req, res) => {
    const parsed = quizSchema.safeParse(req.body);

    if (!parsed.success) {
      return sendZodError(res, parsed.error);
    }

    const answerError = validateQuestionAnswers(parsed.data.questions);

    if (answerError) {
      return res.status(400).json({ message: answerError });
    }

    const createQuiz = db.transaction((quiz) => {
      const quizResult = db
        .prepare(
          `insert into quizzes
            (organizer_id, title, category, status, time_limit_seconds, flow_mode, points_per_question, rules)
           values (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          req.user.id,
          quiz.title,
          quiz.category,
          quiz.status,
          quiz.timeLimitSeconds,
          quiz.flowMode,
          quiz.pointsPerQuestion,
          quiz.rules,
        );

      const quizId = quizResult.lastInsertRowid;
      insertQuestions(db, quizId, quiz.questions);

      return quizId;
    });

    const quizId = createQuiz(parsed.data);
    const quiz = db
      .prepare(
        `select
          q.id,
          q.title,
          q.category,
          q.status,
          q.created_at,
          q.flow_mode,
          q.points_per_question,
          count(questions.id) as questions,
          0 as participants
        from quizzes q
        left join questions on questions.quiz_id = q.id
        where q.id = ?
        group by q.id`,
      )
      .get(quizId);

    return res.status(201).json({ quiz: mapQuiz(quiz) });
  });

  router.put('/:id', requireOrganizer, (req, res) => {
    const parsed = quizSchema.safeParse(req.body);

    if (!parsed.success) {
      return sendZodError(res, parsed.error);
    }

    const quiz = findOwnedQuiz(db, req.params.id, req.user.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Квиз не найден' });
    }

    if (quiz.status !== 'draft') {
      return res.status(409).json({ message: 'Сначала верните квиз в черновик' });
    }

    const answerError = validateQuestionAnswers(parsed.data.questions);

    if (answerError) {
      return res.status(400).json({ message: answerError });
    }

    const updateQuiz = db.transaction((updatedQuiz) => {
      db.prepare(
        `update quizzes
         set title = ?,
             category = ?,
             status = ?,
             time_limit_seconds = ?,
             flow_mode = ?,
             points_per_question = ?,
             rules = ?
         where id = ? and organizer_id = ?`,
      ).run(
        updatedQuiz.title,
        updatedQuiz.category,
        updatedQuiz.status,
        updatedQuiz.timeLimitSeconds,
        updatedQuiz.flowMode,
        updatedQuiz.pointsPerQuestion,
        updatedQuiz.rules,
        quiz.id,
        req.user.id,
      );

      db.prepare('delete from questions where quiz_id = ?').run(quiz.id);
      insertQuestions(db, quiz.id, updatedQuiz.questions);
    });

    updateQuiz(parsed.data);

    return res.json({ quiz: getQuizDetails(db, quiz.id, req.user.id) });
  });

  router.patch('/:id/status', requireOrganizer, (req, res) => {
    const parsed = z.object({ status: z.enum(['draft', 'ready']) }).safeParse(req.body);

    if (!parsed.success) {
      return sendZodError(res, parsed.error);
    }

    const quiz = findOwnedQuiz(db, req.params.id, req.user.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Квиз не найден' });
    }

    if (quiz.status === 'completed') {
      return res.status(409).json({ message: 'Завершенный квиз нельзя изменить' });
    }

    db.prepare('update quizzes set status = ? where id = ? and organizer_id = ?').run(
      parsed.data.status,
      quiz.id,
      req.user.id,
    );

    return res.json({ quiz: getQuizDetails(db, quiz.id, req.user.id) });
  });

  return router;
}
