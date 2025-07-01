import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Admin</h2>
        <div className="user-info">
          <span>{user?.displayName || user?.email}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          Dashboard
        </Link>
        <Link
          to="/establishment"
          className={location.pathname.includes('/establishment') ? 'active' : ''}
        >
          Estabelecimentos
        </Link>
        <Link
          to="/users"
          className={location.pathname.includes('/users') ? 'active' : ''}
        >
          Usuários
        </Link>
        <Link
          to="/Cities"
          className={location.pathname === '/Cities' ? 'active' : ''}
        >
          Cidades
        </Link>
        <Link
          to="/Banners"
          className={location.pathname === '/Banners' ? 'active' : ''}
        >
          Banners
        </Link>
        <Link
          to="/Advertisements"
          className={location.pathname === '/Advertisements' ? 'active' : ''}
        >
          Anúncios
        </Link>
        <Link
          to="/Categories"
          className={location.pathname === '/Categories' ? 'active' : ''}
        >
          Categorias
        </Link>
        <Link
          to="/Finance"
          className={location.pathname === '/Finance' ? 'active' : ''}
        >
          Financeiro
        </Link>
        <Link
          to="/Plans"
          className={location.pathname === '/Plans' ? 'active' : ''}
        >
          Planos
        </Link>
        <Link
          to="/Coupons"
          className={location.pathname === '/Coupons' ? 'active' : ''}
        >
          Cupons
        </Link>
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-button">
          Sair
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 