import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, History, Trophy, UserRound } from 'lucide-react';
import { getResults } from '../services/api.js';
import { useAuth } from '../services/AuthContext.jsx';
import { pluralizeRu } from '../utils/format.js';

export default function ParticipantPage() {
  const { token, user } = useAuth();
  const [roomCode, setRoomCode] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadResults() {
      try {
        const data = await getResults(token);

        if (!ignore) {
          setResults(data.results);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
        }
      }
    }

    loadResults();

    return () => {
      ignore = true;
    };
  }, [token]);

  const stats = useMemo(
    () => ({
      bestScore: Math.max(0, ...results.map((result) => result.ownScore || 0)),
      total: results.length,
      lastQuiz: results[0]?.quizTitle || 'нет участий',
    }),
    [results],
  );

  const roomPath = roomCode.trim() ? `/room/${roomCode.trim().toUpperCase()}` : '/room';

  return (
    <main className="workspace split-workspace">
      <section className="join-panel">
        <p className="eyebrow">кабинет участника</p>
        <h1>Войти в текущий квиз.</h1>
        <p className="panel-copy">Введите код, который показывает организатор во время запуска комнаты.</p>
        <div className="code-input" aria-label="Код комнаты">
          <input
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value)}
            maxLength="6"
            placeholder="QZ418A"
          />
          <Link className="primary-link" to={roomPath} aria-label="Открыть комнату">
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section className="profile-panel">
        <div className="avatar-block">
          <UserRound size={28} />
          <div>
            <strong>{user.name}</strong>
            <span>{stats.lastQuiz}</span>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="history-list">
          <article>
            <Trophy size={20} />
            <div>
              <strong>Лучший результат</strong>
              <span>{stats.bestScore} баллов</span>
            </div>
          </article>
          <article>
            <History size={20} />
            <div>
              <strong>История участий</strong>
              <span>
                {stats.total} {pluralizeRu(stats.total, 'квиз', 'квиза', 'квизов')}
              </span>
            </div>
          </article>
        </div>

        {results.length > 0 && (
          <div className="result-list compact">
            {results.slice(0, 3).map((result) => (
              <Link key={result.roomCode} className="result-item" to="/results">
                <span>{result.quizTitle}</span>
                <b>{result.ownScore} баллов</b>
                <small>{result.roomCode}</small>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
