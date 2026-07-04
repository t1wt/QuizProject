import { Link } from 'react-router-dom';
import { ArrowRight, History, Trophy, UserRound } from 'lucide-react';

export default function ParticipantPage() {
  return (
    <main className="workspace split-workspace">
      <section className="join-panel">
        <p className="eyebrow">кабинет участника</p>
        <h1>Вход в комнату по коду.</h1>
        <div className="code-input" aria-label="Код комнаты">
          <input maxLength="6" placeholder="QZ-418" />
          <Link className="primary-link" to="/room">
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section className="profile-panel">
        <div className="avatar-block">
          <UserRound size={28} />
          <div>
            <strong>Алексей</strong>
            <span>участник последних игр</span>
          </div>
        </div>

        <div className="history-list">
          <article>
            <Trophy size={20} />
            <div>
              <strong>Лучший результат</strong>
              <span>720 баллов</span>
            </div>
          </article>
          <article>
            <History size={20} />
            <div>
              <strong>История участий</strong>
              <span>4 квиза за последнюю неделю</span>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
