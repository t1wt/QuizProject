import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, ListChecks, RadioTower, Trophy, UsersRound } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="hero-layout">
      <section className="intro-panel">
        <div className="intro-copy">
          <p className="eyebrow">живые квизы для аудитории</p>
          <h1>Комнаты, вопросы и лидерборд в одном ритме.</h1>
          <p>
            Организатор запускает раунд, участники входят по коду комнаты, а
            результаты собираются в общий рейтинг сразу после ответов.
          </p>
        </div>

        <div className="hero-actions">
          <Link className="primary-link large" to="/organizer">
            <span>Открыть кабинет</span>
            <ArrowRight size={19} />
          </Link>
          <Link className="ghost-link large" to="/room">
            Подключиться к комнате
          </Link>
        </div>

        <div className="status-strip">
          <div>
            <UsersRound size={18} />
            <span>18 участников</span>
          </div>
          <div>
            <ListChecks size={18} />
            <span>8 вопросов</span>
          </div>
          <div>
            <Clock3 size={18} />
            <span>30 секунд</span>
          </div>
          <div>
            <Trophy size={18} />
            <span>лидерборд</span>
          </div>
        </div>
      </section>

      <section className="room-board" aria-label="Превью комнаты квиза">
        <div className="room-header">
          <span>Комната QZ-418</span>
          <strong>ожидание</strong>
        </div>

        <div className="pulse-grid">
          {Array.from({ length: 18 }).map((_, index) => (
            <span key={index} className={index % 4 === 0 ? 'active' : ''} />
          ))}
        </div>

        <div className="question-preview">
          <span>Вопрос 1 из 8</span>
          <h2>Какой город называют северной столицей России?</h2>
          <button type="button">Санкт-Петербург</button>
        </div>
      </section>
    </main>
  );
}
