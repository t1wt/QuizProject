import { Play, SkipForward, UsersRound } from 'lucide-react';

export default function RoomPage() {
  return (
    <main className="workspace live-layout">
      <section className="broadcast-panel">
        <div className="room-header">
          <span>Комната QZ-418</span>
          <strong>готова к старту</strong>
        </div>
        <h1>Киберразминка</h1>
        <p>Участники подключаются, организатор видит аудиторию и запускает первый вопрос.</p>

        <div className="host-controls">
          <button type="button">
            <Play size={18} />
            Запустить
          </button>
          <button type="button">
            <SkipForward size={18} />
            Следующий вопрос
          </button>
        </div>
      </section>

      <aside className="audience-panel">
        <div className="section-title">
          <h2>Аудитория</h2>
          <UsersRound size={20} />
        </div>
        {['Алина', 'Марк', 'Соня', 'Данил', 'Ира'].map((name, index) => (
          <div key={name} className="audience-row">
            <span>{name}</span>
            <b>{index < 2 ? 'готов' : 'ждет'}</b>
          </div>
        ))}
      </aside>
    </main>
  );
}
