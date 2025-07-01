import { useState, useEffect } from 'react';
import { collection, query, where, Timestamp, collectionGroup, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import './styles.css';

interface OrderItem {
  name: string;
  price: number;
  productId: string;
  quantity: number;
  totalPrice: number;
}

interface Order {
  id: string;
  createdAt: Timestamp;
  deliveryFee: number;
  deliveryMode: string;
  discountTotal: number;
  finalPrice: number;
  items: OrderItem[];
  payment: {
    method: string;
    status: string;
  };
  status: string;
  storeId: string;
  totalPrice: number;
  userId: string;
  userName: string;
}

interface DashboardData {
  totalCustomers: number;
  totalSellers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  averageOrderValue: number;
  deliveryOrders: number;
  pickupOrders: number;
  paymentMethods: {
    pix: number;
    credit: number;
    debit: number;
    money: number;
  };
}

const Home = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalCustomers: 0,
    totalSellers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    averageOrderValue: 0,
    deliveryOrders: 0,
    pickupOrders: 0,
    paymentMethods: {
      pix: 0,
      credit: 0,
      debit: 0,
      money: 0
    }
  });

  useEffect(() => {
    const setupRealtimeListeners = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Listener para usuários
      const usersUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        const totalCustomers = snapshot.docs.length;
        setDashboardData(prev => ({ ...prev, totalCustomers }));
      });

      // Listener para estabelecimentos
      const partnersUnsubscribe = onSnapshot(collection(db, 'partners'), (snapshot) => {
        const totalSellers = snapshot.docs.length;
        setDashboardData(prev => ({ ...prev, totalSellers }));
      });

      // Listener para produtos
      const productsUnsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
        const totalProducts = snapshot.docs.length;
        setDashboardData(prev => ({ ...prev, totalProducts }));
      });

      // Listener para pedidos do dia dos parceiros
      const ordersQuery = query(
        collectionGroup(db, 'orders'),
        where('createdAt', '>=', today),
        where('status', '==', 'delivered')
      );

      console.log('Data inicial:', today); // Debug

      const ordersUnsubscribe = onSnapshot(ordersQuery, (snapshot) => {
        console.log('Número total de documentos:', snapshot.docs.length); // Debug

        if (snapshot.empty) {
          console.log('Nenhum pedido encontrado'); // Debug
          setDashboardData(prev => ({
            ...prev,
            totalOrders: 0,
            totalRevenue: 0,
            averageOrderValue: 0,
            deliveryOrders: 0,
            pickupOrders: 0,
            paymentMethods: {
              pix: 0,
              credit: 0,
              debit: 0,
              money: 0
            }
          }));
          return;
        }

        // Filtra apenas os documentos que pertencem à coleção partners
        const orders = snapshot.docs
          .filter(doc => {
            const isPartnerOrder = doc.ref.path.startsWith('partners/');
            console.log('Path do documento:', doc.ref.path, 'É pedido de partner:', isPartnerOrder); // Debug
            return isPartnerOrder;
          })
          .map(doc => ({
            ...doc.data(),
            id: doc.id
          })) as Order[];

        console.log('Pedidos filtrados:', orders.length); // Debug

        // Cálculos básicos
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((acc, order) => acc + (order.finalPrice || 0), 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Contagem de tipos de entrega para pedidos concluídos
        const deliveryOrders = orders.filter(order => order.deliveryMode === 'delivery').length;
        const pickupOrders = orders.filter(order => order.deliveryMode === 'pickup').length;

        // Contagem de métodos de pagamento
        const paymentMethods = orders.reduce((acc, order) => {
          const method = order.payment.method;
          return {
            pix: acc.pix + (method === 'pix' ? 1 : 0),
            credit: acc.credit + (method === 'credit' ? 1 : 0),
            debit: acc.debit + (method === 'debit' ? 1 : 0),
            money: acc.money + (method === 'money' ? 1 : 0)
          };
        }, {
          pix: 0,
          credit: 0,
          debit: 0,
          money: 0
        });

        setDashboardData(prev => ({
          ...prev,
          totalOrders,
          totalRevenue,
          averageOrderValue,
          deliveryOrders,
          pickupOrders,
          paymentMethods
        }));
      });

      return () => {
        usersUnsubscribe();
        partnersUnsubscribe();
        productsUnsubscribe();
        ordersUnsubscribe();
      };
    };

    const unsubscribe = setupRealtimeListeners();

    return () => {
      unsubscribe();
    };
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
                  <span>Pedidos Concluídos</span>
                  <span>{dashboardData.totalOrders}</span>
                </div>
                <div className="detail-item">
                  <span>Ticket Médio</span>
                  <span>
                    R$ {dashboardData.averageOrderValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="detail-item">
                  <span>Modo de Entrega</span>
                  <span>Delivery ({dashboardData.deliveryOrders}) / Retirada ({dashboardData.pickupOrders})</span>
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

          <div className="metric-card payments">
            <div className="metric-header">
              <div className="metric-icon">💳</div>
              <h3>Métodos de Pagamento</h3>
            </div>
            <div className="metric-body">
              <div className="metric-details">
                <div className="detail-item">
                  <span>PIX</span>
                  <span>{dashboardData.paymentMethods.pix}</span>
                </div>
                <div className="detail-item">
                  <span>Crédito</span>
                  <span>{dashboardData.paymentMethods.credit}</span>
                </div>
                <div className="detail-item">
                  <span>Débito</span>
                  <span>{dashboardData.paymentMethods.debit}</span>
                </div>
                <div className="detail-item">
                  <span>Dinheiro</span>
                  <span>{dashboardData.paymentMethods.money}</span>
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