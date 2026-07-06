import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, Mail, UserRound } from 'lucide-react';
import { useAuth } from '../services/AuthContext.jsx';

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, register, user } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'organizer',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'organizer' ? '/organizer' : '/participant', { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const currentUser = isRegister
        ? await register(form)
        : await login({ email: form.email, password: form.password });
      const fallbackPath = currentUser.role === 'organizer' ? '/organizer' : '/participant';
      navigate(location.state?.from?.pathname || fallbackPath, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-grid auth-grid">
      <section className="page-heading">
        <p className="eyebrow">{isRegister ? 'новый профиль' : 'вход в кабинет'}</p>
        <h1>{isRegister ? 'Создайте аккаунт Project.Quiz.' : 'Войдите в свой кабинет.'}</h1>
        <p>
          Используйте один профиль для создания квизов, участия в комнатах и
          просмотра результатов.
        </p>
      </section>

      <form className="form-panel" onSubmit={handleSubmit}>
        {isRegister && (
          <label>
            Имя
            <span>
              <UserRound size={18} />
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={updateField}
                placeholder="Например, Тимур"
                required
              />
            </span>
          </label>
        )}

        <label>
          Email
          <span>
            <Mail size={18} />
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              placeholder="name@example.com"
              required
            />
          </span>
        </label>

        <label>
          Пароль
          <span>
            <KeyRound size={18} />
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={updateField}
              placeholder="Минимум 6 символов"
              required
            />
          </span>
        </label>

        {isRegister && (
          <div className="role-switch" aria-label="Выбор роли">
            <button
              type="button"
              className={form.role === 'organizer' ? 'selected' : ''}
              onClick={() => setForm((current) => ({ ...current, role: 'organizer' }))}
            >
              Организатор
            </button>
            <button
              type="button"
              className={form.role === 'participant' ? 'selected' : ''}
              onClick={() => setForm((current) => ({ ...current, role: 'participant' }))}
            >
              Участник
            </button>
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        <button className="submit-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Проверяем...' : isRegister ? 'Зарегистрироваться' : 'Войти'}
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
