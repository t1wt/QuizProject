import { ImagePlus, ListChecks, Save } from 'lucide-react';
import { questionDraft } from '../data/demoData.js';

export default function BuilderPage() {
  return (
    <main className="workspace builder-layout">
      <section className="builder-form">
        <p className="eyebrow">конструктор квиза</p>
        <h1>Соберите сценарий комнаты.</h1>

        <label>
          Название квиза
          <input defaultValue="Киберразминка" />
        </label>

        <div className="form-columns">
          <label>
            Категория
            <input defaultValue="Информатика" />
          </label>
          <label>
            Время на вопрос
            <input defaultValue="30 секунд" />
          </label>
        </div>

        <label>
          Правила
          <textarea defaultValue="Ответы принимаются только пока вопрос активен. За правильный ответ начисляются баллы." />
        </label>

        <button className="submit-button" type="button">
          <Save size={18} />
          Сохранить черновик
        </button>
      </section>

      <section className="question-card">
        <div className="section-title">
          <h2>Вопрос 1</h2>
          <span>один ответ</span>
        </div>
        <h3>{questionDraft.title}</h3>
        <div className="image-drop">
          <ImagePlus size={22} />
          <span>место для изображения</span>
        </div>
        <div className="answer-stack">
          {questionDraft.answers.map((answer, index) => (
            <button key={answer} className={index === 1 ? 'correct' : ''} type="button">
              <ListChecks size={17} />
              {answer}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
