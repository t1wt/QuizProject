import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, History, ListChecks, RadioTower } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="hero-layout">
      <section className="intro-panel">
        <div className="intro-copy">
          <p className="eyebrow">живые квизы для аудитории</p>
          <h1>Квизы для занятий, встреч и быстрых проверок.</h1>
          <p>
            Организатор готовит вопросы, запускает комнату и показывает их всем
            участникам одновременно. После прохождения остаются баллы, победитель и история.
          </p>
        </div>

        <div className="hero-actions">
          <Link className="primary-link large" to="/organizer">
            <span>Создать квиз</span>
            <ArrowRight size={19} />
          </Link>
          <Link className="ghost-link large" to="/room">
            Войти по коду
          </Link>
        </div>

        <div className="status-strip">
          <div>
            <RadioTower size={18} />
            <span>комнаты по коду</span>
          </div>
          <div>
            <ListChecks size={18} />
            <span>один/несколько ответов</span>
          </div>
          <div>
            <Clock3 size={18} />
            <span>таймер вопроса</span>
          </div>
          <div>
            <History size={18} />
            <span>история результатов</span>
          </div>
        </div>
      </section>

      <section className="room-board" aria-label="Превью комнаты квиза">
        <div className="room-header">
          <span>Комната QZ-418</span>
          <strong>готово</strong>
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
