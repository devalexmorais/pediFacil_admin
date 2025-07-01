import { Route, Routes, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import Login from '../pages/Login';
import Home from '../pages/Home';
import Establishment from '../pages/Establishment';
import EstablishmentDetails from '../pages/EstablishmentDetails';
import Users from '../pages/Users';
import Cities from '../pages/Cities';
import Banners from '../pages/Banners';
import Advertisements from '../pages/Advertisements';
import Categories from '../pages/Categories';
import Finance from '../pages/Finance';
import Plans from '../pages/Plans';
import UserDetails from '../pages/UserDetails';
import Coupons from '../pages/Coupons';
import CityDistricts from '../pages/CityDistricts';

// Componente para proteger rotas
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/" /> : <Login />} 
      />
      
      {/* Rotas protegidas */}
      <Route path="/" element={
        <PrivateRoute>
          <Home />
        </PrivateRoute>
      } />
      <Route path="/establishment" element={
        <PrivateRoute>
          <Establishment />
        </PrivateRoute>
      } />
      <Route path="/establishment/:id" element={
        <PrivateRoute>
          <EstablishmentDetails />
        </PrivateRoute>
      } />
      <Route path="/users" element={
        <PrivateRoute>
          <Users />
        </PrivateRoute>
      } />
      <Route path="/users/:id" element={
        <PrivateRoute>
          <UserDetails />
        </PrivateRoute>
      } />
      <Route path="/Cities" element={
        <PrivateRoute>
          <Cities />
        </PrivateRoute>
      } />
      <Route path="/Banners" element={
        <PrivateRoute>
          <Banners />
        </PrivateRoute>
      } />
      <Route path="/Advertisements" element={
        <PrivateRoute>
          <Advertisements />
        </PrivateRoute>
      } />
      <Route path="/Categories" element={
        <PrivateRoute>
          <Categories />
        </PrivateRoute>
      } />
      <Route path="/Finance" element={
        <PrivateRoute>
          <Finance />
        </PrivateRoute>
      } />
      <Route path="/Plans" element={
        <PrivateRoute>
          <Plans />
        </PrivateRoute>
      } />
      <Route path="/Coupons" element={
        <PrivateRoute>
          <Coupons />
        </PrivateRoute>
      } />
      <Route path="/cities" element={
        <PrivateRoute>
          <Cities />
        </PrivateRoute>
      } />
      <Route path="/cities/:cityId/districts" element={
        <PrivateRoute>
          <CityDistricts />
        </PrivateRoute>
      } />

      {/* Redireciona qualquer rota não encontrada para o login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes; 