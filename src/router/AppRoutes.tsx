import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

// Páginas
import Login from '../pages/Login';
import Home from '../pages/Home';
import Establishment from '../pages/Establishment';
import EstablishmentDetails from '../pages/EstablishmentDetails';
import Users from '../pages/Users';
import UserDetails from '../pages/UserDetails';
import Cities from '../pages/Cities';
import Banners from '../pages/Banners';
import Advertisements from '../pages/Advertisements';
import Categories from '../pages/Categories';
import Finance from '../pages/Finance';
import Coupons from '../pages/Coupons';
import CommunicationCenter from '../pages/CommunicationCenter';
import PlatformFees from '../pages/PlatformFees';
import OrderReports from '../pages/OrderReports';

// Componente de rota protegida
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Componente de rota pública (redireciona se autenticado)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Rota pública - Login */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Rotas protegidas */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

      <Route
        path="/establishment"
        element={
          <ProtectedRoute>
            <Establishment />
          </ProtectedRoute>
        }
      />

      <Route
        path="/establishment/:id"
        element={
          <ProtectedRoute>
            <EstablishmentDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Users />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users/:id"
        element={
          <ProtectedRoute>
            <UserDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/Cities"
        element={
          <ProtectedRoute>
            <Cities />
          </ProtectedRoute>
        }
      />

      <Route
        path="/Banners"
        element={
          <ProtectedRoute>
            <Banners />
          </ProtectedRoute>
        }
      />

      <Route
        path="/Advertisements"
        element={
          <ProtectedRoute>
            <Advertisements />
          </ProtectedRoute>
        }
      />

      <Route
        path="/Categories"
        element={
          <ProtectedRoute>
            <Categories />
          </ProtectedRoute>
        }
      />

      <Route
        path="/Finance"
        element={
          <ProtectedRoute>
            <Finance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/Coupons"
        element={
          <ProtectedRoute>
            <Coupons />
          </ProtectedRoute>
        }
      />

      <Route
        path="/communication-center"
        element={
          <ProtectedRoute>
            <CommunicationCenter />
          </ProtectedRoute>
        }
      />

      <Route
        path="/platform-fees"
        element={
          <ProtectedRoute>
            <PlatformFees />
          </ProtectedRoute>
        }
      />

      <Route
        path="/order-reports"
        element={
          <ProtectedRoute>
            <OrderReports />
          </ProtectedRoute>
        }
      />

      {/* Rota padrão - redireciona para home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;

