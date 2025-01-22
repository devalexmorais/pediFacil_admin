import { useState, useEffect } from 'react';
import axios from 'axios';
import './styles.css';

interface DashboardData {
  totalCustomers: number;
  totalSellers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  averageOrderValue: number;
}

const Home = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalCustomers: 0,
    totalSellers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    averageOrderValue: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('@AdminApp:token');
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];

        const response = await axios.get(`http://localhost:8080/api/admin/dashboard?startDate=${formattedDate}&endDate=${formattedDate}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setDashboardData(response.data);
      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="home-container">
      <header className="page-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1>Dashboard</h1>
            <p className="welcome-subtitle">Visão geral do seu negócio</p>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="metrics-grid">
          <div className="metric-card sales">
            <div className="metric-header">
              <div className="metric-icon">💰</div>
              <h3>Vendas Hoje</h3>
            </div>
            <div className="metric-body">
              <div className="metric-main">
                <div className="metric-value">
                  R$ {dashboardData.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="metric-details">
                <div className="detail-item">
                  <span>Pedidos</span>
                  <span>{dashboardData.totalOrders}</span>
                </div>
                <div className="detail-item">
                  <span>Ticket Médio</span>
                  <span>
                    R$ {dashboardData.averageOrderValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="metric-card establishments">
            <div className="metric-header">
              <div className="metric-icon">🏪</div>
              <h3>Estabelecimentos</h3>
            </div>
            <div className="metric-body">
              <div className="metric-main">
                <div className="metric-value">{dashboardData.totalSellers}</div>
                <div className="metric-subtitle">estabelecimentos cadastrados</div>
              </div>
            </div>
          </div>

          <div className="metric-card users">
            <div className="metric-header">
              <div className="metric-icon">👥</div>
              <h3>Usuários</h3>
            </div>
            <div className="metric-body">
              <div className="metric-main">
                <div className="metric-value">{dashboardData.totalCustomers}</div>
                <div className="metric-subtitle">usuários cadastrados</div>
              </div>
              <div className="metric-details">
                <div className="detail-item">
                  <span>Produtos</span>
                  <span>{dashboardData.totalProducts}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 