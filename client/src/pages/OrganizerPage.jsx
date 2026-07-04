import { Link } from 'react-router-dom';
import { BarChart3, Clock3, Plus, RadioTower } from 'lucide-react';
import { organizerQuizzes } from '../data/demoData.js';

export default function OrganizerPage() {
  return (
    <main className="workspace">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">кабинет организатора</p>
          <h1>Управление квизами и эфирами.</h1>
        </div>
        <Link className="primary-link large" to="/builder">
          <Plus size={19} />
          <span>Создать квиз</span>
        </Link>
      </section>

      <section className="metric-grid">
        <article>
          <RadioTower size={22} />
          <strong>1</strong>
          <span>активная комната</span>
        </article>
        <article>
          <BarChart3 size={22} />
          <strong>3</strong>
          <span>квиза в базе</span>
        </article>
        <article>
          <Clock3 size={22} />
          <strong>18</strong>
          <span>последних участников</span>
        </article>
      </section>

      <section className="list-panel">
        <div className="section-title">
          <h2>Мои квизы</h2>
          <Link to="/results">История результатов</Link>
        </div>

        <div className="quiz-list">
          {organizerQuizzes.map((quiz) => (
            <article key={quiz.title} className="quiz-row">
              <div>
                <strong>{quiz.title}</strong>
                <span>{quiz.category} · {quiz.questions} вопросов</span>
              </div>
              <div>
                <span>{quiz.participants} участников</span>
                <b>{quiz.status}</b>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
