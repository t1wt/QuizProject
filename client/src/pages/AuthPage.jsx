import { Link } from 'react-router-dom';
import { KeyRound, Mail, UserRound } from 'lucide-react';

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';

  return (
    <main className="page-grid auth-grid">
      <section className="page-heading">
        <p className="eyebrow">{isRegister ? 'новый профиль' : 'возвращение в эфир'}</p>
        <h1>{isRegister ? 'Создайте аккаунт PulseQuiz.' : 'Войдите в свой кабинет.'}</h1>
        <p>
          Используйте один профиль для создания квизов, участия в комнатах и
          просмотра результатов.
        </p>
      </section>

      <form className="form-panel">
        {isRegister && (
          <label>
            Имя
            <span>
              <UserRound size={18} />
              <input type="text" placeholder="Например, Тимур" />
            </span>
          </label>
        )}

        <label>
          Email
          <span>
            <Mail size={18} />
            <input type="email" placeholder="name@example.com" />
          </span>
        </label>

        <label>
          Пароль
          <span>
            <KeyRound size={18} />
            <input type="password" placeholder="Минимум 6 символов" />
          </span>
        </label>

        {isRegister && (
          <div className="role-switch" aria-label="Выбор роли">
            <button type="button" className="selected">Организатор</button>
            <button type="button">Участник</button>
          </div>
        )}

        <button className="submit-button" type="button">
          {isRegister ? 'Зарегистрироваться' : 'Войти'}
        </button>

        <p className="form-note">
          {isRegister ? 'Уже есть аккаунт?' : 'Еще нет аккаунта?'}{' '}
          <Link to={isRegister ? '/login' : '/register'}>
            {isRegister ? 'Войти' : 'Создать'}
          </Link>
        </p>
      </form>
    </main>
  );
}
