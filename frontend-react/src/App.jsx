import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import AboutPage from './pages/AboutPage.jsx';
import SkillsPage from './pages/SkillsPage.jsx';
import ExperiencePage from './pages/ExperiencePage.jsx';
import EducationPage from './pages/EducationPage.jsx';
import CertificationsPage from './pages/CertificationsPage.jsx';
import FitPage from './pages/FitPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import AdminPage from './pages/AdminPage.jsx';

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<AboutPage />} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/experience" element={<ExperiencePage />} />
        <Route path="/education" element={<EducationPage />} />
        <Route path="/certifications" element={<CertificationsPage />} />
        <Route path="/fit" element={<FitPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
