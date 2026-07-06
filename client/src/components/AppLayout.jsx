import { NavLink, Outlet } from 'react-router-dom';
import { LogIn, LogOut, RadioTower, UserPlus } from 'lucide-react';
import { useAuth } from '../services/AuthContext.jsx';

export default function AppLayout() {
  const { isAuthenticated, logout, user } = useAuth();
  const navItems = isAuthenticated
    ? user.role === 'organizer'
      ? [
          { to: '/organizer', label: 'Мои квизы' },
          { to: '/results', label: 'История' },
        ]
      : [
          { to: '/participant', label: 'Кабинет' },
          { to: '/room', label: 'Войти по коду' },
          { to: '/results', label: 'История' },
        ]
    : [
        { to: '/', label: 'Обзор' },
      ];
  const roleLabel = user?.role === 'organizer' ? 'организатор' : 'участник';

  return (
    <div className="site-frame">
      <header className="topbar">
        <NavLink className="brand-row" to="/" aria-label="Project.Quiz">
          <span className="brand-mark">
            <RadioTower size={22} />
          </span>
          <span className="brand-copy">
            <span>Project.Quiz</span>
            <small>live quiz room</small>
          </span>
        </NavLink>

        <nav className="main-nav" aria-label="Основная навигация">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {isAuthenticated ? (
          <div className="topbar-actions user-actions">
            <NavLink
              className="user-card"
              to={user.role === 'organizer' ? '/organizer' : '/participant'}
            >
              <span>{user.name}</span>
              <small>{roleLabel}</small>
            </NavLink>
            <button className="primary-link" type="button" onClick={logout}>
              <LogOut size={18} />
              <span>Выйти</span>
            </button>
          </div>
        ) : (
          <div className="topbar-actions">
            <NavLink className="icon-link" to="/login" title="Войти">
              <LogIn size={18} />
              <span>Вход</span>
            </NavLink>
            <NavLink className="primary-link" to="/register">
              <UserPlus size={18} />
              <span>Регистрация</span>
            </NavLink>
          </div>
        )}
      </header>

      <Outlet />
    </div>
  );
}
