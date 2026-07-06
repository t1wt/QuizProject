import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, Clock3, Edit3, Play, Plus, RotateCcw, Rocket } from 'lucide-react';
import { createSession, getOrganizerQuizzes, getResults, updateQuizStatus } from '../services/api.js';
import { useAuth } from '../services/AuthContext.jsx';
import { pluralizeRu } from '../utils/format.js';

export default function OrganizerPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);

  async function loadQuizzes(shouldIgnore = () => false) {
    try {
      const data = await getOrganizerQuizzes(token);

      if (!shouldIgnore()) {
        setQuizzes(data.quizzes);
      }
    } catch (err) {
      if (!shouldIgnore()) {
        setError(err.message);
      }
    } finally {
      if (!shouldIgnore()) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    let ignore = false;

    loadQuizzes(() => ignore);

    async function loadResults() {
      try {
        const data = await getResults(token);

        if (!ignore) {
          setResults(data.results);
        }
      } catch {
        if (!ignore) {
          setResults([]);
        }
      }
    }

    loadResults();

    return () => {
      ignore = true;
    };
  }, [token]);

  async function changeStatus(quizId, status) {
    setError('');
    setUpdatingId(quizId);

    try {
      await updateQuizStatus(token, quizId, status);
      await loadQuizzes();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function launchQuiz(quizId) {
    setError('');
    setUpdatingId(quizId);

    try {
      const data = await createSession(token, quizId);
      navigate(`/room/${data.session.roomCode}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  const readyCount = quizzes.filter((quiz) => quiz.status === 'ready').length;
  const draftCount = quizzes.filter((quiz) => quiz.status === 'draft').length;
  const finishedCount = results.filter((result) => result.status === 'finished').length;

  return (
    <main className="workspace">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">кабинет организатора</p>
          <h1>{user.name}, управление квизами и эфирами.</h1>
        </div>
        <Link className="primary-link large" to="/builder">
          <Plus size={19} />
          <span>Создать квиз</span>
        </Link>
      </section>

      <section className="metric-grid">
        <article>
          <Rocket size={22} />
          <strong>{readyCount}</strong>
          <span>готово к запуску</span>
        </article>
        <article>
          <BarChart3 size={22} />
          <strong>{quizzes.length}</strong>
          <span>{pluralizeRu(quizzes.length, 'квиз', 'квиза', 'квизов')} в базе</span>
        </article>
        <article>
          <Clock3 size={22} />
          <strong>{finishedCount || draftCount}</strong>
          <span>
            {finishedCount
              ? pluralizeRu(finishedCount, 'проведен', 'проведено', 'проведено')
              : pluralizeRu(draftCount, 'черновик', 'черновика', 'черновиков')}
          </span>
        </article>
      </section>

      <section className="list-panel">
        <div className="section-title">
          <h2>Мои квизы</h2>
          <Link to="/results">История результатов</Link>
        </div>

        {error && <p className="form-error">{error}</p>}

        {isLoading ? (
          <div className="empty-state compact">Загружаем квизы...</div>
        ) : quizzes.length > 0 ? (
          <div className="quiz-list">
            {quizzes.map((quiz) => (
              <article key={quiz.id} className="quiz-row">
                <div>
                  <strong>{quiz.title}</strong>
                  <span>{quiz.category} · {quiz.questions} вопросов</span>
                </div>
                <div className="quiz-meta">
                  <span>{quiz.participants} участников</span>
                  <b>{quiz.statusLabel}</b>
                </div>
                <div className="quiz-actions">
                  {quiz.status === 'draft' && (
                    <>
                      <Link className="mini-button" to={`/builder/${quiz.id}`}>
                        <Edit3 size={16} />
                        Изменить
                      </Link>
                      <button
                        className="mini-button success"
                        type="button"
                        disabled={updatingId === quiz.id}
                        onClick={() => changeStatus(quiz.id, 'ready')}
                      >
                        <Rocket size={16} />
                        Готов
                      </button>
                    </>
                  )}
                  {quiz.status === 'ready' && (
                    <>
                      <button
                        className="mini-button success"
                        type="button"
                        disabled={updatingId === quiz.id}
                        onClick={() => launchQuiz(quiz.id)}
                      >
                        <Play size={16} />
                        Запустить
                      </button>
                      <button
                        className="mini-button"
                        type="button"
                        disabled={updatingId === quiz.id}
                        onClick={() => changeStatus(quiz.id, 'draft')}
                      >
                        <RotateCcw size={16} />
                        В черновик
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state compact">
            <span>Пока нет квизов</span>
          </div>
        )}
      </section>
    </main>
  );
}
