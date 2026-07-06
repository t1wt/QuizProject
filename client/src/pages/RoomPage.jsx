import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, Clock3, Play, SkipForward, Trophy, UsersRound } from 'lucide-react';
import {
  getSession,
  joinSession,
  joinSessionAsUser,
  nextQuestion,
  startSession,
  submitAnswer,
} from '../services/api.js';
import { createRoomSocket } from '../services/socket.js';
import { useAuth } from '../services/AuthContext.jsx';

function participantStorageKey(roomCode) {
  return `project_quiz_participant_${roomCode}`;
}

export default function RoomPage() {
  const navigate = useNavigate();
  const { roomCode } = useParams();
  const { token, user } = useAuth();
  const normalizedRoomCode = roomCode?.toUpperCase() || '';
  const [codeInput, setCodeInput] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [session, setSession] = useState(null);
  const [participant, setParticipant] = useState(() => {
    if (!normalizedRoomCode) {
      return null;
    }

    const saved = sessionStorage.getItem(participantStorageKey(normalizedRoomCode));
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedAnswerIds, setSelectedAnswerIds] = useState([]);
  const [answerStatus, setAnswerStatus] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(normalizedRoomCode));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isHost = user?.role === 'organizer';
  const currentQuestion = session?.currentQuestion;
  const answered = Boolean(answerStatus);
  const isTimeOver = session?.status === 'active' && currentQuestion && timeLeft <= 0;
  const isLastQuestion = currentQuestion?.index === session?.quiz.totalQuestions;

  const participantScore = useMemo(() => {
    if (!participant || !session) {
      return 0;
    }

    return session.participants.find((item) => item.id === participant.id)?.score || 0;
  }, [participant, session]);

  useEffect(() => {
    setName(user?.name || '');
  }, [user]);

  useEffect(() => {
    if (!normalizedRoomCode) {
      return undefined;
    }

    let ignore = false;

    async function loadSession() {
      try {
        const data = await getSession(normalizedRoomCode);

        if (!ignore) {
          setSession(data.session);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadSession();

    const socket = createRoomSocket(normalizedRoomCode, (state) => {
      setSession(state);
    });

    return () => {
      ignore = true;
      socket.disconnect();
    };
  }, [normalizedRoomCode]);

  useEffect(() => {
    setSelectedAnswerIds([]);
    setAnswerStatus('');
    setTimeLeft(currentQuestion?.secondsLeft || 0);
  }, [currentQuestion?.id]);

  useEffect(() => {
    if (session?.status !== 'active' || !currentQuestion) {
      return undefined;
    }

    setTimeLeft(currentQuestion.secondsLeft || 0);

    const timer = window.setInterval(() => {
      setTimeLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentQuestion, session?.status]);

  function openRoom(event) {
    event.preventDefault();
    const code = codeInput.trim().toUpperCase();

    if (code) {
      navigate(`/room/${code}`);
    }
  }

  async function joinRoom(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data = token
        ? await joinSessionAsUser(token, normalizedRoomCode, name)
        : await joinSession(normalizedRoomCode, name);
      setParticipant(data.participant);
      setSession(data.session);
      sessionStorage.setItem(
        participantStorageKey(normalizedRoomCode),
        JSON.stringify(data.participant),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function hostStart() {
    setError('');
    setIsSubmitting(true);

    try {
      const data = await startSession(token, normalizedRoomCode);
      setSession(data.session);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function hostNext() {
    setError('');
    setIsSubmitting(true);

    try {
      const data = await nextQuestion(token, normalizedRoomCode);
      setSession(data.session);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleAnswer(answerId) {
    if (!currentQuestion || answered || isTimeOver) {
      return;
    }

    if (currentQuestion.type === 'single') {
      setSelectedAnswerIds([answerId]);
      return;
    }

    setSelectedAnswerIds((current) =>
      current.includes(answerId)
        ? current.filter((selectedId) => selectedId !== answerId)
        : [...current, answerId],
    );
  }

  async function sendAnswer() {
    if (!participant || selectedAnswerIds.length === 0 || isTimeOver) {
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const data = await submitAnswer(normalizedRoomCode, participant.id, selectedAnswerIds);
      setSession(data.session);
      setAnswerStatus(data.correct ? 'Ответ принят: верно' : 'Ответ принят');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!normalizedRoomCode) {
    return (
      <main className="workspace split-workspace">
        <section className="join-panel">
          <p className="eyebrow">подключение</p>
          <h1>Введите код комнаты.</h1>
          <form className="code-input" onSubmit={openRoom}>
            <input
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              maxLength="6"
              placeholder="QZ418A"
              required
            />
            <button className="primary-link" type="submit" aria-label="Открыть комнату">
              <ArrowRight size={18} />
            </button>
          </form>
        </section>

        <section className="profile-panel">
          <div className="empty-state compact">Код показывает организатор после запуска комнаты.</div>
        </section>
      </main>
    );
  }

  return (
    <main className="workspace live-layout">
      <section className="broadcast-panel">
        <div className="room-header">
          <span>Комната {normalizedRoomCode}</span>
          <strong>{session?.status === 'active' ? 'идет вопрос' : session?.status === 'finished' ? 'завершено' : 'ожидание'}</strong>
        </div>

        {isLoading ? (
          <div className="empty-state compact">Загружаем комнату...</div>
        ) : session ? (
          <>
            <h1>{session.quiz.title}</h1>
            <p>{session.quiz.rules}</p>

            {error && <p className="form-error">{error}</p>}

            {!isHost && !participant && session.status !== 'finished' && (
              <form className="room-join-form" onSubmit={joinRoom}>
                <label>
                  Имя участника
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Например, Алексей"
                    required
                  />
                </label>
                <button className="submit-button" type="submit" disabled={isSubmitting}>
                  Подключиться
                </button>
              </form>
            )}

            {session.status === 'waiting' && (
              <div className="empty-state compact">
                {isHost ? 'Участники подключаются по коду комнаты.' : 'Ожидаем старт квиза.'}
              </div>
            )}

            {currentQuestion && (
              <div className="live-question">
                <span>
                  Вопрос {currentQuestion.index} из {session.quiz.totalQuestions}
                </span>
                <div className={isTimeOver ? 'timer-chip expired' : 'timer-chip'}>
                  <Clock3 size={17} />
                  <strong>{timeLeft}</strong>
                  <span>сек.</span>
                </div>
                <h2>{currentQuestion.text}</h2>
                {currentQuestion.imageUrl && (
                  <img src={currentQuestion.imageUrl} alt="" />
                )}
                <div className="live-answers">
                  {currentQuestion.answers.map((answer) => (
                    <button
                      key={answer.id}
                      type="button"
                      className={selectedAnswerIds.includes(answer.id) ? 'selected' : ''}
                      onClick={() => toggleAnswer(answer.id)}
                      disabled={isHost || !participant || answered || isTimeOver}
                    >
                      <Check size={17} />
                      {answer.text}
                    </button>
                  ))}
                </div>
                {!isHost && participant && (
                  <button
                    className="submit-button"
                    type="button"
                    disabled={isSubmitting || selectedAnswerIds.length === 0 || answered || isTimeOver}
                    onClick={sendAnswer}
                  >
                    {answerStatus || (isTimeOver ? 'Время вышло' : 'Отправить ответ')}
                  </button>
                )}
                {!isHost && participant && isTimeOver && !answered && (
                  <p className="time-note">Время истекло, ожидайте следующий вопрос.</p>
                )}
              </div>
            )}

            {session.status === 'finished' && (
              <div className="empty-state compact">Квиз завершен. Итоги доступны в лидерборде.</div>
            )}

            {isHost && (
              <div className="host-controls">
                {session.status === 'waiting' && (
                  <button type="button" disabled={isSubmitting} onClick={hostStart}>
                    <Play size={18} />
                    Запустить
                  </button>
                )}
                {session.status === 'active' && (
                  <button type="button" disabled={isSubmitting} onClick={hostNext}>
                    <SkipForward size={18} />
                    {isLastQuestion ? 'Завершить квиз' : 'Следующий вопрос'}
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="empty-state compact">Комната не найдена.</div>
        )}
      </section>

      <aside className="audience-panel">
        <div className="section-title">
          <h2>{session?.status === 'finished' ? 'Лидерборд' : 'Аудитория'}</h2>
          {session?.status === 'finished' ? <Trophy size={20} /> : <UsersRound size={20} />}
        </div>
        {participant && (
          <div className="score-chip">
            Ваш счет: <strong>{participantScore}</strong>
          </div>
        )}
        {session?.participants?.length ? (
          session.participants.map((item, index) => (
            <div key={item.id} className="audience-row">
              <span>{index + 1}. {item.name}</span>
              <b>{item.score} баллов</b>
            </div>
          ))
        ) : (
          <div className="empty-state compact">Участников пока нет</div>
        )}
      </aside>
    </main>
  );
}
