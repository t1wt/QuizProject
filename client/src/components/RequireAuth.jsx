import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/AuthContext.jsx';

export default function RequireAuth({ children, role }) {
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <main className="workspace">
        <section className="empty-state">Проверяем сессию...</section>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'organizer' ? '/organizer' : '/participant'} replace />;
  }

  return children;
}
