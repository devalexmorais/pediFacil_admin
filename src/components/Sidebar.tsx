import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const menuItems = [
    { 
      path: '/', 
      label: 'Dashboard', 
      icon: '📊',
      active: location.pathname === '/'
    },
    { 
      path: '/establishment', 
      label: 'Estabelecimentos', 
      icon: '🏪',
      active: location.pathname.includes('/establishment')
    },
    { 
      path: '/users', 
      label: 'Usuários', 
      icon: '👥',
      active: location.pathname.includes('/users')
    },
    { 
      path: '/Cities', 
      label: 'Cidades', 
      icon: '🏙️',
      active: location.pathname === '/Cities'
    },
    { 
      path: '/Banners', 
      label: 'Banners', 
      icon: '🖼️',
      active: location.pathname === '/Banners'
    },
    { 
      path: '/Advertisements', 
      label: 'Anúncios', 
      icon: '📢',
      active: location.pathname === '/Advertisements'
    },
    { 
      path: '/Categories', 
      label: 'Categorias', 
      icon: '📂',
      active: location.pathname === '/Categories'
    },
    { 
      path: '/Finance', 
      label: 'Financeiro', 
      icon: '💰',
      active: location.pathname === '/Finance'
    },
    { 
      path: '/Coupons', 
      label: 'Cupons', 
      icon: '🎫',
      active: location.pathname === '/Coupons'
    },
    { 
      path: '/communication-center', 
      label: 'Central de Comunicação', 
      icon: '📢',
      active: location.pathname === '/communication-center'
    },
    { 
      path: '/platform-fees', 
      label: 'Taxas da Plataforma', 
      icon: '⚙️',
      active: location.pathname === '/platform-fees'
    }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">⚙️</span>
          <h2 className="logo-text">Admin</h2>
        </div>
        <div className="user-info">
          <span className="user-avatar">👤</span>
          <span className="user-name">{user?.displayName || user?.email}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${item.active ? 'active' : ''}`}
            title={item.label}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-text">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-button" title="Sair">
          <span className="logout-icon">🚪</span>
          <span className="logout-text">Sair</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 