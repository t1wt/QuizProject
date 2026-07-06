import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Medal, Trophy } from 'lucide-react';
import { getResult, getResults } from '../services/api.js';
import { useAuth } from '../services/AuthContext.jsx';
import { pluralizeRu } from '../utils/format.js';

export default function ResultsPage() {
  const { token, user } = useAuth();
  const [results, setResults] = useState([]);
  const [selectedRoomCode, setSelectedRoomCode] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadResults() {
      try {
        const data = await getResults(token);

        if (!ignore) {
          setResults(data.results);
          setSelectedRoomCode(data.results[0]?.roomCode || '');
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

    loadResults();

    return () => {
      ignore = true;
    };
  }, [token]);

  useEffect(() => {
    let ignore = false;

    async function loadResult() {
      if (!selectedRoomCode) {
        setSelectedResult(null);
        return;
      }

      try {
        const data = await getResult(token, selectedRoomCode);

        if (!ignore) {
          setSelectedResult(data.result);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
        }
      }
    }

    loadResult();

    return () => {
      ignore = true;
    };
  }, [selectedRoomCode, token]);

  const stats = useMemo(() => {
    const finished = results.filter((result) => result.status === 'finished').length;
    const bestScore = Math.max(0, ...results.map((result) => result.ownScore ?? result.topScore ?? 0));

    return {
      total: results.length,
      finished,
      bestScore,
    };
  }, [results]);

  return (
    <main className="workspace results-layout">
      <section className="winner-panel">
        <Trophy size={38} />
        <p className="eyebrow">{user.role === 'organizer' ? 'проведенные комнаты' : 'мои участия'}</p>
        <h1>
          {selectedResult?.winnerName
            ? `Победитель: ${selectedResult.winnerName}`
            : 'История результатов'}
        </h1>
        <p>
          {user.role === 'organizer'
            ? 'Комнаты, участники и итоговые таблицы сохраняются после завершения квиза.'
            : 'Здесь собраны квизы, в которых вы участвовали под своим аккаунтом.'}
        </p>
      </section>

      <section className="leaderboard">
        <div className="section-title">
          <h2>Результаты</h2>
          <BarChart3 size={20} />
        </div>

        <section className="result-stats">
          <article>
            <strong>{stats.total}</strong>
            <span>{pluralizeRu(stats.total, 'комната', 'комнаты', 'комнат')}</span>
          </article>
          <article>
            <strong>{stats.finished}</strong>
            <span>завершено</span>
          </article>
          <article>
            <strong>{stats.bestScore}</strong>
            <span>лучший счет</span>
          </article>
        </section>

        {error && <p className="form-error">{error}</p>}

        {isLoading ? (
          <div className="empty-state compact">Загружаем результаты...</div>
        ) : results.length > 0 ? (
          <div className="result-list">
            {results.map((result) => (
              <button
                key={result.roomCode}
                type="button"
                className={result.roomCode === selectedRoomCode ? 'result-item selected' : 'result-item'}
                onClick={() => setSelectedRoomCode(result.roomCode)}
              >
                <span>{result.quizTitle}</span>
                <b>{result.roomCode}</b>
                <small>
                  {user.role === 'organizer'
                    ? `${result.participantCount} участников`
                    : `${result.ownScore} баллов`}
                </small>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state compact">Результатов пока нет</div>
        )}
      </section>

      <section className="leaderboard">
        <div className="section-title">
          <h2>Лидерборд</h2>
          <span>{selectedRoomCode || 'нет комнаты'}</span>
        </div>

        {selectedResult?.participants?.length ? (
          selectedResult.participants.map((player, index) => (
            <article key={player.id} className={`leader-row ${index === 0 ? 'green' : index === 1 ? 'yellow' : index === 2 ? 'orange' : 'blue'}`}>
              <span>{index + 1}</span>
              <div>
                <strong>{player.name}</strong>
                <small>{player.score} баллов</small>
              </div>
              <Medal size={20} />
            </article>
          ))
        ) : (
          <div className="empty-state compact">Выберите комнату с участниками</div>
        )}
      </section>
    </main>
  );
}
