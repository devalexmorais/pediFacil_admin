import { useState, useEffect } from 'react';
import { collection, query, getDocs, Timestamp, collectionGroup} from 'firebase/firestore';
import { db } from '../../config/firebase'; 
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import './styles.css';

interface MonthlyMetrics {
  period: {
    startDate: string;
    endDate: string;
  };
  metrics: {
    totalOrders: number;
    totalSales: number;        // Renomeado de grossRevenue para totalSales
    platformRevenue: number;   // Novo: soma de taxas + assinaturas (receita real da plataforma)
    totalDiscounts: number;
    serviceFees: number;
    premiumSubscriptions: number;
    averageTicket: number; // Novo: ticket médio (valor médio por pedido)
  };
}

interface MonthOption {
  month: number;
  year: number;
  label: string;
}

const PREMIUM_PRICE = 49.99;

interface ChartDataItem {
  name: string;
  valor: number;
}

const Finance = () => {
  const [availableMonths, setAvailableMonths] = useState<MonthOption[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyMetrics, setMonthlyMetrics] = useState<MonthlyMetrics>({
    period: {
      startDate: '',
      endDate: ''
    },
    metrics: {
      totalOrders: 0,
      totalSales: 0,          // Renomeado
      platformRevenue: 0,     // Novo
      totalDiscounts: 0,
      serviceFees: 0,
      premiumSubscriptions: 0,
      averageTicket: 0 // Inicializado com zero
    }
  });

  // Nomes dos meses em português
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Buscar todos os meses que tem pedidos
  useEffect(() => {
    const fetchAvailableMonths = async () => {
      try {
        setIsLoading(true);
        
        // Buscar primeiro todos os partners
        const partnersRef = collection(db, 'partners');
        const partnersSnapshot = await getDocs(partnersRef);
        
        if (partnersSnapshot.empty) {
          console.log('Nenhum partner encontrado no Firebase');
          setIsLoading(false);
          return;
        }

        // Array para armazenar todas as promessas de busca de pedidos
        const ordersPromises = partnersSnapshot.docs.map(partnerDoc => {
          const ordersRef = collection(partnerDoc.ref, 'orders');
          return getDocs(ordersRef);
        });

        // Buscar todos os pedidos de todos os partners
        const ordersSnapshots = await Promise.all(ordersPromises);
        
        // Mapear meses dos pedidos
        const monthsMap = new Map<string, { month: number; year: number }>();
        
        ordersSnapshots.forEach(ordersSnapshot => {
          ordersSnapshot.docs.forEach(doc => {
            const orderData = doc.data();
            
            // Verificar se há um timestamp de criação válido
            if (orderData.createdAt) {
              let orderDate;
              
              // Converter o timestamp para data
              if (orderData.createdAt instanceof Timestamp) {
                orderDate = orderData.createdAt.toDate();
              } else if (typeof orderData.createdAt === 'string') {
                orderDate = new Date(orderData.createdAt);
              } else if (orderData.createdAt.seconds) {
                orderDate = new Date(orderData.createdAt.seconds * 1000);
              } else if (orderData.createdAt.toDate && typeof orderData.createdAt.toDate === 'function') {
                try {
                  orderDate = orderData.createdAt.toDate();
                } catch (e) {
                  console.error('Erro ao converter timestamp:', e);
                }
              }
              
              if (orderDate && !isNaN(orderDate.getTime())) {
                const month = orderDate.getMonth() + 1;
                const year = orderDate.getFullYear();
                const key = `${month}-${year}`;
                
                if (!monthsMap.has(key)) {
                  monthsMap.set(key, { month, year });
                }
              }
            }
          });
        });
        
        // Converter para array e ordenar (mais recente primeiro)
        const months = Array.from(monthsMap.values())
          .map(({ month, year }) => ({
            month,
            year,
            label: `${monthNames[month-1]} ${year}`
          }))
          .sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
          });
        
        console.log('Meses disponíveis encontrados:', months);
        
        setAvailableMonths(months);
        
        // Selecionar o mês mais recente por padrão
        if (months.length > 0) {
          setSelectedMonth(months[0].month);
          setSelectedYear(months[0].year);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Erro ao buscar meses disponíveis:', error);
        setIsLoading(false);
      }
    };
    
    fetchAvailableMonths();
  }, []);

  useEffect(() => {
    const fetchMonthlyMetrics = async () => {
      try {
        if (!selectedMonth || !selectedYear) return;
        
        setIsLoading(true);
        
        // Criar timestamps para o início e fim do mês selecionado
        const startDate = new Date(selectedYear, selectedMonth - 1, 1);
        const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);

        // Buscar todos os partners primeiro
        const partnersRef = collection(db, 'partners');
        const partnersSnapshot = await getDocs(partnersRef);

        // Array para armazenar todas as promessas de busca de pedidos
        const ordersPromises = partnersSnapshot.docs.map(partnerDoc => {
          const ordersRef = collection(partnerDoc.ref, 'orders');
          return getDocs(ordersRef);
        });

        // Buscar cupons do admin
        const couponsRef = collection(db, 'coupons');
        const couponsSnapshot = await getDocs(couponsRef);
        const adminCoupons = new Set(couponsSnapshot.docs.map(doc => doc.data().code));

        // Buscar pedidos, taxas e parceiros
        const [ordersSnapshots, appFeesSnapshot] = await Promise.all([
          Promise.all(ordersPromises),
          getDocs(query(collectionGroup(db, 'app_fees')))
        ]);
        
        // Filtrar pedidos do período manualmente e calcular descontos dos cupons do admin
        let adminCouponsDiscounts = 0;
        const filteredOrders = ordersSnapshots.flatMap(snapshot => 
          snapshot.docs.filter(doc => {
            const orderData = doc.data();
            if (!orderData.createdAt) return false;
            
            // Converter timestamp para Date
            let orderDate;
            if (orderData.createdAt instanceof Timestamp) {
              orderDate = orderData.createdAt.toDate();
            } else if (typeof orderData.createdAt === 'string') {
              orderDate = new Date(orderData.createdAt);
            } else if (orderData.createdAt.seconds) {
              orderDate = new Date(orderData.createdAt.seconds * 1000);
            } else if (orderData.createdAt.toDate && typeof orderData.createdAt.toDate === 'function') {
              try {
                orderDate = orderData.createdAt.toDate();
              } catch (e) {
                return false;
              }
            } else {
              return false;
            }

            // Se o pedido está no período e tem cupom do admin, soma o desconto
            if (orderDate >= startDate && orderDate <= endDate) {
              // Verificar se tem cupom aplicado e se é um cupom do admin
              if (orderData.couponApplied && adminCoupons.has(orderData.couponApplied.code)) {
                adminCouponsDiscounts += orderData.discountTotal || 0;
                console.log(`Cupom admin encontrado: ${orderData.couponApplied.code}, Desconto: ${orderData.discountTotal}`);
              }
              return true;
            }
            return false;
          })
        );
        
        // Filtrar taxas de serviço do período manualmente
        const filteredAppFees = appFeesSnapshot.docs.filter(doc => {
          const feeData = doc.data();
          if (!feeData.orderDate) return false;
          
          // Converter timestamp para Date
          let feeDate;
          if (feeData.orderDate instanceof Timestamp) {
            feeDate = feeData.orderDate.toDate();
          } else if (typeof feeData.orderDate === 'string') {
            feeDate = new Date(feeData.orderDate);
          } else if (feeData.orderDate.seconds) {
            feeDate = new Date(feeData.orderDate.seconds * 1000);
          } else if (feeData.orderDate.toDate && typeof feeData.orderDate.toDate === 'function') {
            try {
              feeDate = feeData.orderDate.toDate();
            } catch (e) {
              return false;
            }
          } else {
            return false;
          }
          
          // Verificar se está dentro do período
          return feeDate >= startDate && feeDate <= endDate;
        });
        
        // Verificação adicional: examinar primeiro documento de app_fees
        if (appFeesSnapshot.docs.length > 0) {
          const sampleFee = appFeesSnapshot.docs[0].data();
          console.log('Exemplo de taxa de serviço - campos disponíveis:', Object.keys(sampleFee).join(', '));
          console.log('Exemplo de taxa de serviço - valor:', sampleFee.value);
          console.log('Exemplo de taxa de serviço - orderDate tipo:', sampleFee.orderDate ? typeof sampleFee.orderDate : 'ausente');
        } else {
          console.log('Nenhuma taxa de serviço encontrada na coleção app_fees');
        }
        
        // Contar parceiros premium ativos
        const premiumPartners = partnersSnapshot.docs.filter(doc => {
          const partnerData = doc.data();
          const isPremium = partnerData.store?.isPremium === true;
          
          // Verificar se estava premium durante o mês selecionado
          if (isPremium && partnerData.store?.premiumExpiresAt) {
            let expirationDate;
            
            if (partnerData.store.premiumExpiresAt instanceof Timestamp) {
              expirationDate = partnerData.store.premiumExpiresAt.toDate();
            } else if (typeof partnerData.store.premiumExpiresAt === 'string') {
              expirationDate = new Date(partnerData.store.premiumExpiresAt);
            } else if (partnerData.store.premiumExpiresAt.seconds) {
              expirationDate = new Date(partnerData.store.premiumExpiresAt.seconds * 1000);
            } else {
              return isPremium; // Se não conseguir determinar data de expiração, considera como premium
            }
            
            // Se a data de expiração é posterior ao fim do mês selecionado, estava premium nesse mês
            return expirationDate >= startDate;
          }
          
          return isPremium;
        });
        
        const premiumPartnersCount = premiumPartners.length;
        const premiumRevenue = premiumPartnersCount * PREMIUM_PRICE;
        
        console.log(`Parceiros premium: ${premiumPartnersCount}, Receita de assinaturas: R$ ${premiumRevenue.toFixed(2)}`);
        console.log(`Filtrados: ${filteredOrders.length} pedidos do período, ${filteredAppFees.length} taxas do período`);
        
        // Calcular métricas
        let totalSales = 0;
        let totalDiscounts = 0;
        let serviceFees = 0;
        
        // Calcular receita e descontos dos pedidos
        filteredOrders.forEach(doc => {
          const orderData = doc.data();
          const orderTotal = orderData.finalPrice || orderData.totalPrice || 0;
          const orderDiscount = orderData.discountTotal || 0;
          
          totalSales += orderTotal;
          totalDiscounts += orderDiscount;
        });
        
        // Calcular taxas de serviço
        interface AppFeeDetail {
          id: string;
          value: number;
          orderId: string;
          orderTotalPrice: number;
        }
        
        const appFeesDetails: AppFeeDetail[] = [];
        
        filteredAppFees.forEach(doc => {
          const feeData = doc.data();
          const feeValue = parseFloat(feeData.value) || 0;
          
          // Guardar detalhes para debug
          appFeesDetails.push({
            id: doc.id,
            value: feeValue,
            orderId: feeData.orderId || 'desconhecido',
            orderTotalPrice: feeData.orderTotalPrice || 0
          });
          
          serviceFees += feeValue;
        });

        // Registrar detalhes das taxas
        console.log(`Detalhes das ${filteredAppFees.length} taxas de serviço encontradas:`);
        appFeesDetails.forEach((fee, index) => {
          console.log(`${index+1}. ID: ${fee.id} | Valor: R$ ${fee.value.toFixed(2)} | Pedido: ${fee.orderId} | Valor Pedido: R$ ${fee.orderTotalPrice}`);
        });
        
        console.log(`Total de taxas de serviço: R$ ${serviceFees.toFixed(2)}`);
        
        // Verificação alternativa: somar taxas diretamente dos pedidos se não houver app_fees
        if (serviceFees === 0 && filteredOrders.length > 0) {
          console.log('Taxas de serviço zeradas, tentando calcular a partir dos pedidos...');
          
          filteredOrders.forEach(doc => {
            const orderData = doc.data();
            const orderTotal = orderData.finalPrice || orderData.totalPrice || 0;
            
            // Taxa padrão é 8%, taxa premium é 5%
            const taxRate = 0.08; // Valor padrão
            const estimatedFee = orderTotal * taxRate;
            
            console.log(`Pedido ${doc.id}: Total R$ ${orderTotal.toFixed(2)} | Taxa estimada (${(taxRate*100)}%): R$ ${estimatedFee.toFixed(2)}`);
            serviceFees += estimatedFee;
          });
          
          console.log(`Taxa de serviço estimada a partir dos pedidos: R$ ${serviceFees.toFixed(2)}`);
        }
        
        // Calcular receita da plataforma (a receita real do app)
        const platformRevenue = serviceFees + premiumRevenue - adminCouponsDiscounts;
        
        // Calcular ticket médio dos pedidos
        const averageTicket = filteredOrders.length > 0 ? totalSales / filteredOrders.length : 0;
        
        console.log(`Métricas calculadas: Volume de Vendas=${totalSales}, Ticket Médio=${averageTicket.toFixed(2)}, Descontos=${adminCouponsDiscounts}, Taxas=${serviceFees}, Assinaturas=${premiumRevenue}, Receita Total=${platformRevenue}`);

        setMonthlyMetrics({
          period: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          },
          metrics: {
            totalOrders: filteredOrders.length,
            totalSales,
            platformRevenue,
            totalDiscounts: adminCouponsDiscounts,
            serviceFees,
            premiumSubscriptions: premiumRevenue,
            averageTicket
          }
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Erro ao buscar métricas mensais:', error);
        setIsLoading(false);
      }
    };

    fetchMonthlyMetrics();
  }, [selectedMonth, selectedYear]);

  const handleMonthChange = (value: string) => {
    const [month, year] = value.split('-').map(Number);
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const COLORS = {
    Vendas: '#4CAF50',
    Taxas: '#2196F3',
    Assinaturas: '#9C27B0',
    'Cupons Admin': '#DC3545',
    'Receita Total': '#00BCD4'
  };

  // Preparar dados para o gráfico
  const chartData: ChartDataItem[] = [
    {
      name: 'Vendas',
      valor: monthlyMetrics.metrics.totalSales,
    },
    {
      name: 'Taxas',
      valor: monthlyMetrics.metrics.serviceFees,
    },
    {
      name: 'Assinaturas',
      valor: monthlyMetrics.metrics.premiumSubscriptions,
    },
    {
      name: 'Cupons Admin',
      valor: monthlyMetrics.metrics.totalDiscounts,
    },
    {
      name: 'Receita Total',
      valor: monthlyMetrics.metrics.platformRevenue,
    },
  ];

  return (
    <div className="finance-container">
      <header className="page-header">
        <div className="header-content">
          <h1>Financeiro</h1>
          <div className="header-actions">
            {isLoading ? (
              <div className="loading">Carregando...</div>
            ) : (
              <select 
                className="period-select"
                value={selectedMonth && selectedYear ? `${selectedMonth}-${selectedYear}` : ''}
                onChange={(e) => handleMonthChange(e.target.value)}
                disabled={availableMonths.length === 0}
              >
                {availableMonths.length === 0 ? (
                  <option value="">Nenhum mês disponível</option>
                ) : (
                  availableMonths.map(({ month, year, label }) => (
                    <option key={`${month}-${year}`} value={`${month}-${year}`}>
                      {label}
                    </option>
                  ))
                )}
              </select>
            )}
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="loading-container">Carregando dados...</div>
      ) : (
        <>
          <div className="dashboard-grid">
            <div className="metric-card revenue">
              <h3>Volume de Vendas</h3>
              <div className="metric-value">
                {monthlyMetrics.metrics.totalSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <div className="metric-subtitle">
                valor total dos pedidos
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
            
            <div className="metric-card average-ticket">
              <h3>Ticket Médio</h3>
              <div className="metric-value">
                {monthlyMetrics.metrics.averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <div className="metric-subtitle">
                valor médio por pedido
              </div>
            </div>

            <div className="metric-card net">
              <h3>Receita Total</h3>
              <div className="metric-value">
                {monthlyMetrics.metrics.platformRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <div className="metric-subtitle">
                taxas + assinaturas
              </div>
            </div>

            <div className="metric-card premium">
              <h3>Taxas de Serviço</h3>
              <div className="metric-value">
                {monthlyMetrics.metrics.serviceFees.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <div className="metric-subtitle">
                comissões sobre vendas
              </div>
            </div>

            <div className="metric-card subscriptions">
              <h3>Assinaturas Premium</h3>
              <div className="metric-value">
                {monthlyMetrics.metrics.premiumSubscriptions.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <div className="metric-subtitle">
                estabelecimentos premium
              </div>
            </div>
          </div>

          <div className="details-grid">
            <div className="summary-card">
              <h3>Resumo Financeiro</h3>
              <div className="summary-content">
                <div className="summary-item">
                  <span>Volume de Vendas (Lojistas)</span>
                  <span>{monthlyMetrics.metrics.totalSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="summary-item">
                  <span>Ticket Médio</span>
                  <span>{monthlyMetrics.metrics.averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="summary-item section-divider">
                  <span><strong>Receitas da Plataforma</strong></span>
                  <span></span>
                </div>
                <div className="summary-item">
                  <span>Taxas de Serviço</span>
                  <span>{monthlyMetrics.metrics.serviceFees.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="summary-item">
                  <span>Assinaturas Premium</span>
                  <span>{monthlyMetrics.metrics.premiumSubscriptions.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="summary-item expense">
                  <span>Despesas com Cupons</span>
                  <span>- {monthlyMetrics.metrics.totalDiscounts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="summary-item total">
                  <span>Receita Total</span>
                  <span>{monthlyMetrics.metrics.platformRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>
            </div>

            <div className="chart-card">
              <h3>Análise Financeira</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={chartData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis
                      tickFormatter={(value) => 
                        value.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })
                      }
                    />
                    <Tooltip
                      formatter={(value) =>
                        value.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })
                      }
                    />
                    <Legend />
                    <Bar dataKey="valor" name="Valor">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Finance; 