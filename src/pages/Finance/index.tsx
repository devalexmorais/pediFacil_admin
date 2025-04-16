import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import './styles.css';

interface MonthlyMetrics {
  period: {
    startDate: string;
    endDate: string;
  };
  metrics: {
    totalOrders: number;
    grossRevenue: number;
    netRevenue: number;
    totalDiscounts: number;
    deliveryFees: number;
  };
}

// Meses que tiveram uso (você pode adicionar ou remover conforme necessário)
const availableMonths = [
  { month: 3, year: 2024, label: 'Março 2024' },
  { month: 1, year: 2024, label: 'Janeiro 2024' },
  { month: 12, year: 2023, label: 'Dezembro 2023' }
];

const Finance = () => {
  const [selectedMonth, setSelectedMonth] = useState(availableMonths[0].month);
  const [selectedYear, setSelectedYear] = useState(availableMonths[0].year);
  const [monthlyMetrics, setMonthlyMetrics] = useState<MonthlyMetrics>({
    period: {
      startDate: '',
      endDate: ''
    },
    metrics: {
      totalOrders: 0,
      grossRevenue: 0,
      netRevenue: 0,
      totalDiscounts: 0,
      deliveryFees: 0
    }
  });

  useEffect(() => {
    const fetchMonthlyMetrics = async () => {
      try {
        // Criar timestamps para o início e fim do mês selecionado
        const startDate = new Date(selectedYear, selectedMonth - 1, 1);
        const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
        
        const startTimestamp = Timestamp.fromDate(startDate);
        const endTimestamp = Timestamp.fromDate(endDate);

        // Buscar pedidos do período
        const ordersQuery = query(
          collection(db, 'orders'),
          where('createdAt', '>=', startTimestamp),
          where('createdAt', '<=', endTimestamp)
        );
        
        const ordersSnapshot = await getDocs(ordersQuery);
        
        // Calcular métricas
        let grossRevenue = 0;
        let totalDiscounts = 0;
        let deliveryFees = 0;
        
        ordersSnapshot.docs.forEach(doc => {
          const orderData = doc.data();
          grossRevenue += orderData.subtotal || 0;
          totalDiscounts += orderData.discount || 0;
          deliveryFees += orderData.deliveryFee || 0;
        });

        const netRevenue = grossRevenue - totalDiscounts;

        setMonthlyMetrics({
          period: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          },
          metrics: {
            totalOrders: ordersSnapshot.size,
            grossRevenue,
            netRevenue,
            totalDiscounts,
            deliveryFees
          }
        });
      } catch (error) {
        console.error('Erro ao buscar métricas mensais:', error);
      }
    };

    fetchMonthlyMetrics();
  }, [selectedMonth, selectedYear]);

  const handleMonthChange = (value: string) => {
    const [month, year] = value.split('-').map(Number);
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  return (
    <div className="finance-container">
      <header className="page-header">
        <div className="header-content">
          <h1>Financeiro</h1>
          <div className="header-actions">
            <select 
              className="period-select"
              value={`${selectedMonth}-${selectedYear}`}
              onChange={(e) => handleMonthChange(e.target.value)}
            >
              {availableMonths.map(({ month, year, label }) => (
                <option key={`${month}-${year}`} value={`${month}-${year}`}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="metric-card revenue">
          <h3>Receita Bruta</h3>
          <div className="metric-value">
            R$ {monthlyMetrics.metrics.grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="metric-subtitle">
            Total de vendas
          </div>
        </div>

        <div className="metric-card orders">
          <h3>Total de Pedidos</h3>
          <div className="metric-value">
            {monthlyMetrics.metrics.totalOrders}
          </div>
          <div className="metric-subtitle">
            pedidos realizados
          </div>
        </div>

        <div className="metric-card premium">
          <h3>Taxas de Entrega</h3>
          <div className="metric-value">
            R$ {monthlyMetrics.metrics.deliveryFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="metric-subtitle">
            total de taxas
          </div>
        </div>

        <div className="metric-card net">
          <h3>Receita Líquida</h3>
          <div className="metric-value">
            R$ {monthlyMetrics.metrics.netRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="metric-subtitle">
            após descontos
          </div>
        </div>
      </div>

      <div className="details-grid">
        <div className="summary-card">
          <h3>Resumo Financeiro</h3>
          <div className="summary-content">
            <div className="summary-item">
              <span>Receita Bruta</span>
              <span>R$ {monthlyMetrics.metrics.grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="summary-item">
              <span>Taxas de Entrega</span>
              <span>R$ {monthlyMetrics.metrics.deliveryFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="summary-item">
              <span>Descontos Aplicados</span>
              <span>- R$ {monthlyMetrics.metrics.totalDiscounts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="summary-item total">
              <span>Receita Líquida</span>
              <span>R$ {monthlyMetrics.metrics.netRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Finance; 