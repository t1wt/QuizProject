import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ImagePlus, ListPlus, Plus, Save, Trash2 } from 'lucide-react';
import { createQuiz, getQuiz, updateQuiz } from '../services/api.js';
import { useAuth } from '../services/AuthContext.jsx';

function createEmptyQuestion(position = 1) {
  return {
    text: position === 1 ? 'Какой город называют северной столицей России?' : '',
    imageUrl: '',
    type: 'single',
    answers: [
      { text: position === 1 ? 'Москва' : '', isCorrect: false },
      { text: position === 1 ? 'Санкт-Петербург' : '', isCorrect: true },
      { text: position === 1 ? 'Казань' : '', isCorrect: false },
      { text: position === 1 ? 'Владивосток' : '', isCorrect: false },
    ],
  };
}

export default function BuilderPage() {
  const navigate = useNavigate();
  const { quizId } = useParams();
  const { token } = useAuth();
  const [quiz, setQuiz] = useState({
    title: 'Квиз по городам России',
    category: 'География',
    timeLimitSeconds: 30,
    rules: 'За правильный ответ начисляется 100 баллов. Ответы принимаются до окончания таймера.',
    status: 'draft',
    questions: [createEmptyQuestion()],
  });
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(quizId));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeQuestion = quiz.questions[activeQuestionIndex];
  const isEditing = Boolean(quizId);
  const isEditableDraft = quiz.status === 'draft';

  useEffect(() => {
    let ignore = false;

    async function loadQuiz() {
      if (!quizId) {
        return;
      }

      try {
        const data = await getQuiz(token, quizId);

        if (!ignore) {
          setQuiz({
            title: data.quiz.title,
            category: data.quiz.category,
            timeLimitSeconds: data.quiz.timeLimitSeconds,
            rules: data.quiz.rules,
            status: data.quiz.status,
            questions: data.quiz.questions.length > 0 ? data.quiz.questions : [createEmptyQuestion()],
          });
          setActiveQuestionIndex(0);
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

    loadQuiz();

    return () => {
      ignore = true;
    };
  }, [quizId, token]);

  function updateQuizField(event) {
    const { name, value } = event.target;
    setQuiz((current) => ({
      ...current,
      [name]: name === 'timeLimitSeconds' ? Number(value) : value,
    }));
  }

  function updateQuestionField(field, value) {
    setQuiz((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === activeQuestionIndex ? { ...question, [field]: value } : question,
      ),
    }));
  }

  function updateAnswer(answerIndex, field, value) {
    setQuiz((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) => {
        if (questionIndex !== activeQuestionIndex) {
          return question;
        }

        const answers = question.answers.map((answer, index) => {
          if (index !== answerIndex) {
            return question.type === 'single' && field === 'isCorrect'
              ? { ...answer, isCorrect: false }
              : answer;
          }

          return { ...answer, [field]: value };
        });

        return { ...question, answers };
      }),
    }));
  }

  function changeQuestionType(type) {
    setQuiz((current) => ({
      ...current,
      questions: current.questions.map((question, index) => {
        if (index !== activeQuestionIndex) {
          return question;
        }

        const answers =
          type === 'single'
            ? question.answers.map((answer, answerIndex) => ({
                ...answer,
                isCorrect: answerIndex === question.answers.findIndex((item) => item.isCorrect),
              }))
            : question.answers;

        return { ...question, type, answers };
      }),
    }));
  }

  function addQuestion() {
    setQuiz((current) => ({
      ...current,
      questions: [...current.questions, createEmptyQuestion(current.questions.length + 1)],
    }));
    setActiveQuestionIndex(quiz.questions.length);
  }

  function removeQuestion(indexToRemove) {
    if (quiz.questions.length === 1) {
      return;
    }

    setQuiz((current) => ({
      ...current,
      questions: current.questions.filter((_, index) => index !== indexToRemove),
    }));
    setActiveQuestionIndex((current) => Math.max(0, Math.min(current - 1, quiz.questions.length - 2)));
  }

  function addAnswer() {
    setQuiz((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === activeQuestionIndex
          ? { ...question, answers: [...question.answers, { text: '', isCorrect: false }] }
          : question,
      ),
    }));
  }

  function removeAnswer(answerIndex) {
    if (activeQuestion.answers.length <= 2) {
      return;
    }

    setQuiz((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) =>
        questionIndex === activeQuestionIndex
          ? { ...question, answers: question.answers.filter((_, index) => index !== answerIndex) }
          : question,
      ),
    }));
  }

  async function handleSubmit(event, status) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const payload = { ...quiz, status };

      if (isEditing) {
        await updateQuiz(token, quizId, payload);
      } else {
        await createQuiz(token, payload);
      }

      setSuccess(status === 'ready' ? 'Квиз готов к запуску' : 'Черновик сохранен');
      setTimeout(() => navigate('/organizer'), 500);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="workspace builder-layout">
      <form className="builder-form" onSubmit={(event) => handleSubmit(event, 'draft')}>
        <p className="eyebrow">конструктор квиза</p>
        <h1>{isEditing ? 'Редактирование черновика.' : 'Соберите сценарий комнаты.'}</h1>

        {isLoading && <div className="empty-state compact">Загружаем квиз...</div>}

        {!isEditableDraft && (
          <p className="form-error">
            Готовый квиз сначала нужно вернуть в черновик в кабинете организатора.
          </p>
        )}

        <label>
          Название квиза
          <input
            name="title"
            value={quiz.title}
            onChange={updateQuizField}
            disabled={isLoading || !isEditableDraft}
            required
          />
        </label>

        <div className="form-columns">
          <label>
            Категория
            <input
              name="category"
              value={quiz.category}
              onChange={updateQuizField}
              disabled={isLoading || !isEditableDraft}
              required
            />
          </label>
          <label>
            Время на вопрос
            <input
              name="timeLimitSeconds"
              type="number"
              min="10"
              max="300"
              value={quiz.timeLimitSeconds}
              onChange={updateQuizField}
              disabled={isLoading || !isEditableDraft}
              required
            />
          </label>
        </div>

        <label>
          Правила
          <textarea
            name="rules"
            value={quiz.rules}
            onChange={updateQuizField}
            disabled={isLoading || !isEditableDraft}
            required
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}

        <div className="builder-actions">
          <button className="submit-button" type="submit" disabled={isSubmitting || isLoading || !isEditableDraft}>
            <Save size={18} />
            Сохранить черновик
          </button>
          <button
            className="submit-button secondary"
            type="button"
            disabled={isSubmitting || isLoading || !isEditableDraft}
            onClick={(event) => handleSubmit(event, 'ready')}
          >
            <Check size={18} />
            Готов к запуску
          </button>
        </div>
      </form>

      <section className="question-card">
        <div className="section-title">
          <h2>Вопросы</h2>
          <button
            className="mini-button"
            type="button"
            onClick={addQuestion}
            disabled={isLoading || !isEditableDraft}
          >
            <Plus size={17} />
            Добавить
          </button>
        </div>

        <div className="question-tabs">
          {quiz.questions.map((question, index) => (
            <button
              key={`${question.text}-${index}`}
              type="button"
              className={index === activeQuestionIndex ? 'selected' : ''}
              onClick={() => setActiveQuestionIndex(index)}
              disabled={isLoading}
            >
              {index + 1}
            </button>
          ))}
        </div>

        <label>
          Текст вопроса
          <textarea
            value={activeQuestion.text}
            onChange={(event) => updateQuestionField('text', event.target.value)}
            disabled={isLoading || !isEditableDraft}
            required
          />
        </label>

        <label>
          Ссылка на изображение
          <span>
            <ImagePlus size={18} />
            <input
              value={activeQuestion.imageUrl}
              onChange={(event) => updateQuestionField('imageUrl', event.target.value)}
              placeholder="https://example.com/image.jpg"
              disabled={isLoading || !isEditableDraft}
            />
          </span>
        </label>

        <div className="role-switch question-type" aria-label="Тип вопроса">
          <button
            type="button"
            className={activeQuestion.type === 'single' ? 'selected' : ''}
            onClick={() => changeQuestionType('single')}
            disabled={isLoading || !isEditableDraft}
          >
            Один ответ
          </button>
          <button
            type="button"
            className={activeQuestion.type === 'multiple' ? 'selected' : ''}
            onClick={() => changeQuestionType('multiple')}
            disabled={isLoading || !isEditableDraft}
          >
            Несколько
          </button>
        </div>

        <div className="answer-stack editable">
          {activeQuestion.answers.map((answer, index) => (
            <div key={index} className={answer.isCorrect ? 'answer-editor correct' : 'answer-editor'}>
              <button
                type="button"
                className="check-button"
                onClick={() => updateAnswer(index, 'isCorrect', !answer.isCorrect)}
                aria-label="Отметить правильный ответ"
                disabled={isLoading || !isEditableDraft}
              >
                <Check size={17} />
              </button>
              <input
                value={answer.text}
                onChange={(event) => updateAnswer(index, 'text', event.target.value)}
                placeholder={`Вариант ${index + 1}`}
                disabled={isLoading || !isEditableDraft}
                required
              />
              <button
                type="button"
                className="delete-button"
                onClick={() => removeAnswer(index)}
                aria-label="Удалить вариант"
                disabled={isLoading || !isEditableDraft}
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>

        <div className="builder-actions">
          <button className="mini-button" type="button" onClick={addAnswer} disabled={isLoading || !isEditableDraft}>
            <ListPlus size={17} />
            Добавить вариант
          </button>
          <button
            className="mini-button danger"
            type="button"
            onClick={() => removeQuestion(activeQuestionIndex)}
            disabled={isLoading || !isEditableDraft}
          >
            <Trash2 size={17} />
            Удалить вопрос
          </button>
        </div>
      </section>
    </main>
  );
}
