import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Invoice } from '../../services/invoiceService';
import { Order } from '../../services/orderServices';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './styles.css';


interface Seller {
  id: string;
  name: string;
  email: string;
  phone: string;
  // Endereço
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  // Informações da loja
  store: {
    name: string;
    category: string;
    subcategory: string;
    document: string;
    isPremium: boolean;
    premiumExpiresAt: null | any;
  };
  // Configurações
  settings: {
    delivery: {
      maxTime: string;
      minTime: string;
      minimumOrderAmount: number;
    };
    pickup: {
      enabled: boolean;
      estimatedTime: string;
    };
    schedule: {
      [key: string]: {
        closeTime: string;
        openTime: string;
        isOpen: boolean;
      };
    };
    paymentOptions: {
      cardFlags: Array<{
        name: string;
        enabled: boolean;
        fee: string;
      }>;
    };
  };
  // Recursos premium
  premiumFeatures: {
    advancedReports: boolean;
    analytics: boolean;
    prioritySupport: boolean;
  };
  // Status e datas
  isActive: boolean;
  isOpen: boolean;
  status: string;
  role: string;
  createdAt: any;
  lastUpdated: string;
}

const EstablishmentDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [establishment, setEstablishment] = useState<Seller | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadEstablishmentDetails();
      loadInvoices();
      loadOrders();
    }
  }, [id]);

  const loadInvoices = async () => {
    if (!id) return;
    try {
      // Busca as invoices como subcoleção dentro do documento do estabelecimento
      const invoicesCollection = collection(db, 'partners', id, 'invoices');
      const querySnapshot = await getDocs(invoicesCollection);
      
      const storeInvoices: Invoice[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        storeInvoices.push({
          id: doc.id,
          ...data
        } as Invoice);
      });
      
      console.log(`Encontradas ${storeInvoices.length} faturas para o estabelecimento ${id}`);
      setInvoices(storeInvoices);
    } catch (error) {
      console.error('Erro ao carregar faturas:', error);
    }
  };

  const loadOrders = async () => {
    if (!id) return;
    try {
      // Busca os pedidos como subcoleção dentro do documento do estabelecimento
      const ordersCollection = collection(db, 'partners', id, 'orders');
      const q = query(ordersCollection, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const sellerOrders: Order[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Debug: Log para ver a estrutura dos dados
        if (sellerOrders.length === 0) {
          console.log('Exemplo de dados do pedido:', data);
          console.log('Campos disponíveis:', Object.keys(data));
        }
        
        sellerOrders.push({
          id: doc.id,
          ...data
        } as Order);
      });
      
      console.log(`Encontrados ${sellerOrders.length} pedidos para o estabelecimento ${id}`);
      if (sellerOrders.length > 0) {
        console.log('Primeiro pedido (exemplo):', sellerOrders[0]);
      }
      setOrders(sellerOrders);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

  const loadEstablishmentDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const docRef = doc(db, 'partners', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Estabelecimento não encontrado');
      }

      const data = docSnap.data();
      
      // Debug: log dos dados completos para verificar a estrutura
      console.log('Dados completos do estabelecimento:', data);
      console.log('Campos de endereço diretos:', {
        street: data.street,
        number: data.number,
        complement: data.complement,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state
      });
      console.log('Possível objeto address:', data.address);
      
      setEstablishment({
        id: docSnap.id,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        // Usar os campos com "Name" que contêm os nomes legíveis
        street: data.address?.street || data.street || '',
        number: data.address?.number || data.number || '',
        complement: data.address?.complement || data.complement || '',
        neighborhood: data.address?.neighborhoodName || data.neighborhoodName || data.neighborhood || '',
        city: data.address?.cityName || data.cityName || data.city || '',
        state: data.address?.stateName || data.stateName || data.state || '',
        store: {
          name: data.store?.name || '',
          category: data.store?.category || '',
          subcategory: data.store?.subcategory || '',
          document: data.store?.document || '',
          isPremium: data.store?.isPremium || false,
          premiumExpiresAt: data.store?.premiumExpiresAt || null
        },
        settings: {
          delivery: {
            maxTime: data.settings?.delivery?.maxTime || '45',
            minTime: data.settings?.delivery?.minTime || '30',
            minimumOrderAmount: Number(data.settings?.delivery?.minimumOrderAmount) || 0
          },
          pickup: {
            enabled: data.settings?.pickup?.enabled || false,
            estimatedTime: data.settings?.pickup?.estimatedTime || '15'
          },
          schedule: data.settings?.schedule || {},
          paymentOptions: {
            cardFlags: data.settings?.paymentOptions?.cardFlags || []
          }
        },
        premiumFeatures: {
          advancedReports: data.premiumFeatures?.advancedReports || false,
          analytics: data.premiumFeatures?.analytics || false,
          prioritySupport: data.premiumFeatures?.prioritySupport || false
        },
        isActive: data.isActive || false,
        isOpen: data.isOpen || false,
        status: data.status || 'pending',
        role: data.role || 'partner',
        createdAt: data.createdAt,
        lastUpdated: data.lastUpdated || ''
      });
    } catch (err) {
      console.error('Erro ao carregar detalhes:', err);
      setError('Erro ao carregar detalhes do estabelecimento');
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando detalhes do estabelecimento...</p>
      </div>
    );
  }

  if (error || !establishment) {
    return (
      <div className="error-container">
        <p>{error || 'Estabelecimento não encontrado'}</p>
        <button onClick={() => navigate(-1)} className="back-button">
          Voltar
        </button>
      </div>
    );
  }

  const formatDate = (date: any) => {
    if (!date) return 'Data não informada';
    
    // Se for um Timestamp do Firebase
    if (date && typeof date.toDate === 'function') {
      return date.toDate().toLocaleDateString('pt-BR');
    }
    
    // Se for uma string de data
    if (typeof date === 'string') {
      return new Date(date).toLocaleDateString('pt-BR');
    }
    
    // Se for um número (timestamp)
    if (typeof date === 'number') {
      return new Date(date).toLocaleDateString('pt-BR');
    }
    
    // Se já for uma Date
    if (date instanceof Date) {
      return date.toLocaleDateString('pt-BR');
    }
    
    return 'Data inválida';
  };

  const formatCurrency = (value: any) => {
    const numValue = Number(value) || 0;
    return numValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'pago':
        return 'status-paid';
      case 'overdue':
      case 'atrasado':
        return 'status-late';
      case 'pending':
      case 'pendente':
        return 'status-pending';
      default:
        return 'status-pending';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
      case 'pago':
        return 'Pago';
      case 'overdue':
      case 'atrasado':
        return 'Atrasado';
      case 'pending':
      case 'pendente':
        return 'Pendente';
      default:
        return 'Pendente';
    }
  };

  // Função helper para obter o valor total do pedido
  const getOrderTotal = (order: any): number => {
    // Tenta diferentes campos possíveis para o total
    if (order.total && typeof order.total === 'number') return order.total;
    if (order.totalAmount && typeof order.totalAmount === 'number') return order.totalAmount;
    if (order.amount && typeof order.amount === 'number') return order.amount;
    if (order.totalPrice && typeof order.totalPrice === 'number') return order.totalPrice;
    if (order.price && typeof order.price === 'number') return order.price;
    
    // Se tiver itens, calcula a partir deles
    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      const itemsTotal = order.items.reduce((sum: number, item: any) => {
        const price = item.price || item.unitPrice || 0;
        const quantity = item.quantity || 1;
        return sum + (price * quantity);
      }, 0);
      return itemsTotal;
    }
    
    return 0;
  };

  // Função helper para obter a taxa de entrega
  const getDeliveryFee = (order: any): number => {
    if (order.deliveryFee && typeof order.deliveryFee === 'number') return order.deliveryFee;
    if (order.delivery_fee && typeof order.delivery_fee === 'number') return order.delivery_fee;
    if (order.shippingFee && typeof order.shippingFee === 'number') return order.shippingFee;
    if (order.shipping_fee && typeof order.shipping_fee === 'number') return order.shipping_fee;
    if (order.frete && typeof order.frete === 'number') return order.frete;
    return 0;
  };

  // Funções para calcular estatísticas dos pedidos
  const getOrderStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'not_delivered': 'Não Entregue',
      'delivered': 'Entregue',
      'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
  };

  const calculateOrderStats = () => {
    const notDelivered = orders.filter(o => o.status === 'not_delivered').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    const totalRevenue = orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, order) => sum + getOrderTotal(order), 0);
    
    const stats = {
      total: orders.length,
      notDelivered,
      delivered,
      cancelled,
      totalRevenue,
      cancelRate: orders.length > 0 ? (cancelled / orders.length) * 100 : 0,
      deliveryRate: orders.length > 0 ? (delivered / orders.length) * 100 : 0,
      avgTicket: delivered > 0 ? totalRevenue / delivered : 0
    };
    return stats;
  };

  const getOrdersByStatusData = () => {
    const stats = calculateOrderStats();
    return [
      { name: 'Não Entregue', value: stats.notDelivered, color: '#FFA500' },
      { name: 'Entregue', value: stats.delivered, color: '#28a745' },
      { name: 'Cancelado', value: stats.cancelled, color: '#dc3545' }
    ].filter(item => item.value > 0);
  };

  const getCancelmentAlert = () => {
    const stats = calculateOrderStats();
    if (stats.cancelRate > 30) {
      return { level: 'critical', message: '⚠️ CRÍTICO: Taxa de cancelamento muito alta!' };
    } else if (stats.cancelRate > 20) {
      return { level: 'warning', message: '⚠️ ATENÇÃO: Taxa de cancelamento elevada!' };
    } else if (stats.cancelRate > 10) {
      return { level: 'moderate', message: '⚠️ Taxa de cancelamento moderada' };
    }
    return { level: 'good', message: '✅ Taxa de cancelamento saudável' };
  };

  const getOrdersByMonthData = () => {
    const monthlyData: { [key: string]: { total: number; cancelled: number; delivered: number; revenue: number; sortKey: string } } = {};
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    orders.forEach(order => {
      if (order.createdAt) {
        const date = order.createdAt.toDate();
        const month = date.getMonth();
        const year = date.getFullYear();
        const monthKey = `${monthNames[month]}/${year}`;
        const sortKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { total: 0, cancelled: 0, delivered: 0, revenue: 0, sortKey };
        }
        
        monthlyData[monthKey].total += 1;
        
        if (order.status === 'delivered') {
          monthlyData[monthKey].delivered += 1;
          monthlyData[monthKey].revenue += getOrderTotal(order);
        } else if (order.status === 'cancelled') {
          monthlyData[monthKey].cancelled += 1;
        }
      }
    });

    return Object.entries(monthlyData)
      .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
      .map(([month, data]) => ({
        month,
        total: data.total,
        entregues: data.delivered,
        cancelados: data.cancelled,
        receita: data.revenue
      }));
  };

  const getDetailedMonthlyStats = () => {
    const monthlyData: { 
      [key: string]: { 
        total: number; 
        delivered: number; 
        notDelivered: number;
        cancelled: number; 
        revenue: number;
        sortKey: string;
      } 
    } = {};
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    orders.forEach(order => {
      if (order.createdAt) {
        const date = order.createdAt.toDate();
        const month = date.getMonth();
        const year = date.getFullYear();
        const monthKey = `${monthNames[month]}/${year}`;
        const sortKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { 
            total: 0, 
            delivered: 0, 
            notDelivered: 0,
            cancelled: 0, 
            revenue: 0,
            sortKey 
          };
        }
        
        monthlyData[monthKey].total += 1;
        
        if (order.status === 'delivered') {
          monthlyData[monthKey].delivered += 1;
          monthlyData[monthKey].revenue += getOrderTotal(order);
        } else if (order.status === 'not_delivered') {
          monthlyData[monthKey].notDelivered += 1;
        } else if (order.status === 'cancelled') {
          monthlyData[monthKey].cancelled += 1;
        }
      }
    });

    return Object.entries(monthlyData)
      .sort((a, b) => b[1].sortKey.localeCompare(a[1].sortKey)) // Ordem decrescente (mais recente primeiro)
      .map(([month, data]) => ({
        month,
        total: data.total,
        delivered: data.delivered,
        notDelivered: data.notDelivered,
        cancelled: data.cancelled,
        cancelRate: data.total > 0 ? ((data.cancelled / data.total) * 100).toFixed(1) : '0',
        deliveryRate: data.total > 0 ? ((data.delivered / data.total) * 100).toFixed(1) : '0',
        revenue: data.revenue,
        avgTicket: data.delivered > 0 ? (data.revenue / data.delivered) : 0
      }));
  };

  if (loading) {
    return (
      <div className="establishment-details">
        <button 
          className="back-button"
          onClick={() => navigate(-1)}
        >
          Voltar
        </button>
        <div className="loading">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="establishment-details">
      <button 
        className="back-button"
        onClick={() => navigate(-1)}
      >
          Voltar
      </button>

      <div className="details-header">
        <h1>{establishment.store.name}</h1>
        <div className="status-container">
          <div className="status-item">
            <span className="status-label">Status da Conta:</span>
            <span className={`status-badge ${!establishment.isActive ? 'inactive' : 'active'}`}>
              {establishment.isActive ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Funcionamento:</span>
            <span className={`status-badge ${!establishment.isOpen ? 'closed' : 'open'}`}>
              {establishment.isOpen ? 'Aberto' : 'Fechado'}
            </span>
          </div>
        </div>
      </div>

      <div className="details-content">
        <section className="info-section">
          <h2>Informações Gerais</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Nome do Responsável</span>
              <span className="value">{establishment.name}</span>
            </div>
            <div className="info-item">
              <span className="label">Email</span>
              <span className="value">{establishment.email}</span>
            </div>
            <div className="info-item">
              <span className="label">Telefone</span>
              <span className="value">{establishment.phone}</span>
            </div>
            <div className="info-item">
              <span className="label">Documento</span>
              <span className="value">{establishment.store.document}</span>
            </div>
            <div className="info-item">
              <span className="label">Status da Conta</span>
              <span className="value">{establishment.status}</span>
            </div>
            <div className="info-item">
              <span className="label">Tipo de Conta</span>
              <span className="value">{establishment.store.isPremium ? 'Premium' : 'Básica'}</span>
            </div>
          </div>
        </section>

        <section className="info-section">
          <h2>Endereço</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Rua</span>
              <span className="value">{establishment.street}</span>
            </div>
            <div className="info-item">
              <span className="label">Número</span>
              <span className="value">{establishment.number}</span>
            </div>
            <div className="info-item">
              <span className="label">Complemento</span>
              <span className="value">{establishment.complement || 'Não informado'}</span>
            </div>
            <div className="info-item">
              <span className="label">Bairro</span>
              <span className="value">{establishment.neighborhood}</span>
            </div>
            <div className="info-item">
              <span className="label">Cidade</span>
              <span className="value">{establishment.city}</span>
            </div>
            <div className="info-item">
              <span className="label">Estado</span>
              <span className="value">{establishment.state}</span>
            </div>
          </div>
        </section>

        <section className="info-section">
          <h2>Configurações de Entrega</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Tempo Mínimo</span>
              <span className="value">{establishment.settings.delivery.minTime} minutos</span>
            </div>
            <div className="info-item">
              <span className="label">Tempo Máximo</span>
              <span className="value">{establishment.settings.delivery.maxTime} minutos</span>
            </div>
            <div className="info-item">
              <span className="label">Pedido Mínimo</span>
              <span className="value">R$ {Number(establishment.settings.delivery.minimumOrderAmount || 0).toFixed(2)}</span>
            </div>
            <div className="info-item">
              <span className="label">Retirada no Local</span>
              <span className="value">{establishment.settings.pickup.enabled ? 'Sim' : 'Não'}</span>
            </div>
            {establishment.settings.pickup.enabled && (
              <div className="info-item">
                <span className="label">Tempo Estimado para Retirada</span>
                <span className="value">{establishment.settings.pickup.estimatedTime} minutos</span>
              </div>
            )}
          </div>
        </section>

        <section className="info-section">
          <h2>Horário de Funcionamento</h2>
          <div className="schedule-grid">
            {Object.entries(establishment.settings.schedule).map(([day, schedule]) => (
              <div key={day} className="schedule-item">
                <span className="day">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                {schedule.isOpen ? (
                  <span className="hours">{schedule.openTime} - {schedule.closeTime}</span>
                ) : (
                  <span className="closed">Fechado</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="info-section">
          <h2>Formas de Pagamento</h2>
          <div className="payment-grid">
            {establishment.settings.paymentOptions.cardFlags.map((card, index) => (
              <div key={index} className={`payment-item ${!card.enabled ? 'disabled' : ''}`}>
                <span className="card-name">{card.name}</span>
                {card.enabled && <span className="card-fee">Taxa: {card.fee}%</span>}
              </div>
            ))}
          </div>
        </section>

        <section className="info-section">
          <h2>Recursos Premium</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Relatórios Avançados</span>
              <span className="value">{establishment.premiumFeatures.advancedReports ? 'Sim' : 'Não'}</span>
            </div>
            <div className="info-item">
              <span className="label">Analytics</span>
              <span className="value">{establishment.premiumFeatures.analytics ? 'Sim' : 'Não'}</span>
            </div>
            <div className="info-item">
              <span className="label">Suporte Prioritário</span>
              <span className="value">{establishment.premiumFeatures.prioritySupport ? 'Sim' : 'Não'}</span>
            </div>
          </div>
        </section>

        <section className="info-section">
          <h2>Análise de Desempenho do Estabelecimento</h2>
          
          {/* Alerta de Taxa de Cancelamento */}
          {orders.length > 0 && (
            <div className={`cancelation-alert alert-${getCancelmentAlert().level}`}>
              <div className="alert-content">
                <span className="alert-message">{getCancelmentAlert().message}</span>
                <span className="alert-rate">Taxa: {calculateOrderStats().cancelRate.toFixed(1)}%</span>
              </div>
            </div>
          )}
          
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-icon total">📦</div>
              <div className="stat-info">
                <span className="stat-label">Total de Pedidos</span>
                <span className="stat-value">{calculateOrderStats().total}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon delivered">✅</div>
              <div className="stat-info">
                <span className="stat-label">Entregues</span>
                <span className="stat-value">{calculateOrderStats().delivered}</span>
                <span className="stat-sublabel">{calculateOrderStats().deliveryRate.toFixed(1)}% dos pedidos</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon pending">⏳</div>
              <div className="stat-info">
                <span className="stat-label">Não Entregues</span>
                <span className="stat-value">{calculateOrderStats().notDelivered}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon cancelled">❌</div>
              <div className="stat-info">
                <span className="stat-label">Cancelados</span>
                <span className="stat-value">{calculateOrderStats().cancelled}</span>
                <span className="stat-sublabel">{calculateOrderStats().cancelRate.toFixed(1)}% dos pedidos</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon revenue">💰</div>
              <div className="stat-info">
                <span className="stat-label">Receita Total</span>
                <span className="stat-value">{formatCurrency(calculateOrderStats().totalRevenue)}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon ticket">🎫</div>
              <div className="stat-info">
                <span className="stat-label">Ticket Médio</span>
                <span className="stat-value">{formatCurrency(calculateOrderStats().avgTicket)}</span>
              </div>
            </div>
          </div>
        </section>

        {orders.length > 0 && (
          <>
            <section className="info-section">
              <h2>Distribuição de Pedidos por Status</h2>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getOrdersByStatusData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getOrdersByStatusData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="info-section">
              <h2>Evolução Mensal: Entregas vs Cancelamentos</h2>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={getOrdersByMonthData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'receita') return formatCurrency(value as number);
                        return value;
                      }}
                    />
                    <Legend />
                    <Bar dataKey="entregues" fill="#28a745" name="Pedidos Entregues" />
                    <Bar dataKey="cancelados" fill="#dc3545" name="Pedidos Cancelados" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="chart-description">
                📊 Este gráfico mostra a comparação entre pedidos entregues e cancelados por mês. 
                Uma alta taxa de cancelamentos pode indicar problemas operacionais.
              </p>
            </section>

            <section className="info-section">
              <h2>Estatísticas Detalhadas por Mês</h2>
              <div className="monthly-stats-table">
                <table>
                  <thead>
                    <tr>
                      <th>Mês</th>
                      <th>Total</th>
                      <th>Entregues</th>
                      <th>Não Entregues</th>
                      <th>Cancelados</th>
                      <th>Taxa Entrega</th>
                      <th>Taxa Cancel.</th>
                      <th>Receita</th>
                      <th>Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getDetailedMonthlyStats().map((stat, index) => (
                      <tr key={index}>
                        <td className="month-cell">{stat.month}</td>
                        <td className="number-cell">{stat.total}</td>
                        <td className="number-cell success">{stat.delivered}</td>
                        <td className="number-cell warning">{stat.notDelivered}</td>
                        <td className="number-cell danger">{stat.cancelled}</td>
                        <td className="number-cell">
                          <span className={`delivery-rate ${parseFloat(stat.deliveryRate) > 80 ? 'high' : parseFloat(stat.deliveryRate) > 60 ? 'medium' : 'low'}`}>
                            {stat.deliveryRate}%
                          </span>
                        </td>
                        <td className="number-cell">
                          <span className={`cancel-rate ${parseFloat(stat.cancelRate) > 20 ? 'high' : parseFloat(stat.cancelRate) > 10 ? 'medium' : 'low'}`}>
                            {stat.cancelRate}%
                          </span>
                        </td>
                        <td className="currency-cell">{formatCurrency(stat.revenue)}</td>
                        <td className="currency-cell">{formatCurrency(stat.avgTicket)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {getDetailedMonthlyStats().length > 0 && (
                    <tfoot>
                      <tr className="total-row">
                        <td><strong>Total Geral</strong></td>
                        <td className="number-cell"><strong>{orders.length}</strong></td>
                        <td className="number-cell success"><strong>{calculateOrderStats().delivered}</strong></td>
                        <td className="number-cell warning"><strong>{calculateOrderStats().notDelivered}</strong></td>
                        <td className="number-cell danger"><strong>{calculateOrderStats().cancelled}</strong></td>
                        <td className="number-cell">
                          <strong>{calculateOrderStats().deliveryRate.toFixed(1)}%</strong>
                        </td>
                        <td className="number-cell">
                          <strong>{calculateOrderStats().cancelRate.toFixed(1)}%</strong>
                        </td>
                        <td className="currency-cell"><strong>{formatCurrency(calculateOrderStats().totalRevenue)}</strong></td>
                        <td className="currency-cell">
                          <strong>{formatCurrency(calculateOrderStats().avgTicket)}</strong>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              <div className="table-insights">
                <p className="insight-title">📈 Insights da Análise Mensal:</p>
                <ul className="insight-list">
                  <li>✅ <strong>Taxa de Entrega Ideal:</strong> Acima de 80%</li>
                  <li>⚠️ <strong>Taxa de Cancelamento Aceitável:</strong> Abaixo de 10%</li>
                  <li>🚨 <strong>Taxa de Cancelamento Crítica:</strong> Acima de 20%</li>
                </ul>
              </div>
            </section>

            <section className="info-section">
              <h2>Resumo Geral dos Pedidos</h2>
              <div className="orders-status-grid">
                <div className="order-status-card success">
                  <h3>✅ Entregues</h3>
                  <p className="count">{calculateOrderStats().delivered}</p>
                  <p className="percentage">{calculateOrderStats().deliveryRate.toFixed(1)}% do total</p>
                </div>
                <div className="order-status-card warning">
                  <h3>⏳ Não Entregues</h3>
                  <p className="count">{calculateOrderStats().notDelivered}</p>
                  <p className="percentage">
                    {((calculateOrderStats().notDelivered / orders.length) * 100).toFixed(1)}% do total
                  </p>
                </div>
                <div className="order-status-card cancelled">
                  <h3>❌ Cancelados</h3>
                  <p className="count">{calculateOrderStats().cancelled}</p>
                  <p className="percentage">{calculateOrderStats().cancelRate.toFixed(1)}% do total</p>
                </div>
              </div>
            </section>

            <section className="info-section">
              <h2>Últimos Pedidos</h2>
              <div className="orders-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Data</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Taxa de Entrega</th>
                      <th>Valor Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 10).map((order) => {
                      const orderTotal = getOrderTotal(order);
                      const deliveryFee = getDeliveryFee(order);
                      return (
                        <tr key={order.id}>
                          <td>{order.id.substring(0, 8)}...</td>
                          <td>{order.createdAt ? formatDate(order.createdAt) : 'N/A'}</td>
                          <td>
                            <span className={`order-status-badge status-${order.status.toLowerCase()}`}>
                              {getOrderStatusText(order.status)}
                            </span>
                          </td>
                          <td>{formatCurrency(orderTotal)}</td>
                          <td>{formatCurrency(deliveryFee)}</td>
                          <td className="total-value">{formatCurrency(orderTotal + deliveryFee)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <section className="info-section">
          <h2>Datas</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Data de Cadastro</span>
              <span className="value">
                {new Date(establishment.createdAt.seconds * 1000).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="info-item">
              <span className="label">Última Atualização</span>
              <span className="value">
                {new Date(establishment.lastUpdated).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </section>

        <section className="info-section">
          <h2>Faturas</h2>
          {invoices.length === 0 ? (
            <p className="no-invoices">Nenhuma fatura encontrada</p>
          ) : (
            <div className="invoices-table">
              <table>
                <thead>
                  <tr>
                    <th>Período da Fatura</th>
                    <th>Valor Total</th>
                    <th>Status</th>
                    <th>Data de Criação</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice: any) => (
                    <tr key={invoice.id}>
                      <td>
                        {formatDate(invoice.createdAt)} - {formatDate(invoice.endDate)}
                      </td>
                      <td>{formatCurrency(invoice.totalAmount || 0)}</td>
                      <td style={{ position: 'relative' }}>
                        <span 
                          className={`status-badge ${getStatusColor(invoice.status || 'pending')}`}
                          style={{ position: 'relative', display: 'inline-block' }}
                        >
                          {getStatusText(invoice.status || 'pending')}
                        </span>
                      </td>
                      <td>{formatDate(invoice.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default EstablishmentDetails; 