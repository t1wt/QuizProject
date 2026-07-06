export function getSessionByCode(db, roomCode) {
  return db
    .prepare(
      `select
        quiz_sessions.id,
        quiz_sessions.quiz_id,
        quiz_sessions.room_code,
        quiz_sessions.status,
        quiz_sessions.current_question_id,
        quiz_sessions.current_question_started_at,
        quiz_sessions.started_at,
        quiz_sessions.finished_at,
        cast(strftime('%s', coalesce(quiz_sessions.current_question_started_at, quiz_sessions.started_at)) as integer) as current_question_started_at_unix,
        cast(strftime('%s', 'now') as integer) as now_unix,
        quizzes.title,
        quizzes.rules,
        quizzes.time_limit_seconds
       from quiz_sessions
       join quizzes on quizzes.id = quiz_sessions.quiz_id
       where quiz_sessions.room_code = ?`,
    )
    .get(roomCode.toUpperCase());
}

export function getSessionState(db, roomCode) {
  const session = getSessionByCode(db, roomCode);

  if (!session) {
    return null;
  }

  const questions = db
    .prepare(
      `select id, text, image_url, type, position
       from questions
       where quiz_id = ?
       order by position`,
    )
    .all(session.quiz_id);
  const participants = db
    .prepare(
      `select id, user_id, guest_name, score, joined_at
       from session_participants
       where session_id = ?
       order by score desc, joined_at asc`,
    )
    .all(session.id);

  const currentQuestionIndex = questions.findIndex(
    (question) => question.id === session.current_question_id,
  );
  const currentQuestion = currentQuestionIndex >= 0 ? questions[currentQuestionIndex] : null;
  const elapsedSeconds = currentQuestion
    ? Math.max(0, Number(session.now_unix) - Number(session.current_question_started_at_unix || session.now_unix))
    : 0;
  const secondsLeft = currentQuestion
    ? Math.max(0, session.time_limit_seconds - elapsedSeconds)
    : 0;
  const answers = currentQuestion
    ? db
        .prepare(
          `select id, text, position
           from answers
           where question_id = ?
           order by position`,
        )
        .all(currentQuestion.id)
    : [];

  return {
    id: session.id,
    roomCode: session.room_code,
    status: session.status,
    quiz: {
      id: session.quiz_id,
      title: session.title,
      rules: session.rules,
      timeLimitSeconds: session.time_limit_seconds,
      totalQuestions: questions.length,
    },
    currentQuestion: currentQuestion
      ? {
          id: currentQuestion.id,
          text: currentQuestion.text,
          imageUrl: currentQuestion.image_url || '',
          type: currentQuestion.type,
          position: currentQuestion.position,
          index: currentQuestionIndex + 1,
          secondsLeft,
          timeLimitSeconds: session.time_limit_seconds,
          answers,
        }
      : null,
    participants: participants.map((participant) => ({
      id: participant.id,
      name: participant.guest_name,
      score: participant.score,
    })),
  };
}

export function emitSessionState(io, db, roomCode) {
  const state = getSessionState(db, roomCode);

  if (state) {
    io.to(`room:${state.roomCode}`).emit('session:update', state);
  }

  return state;
}
