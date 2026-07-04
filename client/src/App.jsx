import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import AuthPage from './pages/AuthPage.jsx';
import BuilderPage from './pages/BuilderPage.jsx';
import HomePage from './pages/HomePage.jsx';
import OrganizerPage from './pages/OrganizerPage.jsx';
import ParticipantPage from './pages/ParticipantPage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';
import RoomPage from './pages/RoomPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="register" element={<AuthPage mode="register" />} />
        <Route path="organizer" element={<OrganizerPage />} />
        <Route path="participant" element={<ParticipantPage />} />
        <Route path="builder" element={<BuilderPage />} />
        <Route path="room" element={<RoomPage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
