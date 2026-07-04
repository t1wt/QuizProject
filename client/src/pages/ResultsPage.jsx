import { Medal, Trophy } from 'lucide-react';
import { leaderboard } from '../data/demoData.js';

export default function ResultsPage() {
  return (
    <main className="workspace results-layout">
      <section className="winner-panel">
        <Trophy size={38} />
        <p className="eyebrow">итоги эфира</p>
        <h1>Победитель: Алина</h1>
        <p>Финальная таблица учитывает правильность ответов и скорость участников.</p>
      </section>

      <section className="leaderboard">
        <div className="section-title">
          <h2>Лидерборд</h2>
          <span>QZ-418</span>
        </div>
        {leaderboard.map((player, index) => (
          <article key={player.name} className={`leader-row ${player.accent}`}>
            <span>{index + 1}</span>
            <div>
              <strong>{player.name}</strong>
              <small>{player.score} баллов</small>
            </div>
            <Medal size={20} />
          </article>
        ))}
      </section>
    </main>
  );
}
