import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './router/AppRoutes';
import './App.css';

function App() {
  // Usa MemoryRouter para Electron, BrowserRouter para desenvolvimento web
  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;
  const Router = isElectron ? MemoryRouter : BrowserRouter;
  
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
