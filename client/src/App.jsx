import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import AuthPage from './pages/AuthPage.jsx';
import BuilderPage from './pages/BuilderPage.jsx';
import HomePage from './pages/HomePage.jsx';
import OrganizerPage from './pages/OrganizerPage.jsx';
import ParticipantPage from './pages/ParticipantPage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';
import RoomPage from './pages/RoomPage.jsx';
import RequireAuth from './components/RequireAuth.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="register" element={<AuthPage mode="register" />} />
        <Route
          path="organizer"
          element={
            <RequireAuth role="organizer">
              <OrganizerPage />
            </RequireAuth>
          }
        />
        <Route
          path="participant"
          element={
            <RequireAuth role="participant">
              <ParticipantPage />
            </RequireAuth>
          }
        />
        <Route
          path="builder"
          element={
            <RequireAuth role="organizer">
              <BuilderPage />
            </RequireAuth>
          }
        />
        <Route path="room" element={<RoomPage />} />
        <Route
          path="results"
          element={
            <RequireAuth>
              <ResultsPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
