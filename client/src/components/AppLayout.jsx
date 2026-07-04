import { NavLink, Outlet } from 'react-router-dom';
import { LogIn, RadioTower, UserPlus } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Обзор' },
  { to: '/organizer', label: 'Организатор' },
  { to: '/participant', label: 'Участник' },
  { to: '/builder', label: 'Конструктор' },
  { to: '/room', label: 'Комната' },
  { to: '/results', label: 'Итоги' },
];

export default function AppLayout() {
  return (
    <div className="site-frame">
      <header className="topbar">
        <NavLink className="brand-row" to="/" aria-label="PulseQuiz">
          <span className="brand-mark">
            <RadioTower size={22} />
          </span>
          <span>PulseQuiz</span>
        </NavLink>

        <nav className="main-nav" aria-label="Основная навигация">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>

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
      </header>

      <Outlet />
    </div>
  );
}
