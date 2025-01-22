import React, { useState, useEffect } from 'react';
import './styles.css';

interface DashboardData {
  totalCustomers: number;
  totalSellers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  averageOrderValue: number;
}

const Reports: React.FC = () => {
  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getFirstDayOfMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getCurrentDate());
  const [isLoading, setIsLoading] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const formatDateForApi = (date: string) => {
    const [year, month, day] = date.split('-');
    return `${year}-${month}-${day}`;
  };

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('@AdminApp:token');
      
      if (!token) {
        alert('Token não encontrado. Por favor, faça login novamente.');
        window.location.href = '/login';
        return;
      }

      setIsLoading(true);
      const formattedStartDate = formatDateForApi(startDate);
      const formattedEndDate = formatDateForApi(endDate);
      
      const response = await fetch(
        `http://localhost:8080/api/admin/dashboard?startDate=${formattedStartDate}&endDate=${formattedEndDate}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Resposta da API:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Erro ao buscar dashboard: Status ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Dados do dashboard:', data);
      setDashboard(data);
    } catch (error: any) {
      console.error('Erro detalhado:', error);
      alert(`Erro ao carregar dashboard: ${error?.message || 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []); // Carrega os dados iniciais

  const handleSearch = () => {
    fetchDashboard();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="reports-container">
      <header className="page-header">
        <div className="header-content">
          <h1>Dashboard Administrativo</h1>
        </div>
        <div className="date-filters">
          <div className="form-group">
            <label htmlFor="startDate">Data Inicial</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="endDate">Data Final</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button 
            className="search-button"
            onClick={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? 'Carregando...' : 'Buscar'}
          </button>
        </div>
      </header>

      {isLoading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Carregando dados...</p>
        </div>
      )}

      {dashboard && !isLoading && (
        <div className="reports-grid">
          <section className="report-section">
            <h2>Métricas de Usuários</h2>
            <div className="metrics-grid">
              <div className="metric-card">
                <h3>Total de Clientes</h3>
                <div className="metric-value">{dashboard.totalCustomers}</div>
              </div>
              <div className="metric-card">
                <h3>Total de Vendedores</h3>
                <div className="metric-value">{dashboard.totalSellers}</div>
              </div>
              <div className="metric-card">
                <h3>Total de Produtos</h3>
                <div className="metric-value">{dashboard.totalProducts}</div>
              </div>
            </div>
          </section>

          <section className="report-section">
            <h2>Métricas de Pedidos</h2>
            <div className="metrics-grid">
              <div className="metric-card">
                <h3>Total de Pedidos</h3>
                <div className="metric-value">{dashboard.totalOrders}</div>
              </div>
              <div className="metric-card">
                <h3>Ticket Médio</h3>
                <div className="metric-value">
                  {formatCurrency(dashboard.averageOrderValue)}
                </div>
              </div>
              <div className="metric-card">
                <h3>Receita Total</h3>
                <div className="metric-value">
                  {formatCurrency(dashboard.totalRevenue)}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {!dashboard && !isLoading && (
        <div className="no-results">
          <p>Selecione um período para visualizar o dashboard</p>
        </div>
      )}
    </div>
  );
};

export default Reports; 