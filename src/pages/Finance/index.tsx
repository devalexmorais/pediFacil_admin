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
    // Novas métricas para controle completo de lucros
    operationalCosts: number;    // Custos operacionais (servidores, APIs, etc.)
    netProfit: number;          // Lucro líquido (receita - custos - descontos)
    profitMargin: number;       // Margem de lucro em %
    costPerOrder: number;       // Custo por pedido processado
    revenueGrowth: number;      // Crescimento da receita vs mês anterior
    activePartners: number;     // Número de parceiros ativos
    premiumPartners: number;    // Número de parceiros premium
    conversionRate: number;     // Taxa de conversão para premium
    averageRevenuePerPartner: number; // Receita média por parceiro
  };
}

interface MonthOption {
  month: number;
  year: number;
  label: string;
}

const PREMIUM_PRICE = 39.90;

interface ChartDataItem {
  name: string;
  valor: number;
}

const extractCreditValue = (creditData: Record<string, any>): number => {
  if (!creditData || typeof creditData !== 'object') {
    return 0;
  }

  const candidateFields = [
    'available',
    'availableAmount',
    'remaining',
    'remainingAmount',
    'balance',
    'value',
    'amount',
    'credit',
    'credits'
  ];

  for (const field of candidateFields) {
    const fieldValue = creditData[field];
    if (fieldValue === undefined || fieldValue === null) {
      continue;
    }

    const numericValue = Number(fieldValue);
    if (!Number.isNaN(numericValue)) {
      if ((field === 'value' || field === 'amount') && typeof creditData.usedAmount === 'number') {
        return Math.max(numericValue - Number(creditData.usedAmount), 0);
      }

      if ((field === 'value' || field === 'amount') && typeof creditData.used === 'number') {
        return Math.max(numericValue - Number(creditData.used), 0);
      }

      return numericValue;
    }
  }

  return 0;
};

const extractCreditDate = (creditData: Record<string, any>): Date | null => {
  if (!creditData || typeof creditData !== 'object') {
    return null;
  }

  const candidateFields = [
    'createdAt',
    'created_at',
    'timestamp',
    'date',
    'issuedAt',
    'issued_at',
    'createdTime',
    'createdOn',
    'created_on'
  ];

  const parseValueAsDate = (value: any): Date | null => {
    if (!value) {
      return null;
    }

    if (value instanceof Timestamp) {
      return value.toDate();
    }

    if (typeof value === 'object') {
      if (typeof value.toDate === 'function') {
        try {
          return value.toDate();
        } catch {
          // ignore and fallback to other checks
        }
      }

      if (typeof value.seconds === 'number') {
        return new Date(value.seconds * 1000);
      }
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      // Detect if value is in seconds (10 digits) or milliseconds (13 digits)
      const timestamp = value < 1e12 ? value * 1000 : value;
      const date = new Date(timestamp);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  };

  for (const field of candidateFields) {
    const fieldValue = creditData[field];
    const parsed = parseValueAsDate(fieldValue);
    if (parsed) {
      return parsed;
    }
  }

  // Tentar diretamente propriedades comuns (por exemplo, creditData.createdAt.seconds)
  const nestedCreatedAt = creditData.createdAt || creditData.created_at;
  const nestedParsed = parseValueAsDate(nestedCreatedAt);
  if (nestedParsed) {
    return nestedParsed;
  }

  return null;
};

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
      averageTicket: 0, // Inicializado com zero
      // Novas métricas inicializadas
      operationalCosts: 0,
      netProfit: 0,
      profitMargin: 0,
      costPerOrder: 0,
      revenueGrowth: 0,
      activePartners: 0,
      premiumPartners: 0,
      conversionRate: 0,
      averageRevenuePerPartner: 0
    }
  });

  // Nomes dos meses em português
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Função para buscar métricas do mês anterior
  const fetchPreviousMonthMetrics = async (currentMonth: number, currentYear: number) => {
    try {
      // Calcular mês anterior
      let prevMonth = currentMonth - 1;
      let prevYear = currentYear;
      
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = currentYear - 1;
      }

      // Criar timestamps para o mês anterior
      const prevStartDate = new Date(prevYear, prevMonth - 1, 1);
      const prevEndDate = new Date(prevYear, prevMonth, 0, 23, 59, 59);

      // Buscar dados do mês anterior (reutilizando a lógica similar)
      const partnersRef = collection(db, 'partners');
      const partnersSnapshot = await getDocs(partnersRef);

      const ordersPromises = partnersSnapshot.docs.map(partnerDoc => {
        const ordersRef = collection(partnerDoc.ref, 'orders');
        return getDocs(ordersRef);
      });

      const creditsPromises = partnersSnapshot.docs.map(async partnerDoc => {
        const creditsSnapshot = await getDocs(collection(partnerDoc.ref, 'credits'));
        let partnerTotal = 0;
        creditsSnapshot.forEach(creditDoc => {
          const creditData = creditDoc.data();
          const creditDate = extractCreditDate(creditData);
          if (!creditDate) {
            return;
          }
          if (creditDate >= prevStartDate && creditDate <= prevEndDate) {
            partnerTotal += extractCreditValue(creditData);
          }
        });
        return partnerTotal;
      });

      const [ordersSnapshots, appFeesSnapshot, partnerCreditsTotals] = await Promise.all([
        Promise.all(ordersPromises),
        getDocs(query(collectionGroup(db, 'app_fees'))),
        Promise.all(creditsPromises)
      ]);

      // Filtrar pedidos do mês anterior
      const prevFilteredOrders = ordersSnapshots.flatMap(snapshot => 
        snapshot.docs.filter(doc => {
          const orderData = doc.data();
          if (!orderData.createdAt) return false;
          
          // Filtrar apenas pedidos entregues (concluídos)
          if (orderData.status !== 'delivered') {
            return false;
          }
          
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

          return orderDate >= prevStartDate && orderDate <= prevEndDate;
        })
      );

      // Calcular métricas básicas do mês anterior
      let prevTotalSales = 0;
      prevFilteredOrders.forEach(doc => {
        const orderData = doc.data();
        const orderTotal = orderData.finalPrice || orderData.totalPrice || 0;
        prevTotalSales += orderTotal;
      });

      // Buscar cupons do admin
      const couponsRef = collection(db, 'coupons');
      const couponsSnapshot = await getDocs(couponsRef);
      const adminCoupons = new Set(couponsSnapshot.docs.map(doc => doc.data().code));

      let prevAdminCouponsDiscounts = 0;
      prevFilteredOrders.forEach(doc => {
        const orderData = doc.data();
        if (orderData.couponApplied && adminCoupons.has(orderData.couponApplied.code)) {
          prevAdminCouponsDiscounts += orderData.discountTotal || 0;
        }
      });

      // Filtrar taxas do mês anterior
      const prevFilteredAppFees = appFeesSnapshot.docs.filter(doc => {
        const feeData = doc.data();
        if (!feeData.orderDate) return false;
        
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
        
        return feeDate >= prevStartDate && feeDate <= prevEndDate;
      });

      let prevServiceFees = 0;
      prevFilteredAppFees.forEach(doc => {
        const feeData = doc.data();
        let feeValue = 0;
        
        // Verificar se a taxa está em feeData.value ou feeData.appFee.value
        if (feeData.value) {
          feeValue = parseFloat(feeData.value) || 0;
        } else if (feeData.appFee && feeData.appFee.value) {
          feeValue = parseFloat(feeData.appFee.value) || 0;
        }
        
        prevServiceFees += feeValue;
      });

      // Se não encontrou taxas nas subcoleções, calcular baseado nos pedidos do mês anterior
      if (prevServiceFees === 0 && prevFilteredOrders.length > 0) {
        console.log('Taxas do mês anterior zeradas, calculando baseado nos pedidos entregues...');
        
        prevFilteredOrders.forEach(doc => {
          const orderData = doc.data();
          
          // Garantir que só calcula taxa para pedidos entregues
          if (orderData.status !== 'delivered') {
            return;
          }
          
          const orderTotal = orderData.finalPrice || orderData.totalPrice || 0;
          
          // Verificar se o estabelecimento é premium para aplicar taxa correta
          let taxRate = 0.08; // Taxa padrão 8%
          
          // Buscar dados do estabelecimento para verificar se é premium
          const partnerId = doc.ref.parent.parent?.id;
          if (partnerId) {
            const partnerDoc = partnersSnapshot.docs.find(p => p.id === partnerId);
            if (partnerDoc) {
              const partnerData = partnerDoc.data();
              
              // Verificar premium tanto no nível raiz quanto em store (para compatibilidade)
              const isPremium = partnerData.store?.isPremium === true;
              const premiumExpiresAt = partnerData.premiumExpiresAt || partnerData.store?.premiumExpiresAt;
              const productIdentifier = partnerData.productIdentifier;
              
              // Verificar se é premium pelo productIdentifier ou isPremium
              const hasPremium = isPremium || productIdentifier === 'parceiros_premium';
              
              // Verificar se estava premium durante o mês anterior
              if (hasPremium && premiumExpiresAt) {
                let expirationDate;
                
                if (premiumExpiresAt instanceof Timestamp) {
                  expirationDate = premiumExpiresAt.toDate();
                } else if (typeof premiumExpiresAt === 'string') {
                  expirationDate = new Date(premiumExpiresAt);
                } else if (premiumExpiresAt.seconds) {
                  expirationDate = new Date(premiumExpiresAt.seconds * 1000);
                } else {
                  expirationDate = new Date();
                }
                
                // Se a data de expiração é posterior ao início do mês anterior, estava premium
                if (expirationDate >= prevStartDate) {
                  taxRate = 0.05; // Taxa premium 5%
                }
              }
            }
          }
          
          const calculatedFee = orderTotal * taxRate;
          prevServiceFees += calculatedFee;
        });
        
        console.log(`Taxa de serviço do mês anterior calculada: R$ ${prevServiceFees.toFixed(2)}`);
      }

      // Calcular parceiros premium do mês anterior
      const prevPremiumPartners = partnersSnapshot.docs.filter(doc => {
        const partnerData = doc.data();
        
        // Verificar premium tanto no nível raiz quanto em store (para compatibilidade)
        const isPremium = partnerData.store?.isPremium === true;
        const premiumExpiresAt = partnerData.premiumExpiresAt || partnerData.store?.premiumExpiresAt;
        const productIdentifier = partnerData.productIdentifier;
        
        // Verificar se é premium pelo productIdentifier ou isPremium
        const hasPremium = isPremium || productIdentifier === 'parceiros_premium';
        
        if (hasPremium && premiumExpiresAt) {
          let expirationDate;
          
          if (premiumExpiresAt instanceof Timestamp) {
            expirationDate = premiumExpiresAt.toDate();
          } else if (typeof premiumExpiresAt === 'string') {
            expirationDate = new Date(premiumExpiresAt);
          } else if (premiumExpiresAt.seconds) {
            expirationDate = new Date(premiumExpiresAt.seconds * 1000);
          } else {
            return hasPremium;
          }
          
          return expirationDate >= prevStartDate;
        }
        
        return hasPremium;
      });

      const prevPremiumRevenue = prevPremiumPartners.length * PREMIUM_PRICE;
      const prevGrossRevenue = prevServiceFees + prevPremiumRevenue;

      // Calcular créditos totais dos estabelecimentos (apenas para info)
      const prevTotalCredits = partnerCreditsTotals.reduce((sum, partnerTotal) => sum + partnerTotal, 0);
      
      // Custos operacionais = total de créditos concedidos
      const prevOperationalCosts = prevTotalCredits;
      const prevNetProfit = prevGrossRevenue - prevOperationalCosts;
      const prevPlatformRevenue = prevGrossRevenue - prevAdminCouponsDiscounts;

      return {
        period: {
          startDate: prevStartDate.toISOString(),
          endDate: prevEndDate.toISOString()
        },
        metrics: {
          totalOrders: prevFilteredOrders.length,
          totalSales: prevTotalSales,
          platformRevenue: prevPlatformRevenue,
          totalDiscounts: prevAdminCouponsDiscounts,
          serviceFees: prevServiceFees,
          premiumSubscriptions: prevPremiumRevenue,
          averageTicket: prevFilteredOrders.length > 0 ? prevTotalSales / prevFilteredOrders.length : 0,
          operationalCosts: prevOperationalCosts,
          netProfit: prevNetProfit,
          profitMargin: prevGrossRevenue > 0 ? (prevNetProfit / prevGrossRevenue) * 100 : 0,
          costPerOrder: prevFilteredOrders.length > 0 ? prevOperationalCosts / prevFilteredOrders.length : 0,
          revenueGrowth: 0, // Será calculado abaixo
          activePartners: partnersSnapshot.docs.filter(doc => doc.data().isActive !== false).length,
          premiumPartners: prevPremiumPartners.length,
          conversionRate: 0, // Será calculado se necessário
          averageRevenuePerPartner: 0 // Será calculado se necessário
        }
      };
    } catch (error) {
      console.error('Erro ao buscar métricas do mês anterior:', error);
      return null;
    }
  };

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
        const creditsPromises = partnersSnapshot.docs.map(async partnerDoc => {
          const creditsSnapshot = await getDocs(collection(partnerDoc.ref, 'credits'));
          let partnerTotal = 0;
          creditsSnapshot.forEach(creditDoc => {
            const creditData = creditDoc.data();
            const creditDate = extractCreditDate(creditData);
            if (!creditDate) {
              return;
            }
            if (creditDate >= startDate && creditDate <= endDate) {
              partnerTotal += extractCreditValue(creditData);
            }
          });
          return partnerTotal;
        });

        const [ordersSnapshots, appFeesSnapshot, partnerCreditsTotals] = await Promise.all([
          Promise.all(ordersPromises),
          getDocs(query(collectionGroup(db, 'app_fees'))),
          Promise.all(creditsPromises)
        ]);
        
        // Debug: verificar quantas taxas foram encontradas
        console.log(`==========================================`);
        console.log(`DEBUG: TAXAS DE SERVIÇO ENCONTRADAS`);
        console.log(`==========================================`);
        console.log(`Total de taxas encontradas (sem filtro): ${appFeesSnapshot.docs.length}`);
        
        // Mostrar algumas taxas para debug
        if (appFeesSnapshot.docs.length > 0) {
          console.log('Primeiras 3 taxas encontradas:');
          appFeesSnapshot.docs.slice(0, 3).forEach((doc, index) => {
            const feeData = doc.data();
            console.log(`${index + 1}. ID: ${doc.id}`);
            console.log(`   Estrutura completa:`, feeData);
            console.log(`   orderDate:`, feeData.orderDate);
            console.log(`   value:`, feeData.value);
            console.log(`   appFee:`, feeData.appFee);
            console.log(`   orderId:`, feeData.orderId);
            console.log(`   orderTotalPrice:`, feeData.orderTotalPrice);
            console.log(`   ---`);
          });
        }
        
        // Filtrar pedidos do período manualmente e calcular descontos dos cupons do admin
        let adminCouponsDiscounts = 0;
        const filteredOrders = ordersSnapshots.flatMap(snapshot => 
          snapshot.docs.filter(doc => {
            const orderData = doc.data();
            if (!orderData.createdAt) return false;
            
            // Filtrar apenas pedidos entregues (concluídos)
            if (orderData.status !== 'delivered') {
              return false;
            }
            
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
        console.log(`Período selecionado: ${startDate.toISOString()} até ${endDate.toISOString()}`);
        
        const filteredAppFees = appFeesSnapshot.docs.filter(doc => {
          const feeData = doc.data();
          
          // Debug: verificar se tem orderDate
          if (!feeData.orderDate) {
            console.log(`Taxa ${doc.id} sem orderDate, pulando...`);
            return false;
          }
          
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
              console.log(`Erro ao converter orderDate da taxa ${doc.id}:`, e);
              return false;
            }
          } else {
            console.log(`Formato de orderDate não reconhecido na taxa ${doc.id}:`, feeData.orderDate);
            return false;
          }
          
          // Verificar se está dentro do período
          const isInPeriod = feeDate >= startDate && feeDate <= endDate;
          
          if (isInPeriod) {
            console.log(`Taxa ${doc.id} está no período: ${feeDate.toISOString()}`);
          }
          
          return isInPeriod;
        });
        
        console.log(`Taxas filtradas para o período: ${filteredAppFees.length} de ${appFeesSnapshot.docs.length} total`);
        
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
          
          // Verificar premium tanto no nível raiz quanto em store (para compatibilidade)
          const isPremium = partnerData.store?.isPremium === true;
          const premiumExpiresAt = partnerData.premiumExpiresAt || partnerData.store?.premiumExpiresAt;
          const productIdentifier = partnerData.productIdentifier;
          
          // Verificar se é premium pelo productIdentifier ou isPremium
          const hasPremium = isPremium || productIdentifier === 'parceiros_premium';
          
          // Verificar se estava premium durante o mês selecionado
          if (hasPremium && premiumExpiresAt) {
            let expirationDate;
            
            if (premiumExpiresAt instanceof Timestamp) {
              expirationDate = premiumExpiresAt.toDate();
            } else if (typeof premiumExpiresAt === 'string') {
              expirationDate = new Date(premiumExpiresAt);
            } else if (premiumExpiresAt.seconds) {
              expirationDate = new Date(premiumExpiresAt.seconds * 1000);
            } else {
              return hasPremium; // Se não conseguir determinar data de expiração, considera como premium
            }
            
            // Se a data de expiração é posterior ao início do mês selecionado, estava premium nesse mês
            return expirationDate >= startDate;
          }
          
          return hasPremium;
        });
        
        const premiumPartnersCount = premiumPartners.length;
        const premiumRevenue = premiumPartnersCount * PREMIUM_PRICE;
        
        console.log(`Parceiros premium: ${premiumPartnersCount}, Receita de assinaturas: R$ ${premiumRevenue.toFixed(2)}`);
        console.log(`Filtrados: ${filteredOrders.length} pedidos ENTREGUES do período, ${filteredAppFees.length} taxas do período`);
        
        // Debug: contar total de pedidos (incluindo não entregues) para comparação
        const allOrdersInPeriod = ordersSnapshots.flatMap(snapshot => 
          snapshot.docs.filter(doc => {
            const orderData = doc.data();
            if (!orderData.createdAt) return false;
            let orderDate;
            if (orderData.createdAt instanceof Timestamp) {
              orderDate = orderData.createdAt.toDate();
            } else if (typeof orderData.createdAt === 'string') {
              orderDate = new Date(orderData.createdAt);
            } else if (orderData.createdAt.seconds) {
              orderDate = new Date(orderData.createdAt.seconds * 1000);
            } else {
              return false;
            }
            return orderDate >= startDate && orderDate <= endDate;
          })
        );
        console.log(`Total de pedidos no período (todos status): ${allOrdersInPeriod.length}`);
        console.log(`Pedidos entregues: ${filteredOrders.length}`);
        console.log(`Pedidos com outros status: ${allOrdersInPeriod.length - filteredOrders.length}`);
        
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
        
        // Primeiro, tentar buscar taxas das subcoleções app_fees
        console.log(`==========================================`);
        console.log(`CALCULANDO TAXAS DE SERVIÇO`);
        console.log(`==========================================`);
        
        filteredAppFees.forEach((doc, index) => {
          const feeData = doc.data();
          let feeValue = 0;
          
          console.log(`Taxa ${index + 1}/${filteredAppFees.length}:`);
          console.log(`  ID: ${doc.id}`);
          console.log(`  feeData.value: ${feeData.value}`);
          console.log(`  feeData.appFee: ${feeData.appFee ? JSON.stringify(feeData.appFee) : 'não existe'}`);
          
          // Verificar se a taxa está em feeData.value ou feeData.appFee.value
          if (feeData.value) {
            feeValue = parseFloat(feeData.value) || 0;
            console.log(`  ✓ Taxa encontrada em feeData.value: R$ ${feeValue.toFixed(2)}`);
          } else if (feeData.appFee && feeData.appFee.value) {
            feeValue = parseFloat(feeData.appFee.value) || 0;
            console.log(`  ✓ Taxa encontrada em feeData.appFee.value: R$ ${feeValue.toFixed(2)}`);
          } else {
            console.log(`  ✗ Taxa NÃO encontrada em nenhuma estrutura conhecida`);
            console.log(`  Estrutura completa:`, feeData);
          }
          
          // Guardar detalhes para debug
          appFeesDetails.push({
            id: doc.id,
            value: feeValue,
            orderId: feeData.orderId || 'desconhecido',
            orderTotalPrice: feeData.orderTotalPrice || 0
          });
          
          serviceFees += feeValue;
          console.log(`  Total acumulado: R$ ${serviceFees.toFixed(2)}`);
          console.log(`  ---`);
        });

        // Registrar detalhes das taxas
        console.log(`Detalhes das ${filteredAppFees.length} taxas de serviço encontradas nas subcoleções:`);
        appFeesDetails.forEach((fee, index) => {
          console.log(`${index+1}. ID: ${fee.id} | Valor: R$ ${fee.value.toFixed(2)} | Pedido: ${fee.orderId} | Valor Pedido: R$ ${fee.orderTotalPrice}`);
        });
        
        console.log(`Total de taxas de serviço das subcoleções: R$ ${serviceFees.toFixed(2)}`);
        
        // Se não encontrou taxas nas subcoleções, calcular baseado nos pedidos
        if (serviceFees === 0 && filteredOrders.length > 0) {
          console.log(`==========================================`);
          console.log(`FALLBACK: CALCULANDO BASEADO NOS PEDIDOS`);
          console.log(`==========================================`);
          console.log(`Taxas de serviço zeradas, calculando baseado nos pedidos entregues...`);
          
          filteredOrders.forEach((doc, index) => {
            const orderData = doc.data();
            
            // Garantir que só calcula taxa para pedidos entregues
            if (orderData.status !== 'delivered') {
              console.log(`Pedido ${index + 1} ignorado (status: ${orderData.status})`);
              return;
            }
            
            const orderTotal = orderData.finalPrice || orderData.totalPrice || 0;
            
            console.log(`Pedido ${index + 1}/${filteredOrders.length}:`);
            console.log(`  ID: ${doc.id}`);
            console.log(`  status: ${orderData.status}`);
            console.log(`  finalPrice: ${orderData.finalPrice}`);
            console.log(`  totalPrice: ${orderData.totalPrice}`);
            console.log(`  orderTotal usado: R$ ${orderTotal.toFixed(2)}`);
            
            // Verificar se o estabelecimento é premium para aplicar taxa correta
            let taxRate = 0.08; // Taxa padrão 8%
            
            // Buscar dados do estabelecimento para verificar se é premium
            const partnerId = doc.ref.parent.parent?.id;
            console.log(`  partnerId: ${partnerId}`);
            
            if (partnerId) {
              const partnerDoc = partnersSnapshot.docs.find(p => p.id === partnerId);
              if (partnerDoc) {
                const partnerData = partnerDoc.data();
                
                // Verificar premium tanto no nível raiz quanto em store (para compatibilidade)
                const isPremium = partnerData.store?.isPremium === true;
                const premiumExpiresAt = partnerData.premiumExpiresAt || partnerData.store?.premiumExpiresAt;
                const productIdentifier = partnerData.productIdentifier;
                
                // Verificar se é premium pelo productIdentifier ou isPremium
                const hasPremium = isPremium || productIdentifier === 'parceiros_premium';
                console.log(`  hasPremium: ${hasPremium} (isPremium: ${isPremium}, productIdentifier: ${productIdentifier})`);
                
                // Verificar se estava premium durante o mês selecionado
                if (hasPremium && premiumExpiresAt) {
                  let expirationDate;
                  
                  if (premiumExpiresAt instanceof Timestamp) {
                    expirationDate = premiumExpiresAt.toDate();
                  } else if (typeof premiumExpiresAt === 'string') {
                    expirationDate = new Date(premiumExpiresAt);
                  } else if (premiumExpiresAt.seconds) {
                    expirationDate = new Date(premiumExpiresAt.seconds * 1000);
                  } else {
                    expirationDate = new Date();
                  }
                  
                  console.log(`  premiumExpiresAt: ${expirationDate.toISOString()}`);
                  console.log(`  startDate: ${startDate.toISOString()}`);
                  
                  // Se a data de expiração é posterior ao início do mês, estava premium
                  if (expirationDate >= startDate) {
                    taxRate = 0.05; // Taxa premium 5%
                    console.log(`  ✓ Aplicando taxa premium 5%`);
                  } else {
                    console.log(`  ✗ Premium expirado, aplicando taxa padrão 8%`);
                  }
                } else {
                  console.log(`  ✗ Não é premium ou sem data de expiração, aplicando taxa padrão 8%`);
                }
              } else {
                console.log(`  ✗ Parceiro não encontrado, aplicando taxa padrão 8%`);
              }
            } else {
              console.log(`  ✗ partnerId não encontrado, aplicando taxa padrão 8%`);
            }
            
            const calculatedFee = orderTotal * taxRate;
            
            console.log(`  Taxa calculada: R$ ${orderTotal.toFixed(2)} × ${(taxRate*100)}% = R$ ${calculatedFee.toFixed(2)}`);
            serviceFees += calculatedFee;
            console.log(`  Total acumulado: R$ ${serviceFees.toFixed(2)}`);
            console.log(`  ---`);
          });
          
          console.log(`==========================================`);
          console.log(`Taxa de serviço calculada a partir dos pedidos: R$ ${serviceFees.toFixed(2)}`);
          console.log(`==========================================`);
        }
        
        // Calcular receita bruta da plataforma (sem descontar custos)
        const grossRevenue = serviceFees + premiumRevenue;
        
        // Calcular ticket médio dos pedidos
        const averageTicket = filteredOrders.length > 0 ? totalSales / filteredOrders.length : 0;
        
        // Calcular créditos dos estabelecimentos (apenas para informação)
        const totalCredits = partnerCreditsTotals.reduce((sum, partnerTotal) => sum + partnerTotal, 0);
        
        // Custos operacionais = soma dos créditos concedidos aos parceiros
        const operationalCosts = totalCredits;
        
        console.log(`==========================================`);
        console.log(`VERIFICAÇÃO DE CUSTOS:`);
        console.log(`Total de créditos concedidos (partners/*/credits): R$ ${totalCredits.toFixed(2)}`);
        console.log(`Cupons admin no período (informativo): R$ ${adminCouponsDiscounts.toFixed(2)}`);
        console.log(`operationalCosts (usando créditos): R$ ${operationalCosts.toFixed(2)}`);
        console.log(`==========================================`);
        
        // Calcular lucro líquido = Receita Bruta - Custos Operacionais
        const netProfit = grossRevenue - operationalCosts;
        
        console.log(`==========================================`);
        console.log(`CÁLCULO DO LUCRO:`);
        console.log(`Receita Bruta (grossRevenue): R$ ${grossRevenue.toFixed(2)}`);
        console.log(`Custos (operationalCosts): R$ ${operationalCosts.toFixed(2)}`);
        console.log(`Lucro Líquido (netProfit): R$ ${netProfit.toFixed(2)}`);
        console.log(`Fórmula: ${grossRevenue.toFixed(2)} - ${operationalCosts.toFixed(2)} = ${netProfit.toFixed(2)}`);
        console.log(`==========================================`);
        
        // Calcular receita líquida (para compatibilidade com a estrutura antiga)
        const platformRevenue = grossRevenue - adminCouponsDiscounts;
        
        // Calcular margem de lucro baseada na receita bruta
        const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
        
        // Calcular custo por pedido
        const costPerOrder = filteredOrders.length > 0 ? operationalCosts / filteredOrders.length : 0;
        
        // Contar parceiros ativos e premium
        const activePartners = partnersSnapshot.docs.filter(doc => {
          const partnerData = doc.data();
          return partnerData.isActive !== false;
        }).length;
        
        // Calcular receita média por parceiro
        const averageRevenuePerPartner = activePartners > 0 ? platformRevenue / activePartners : 0;
        
        // Calcular taxa de conversão para premium
        const conversionRate = activePartners > 0 ? (premiumPartnersCount / activePartners) * 100 : 0;
        
        // Buscar métricas do mês anterior para calcular crescimento
        const prevMetrics = await fetchPreviousMonthMetrics(selectedMonth, selectedYear);
        
        // Calcular crescimento da receita
        const revenueGrowth = prevMetrics && prevMetrics.metrics.platformRevenue > 0 
          ? ((platformRevenue - prevMetrics.metrics.platformRevenue) / prevMetrics.metrics.platformRevenue) * 100 
          : 0;
        
        console.log(`==========================================`);
        console.log(`MÉTRICAS FINAIS CALCULADAS:`);
        console.log(`==========================================`);
        console.log(`Volume de Vendas (Lojistas): R$ ${totalSales.toFixed(2)}`);
        console.log(`Total de Pedidos: ${filteredOrders.length}`);
        console.log(`Ticket Médio: R$ ${averageTicket.toFixed(2)}`);
        console.log(`---`);
        console.log(`RECEITAS DA PLATAFORMA:`);
        console.log(`Taxas de Serviço: R$ ${serviceFees.toFixed(2)}`);
        console.log(`Assinaturas Premium: R$ ${premiumRevenue.toFixed(2)}`);
        console.log(`Receita Bruta Total: R$ ${grossRevenue.toFixed(2)}`);
        console.log(`---`);
        console.log(`CUSTOS OPERACIONAIS:`);
        console.log(`Cupons Admin Usados: R$ ${operationalCosts.toFixed(2)}`);
        console.log(`(Créditos dos estabelecimentos: R$ ${totalCredits.toFixed(2)})`);
        console.log(`---`);
        console.log(`RESULTADO FINAL:`);
        console.log(`Receita Bruta: R$ ${grossRevenue.toFixed(2)}`);
        console.log(`(-) Cupons Admin: R$ ${operationalCosts.toFixed(2)}`);
        console.log(`Lucro Líquido: R$ ${netProfit.toFixed(2)}`);
        console.log(`Margem de Lucro: ${profitMargin.toFixed(2)}%`);
        console.log(`==========================================`);

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
            averageTicket,
            // Novas métricas
            operationalCosts,
            netProfit,
            profitMargin,
            costPerOrder,
            revenueGrowth,
            activePartners,
            premiumPartners: premiumPartnersCount,
            conversionRate,
            averageRevenuePerPartner
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
    'Receita Total': '#00BCD4',
    'Custos Operacionais': '#FF9800',
    'Lucro Líquido': '#4CAF50'
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
      name: 'Custos Operacionais',
      valor: monthlyMetrics.metrics.operationalCosts,
    },
    {
      name: 'Receita Total',
      valor: monthlyMetrics.metrics.platformRevenue,
    },
    {
      name: 'Lucro Líquido',
      valor: monthlyMetrics.metrics.netProfit,
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
                {(monthlyMetrics.metrics.serviceFees + monthlyMetrics.metrics.premiumSubscriptions).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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

            <div className="metric-card profit">
              <h3>Lucro Líquido</h3>
              <div className="metric-value">
                {monthlyMetrics.metrics.netProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <div className="metric-subtitle">
                receita bruta - custos totais
              </div>
            </div>

            <div className="metric-card margin">
              <h3>Margem de Lucro</h3>
              <div className="metric-value">
                {monthlyMetrics.metrics.profitMargin.toFixed(1)}%
              </div>
              <div className="metric-subtitle">
                percentual de lucro
              </div>
            </div>

            <div className="metric-card partners">
              <h3>Parceiros Ativos</h3>
              <div className="metric-value">
                {monthlyMetrics.metrics.activePartners}
              </div>
              <div className="metric-subtitle">
                {monthlyMetrics.metrics.premiumPartners} premium ({monthlyMetrics.metrics.conversionRate.toFixed(1)}%)
              </div>
            </div>

            <div className="metric-card growth">
              <h3>Crescimento da Receita</h3>
              <div className="metric-value">
                {monthlyMetrics.metrics.revenueGrowth >= 0 ? '+' : ''}{monthlyMetrics.metrics.revenueGrowth.toFixed(1)}%
              </div>
              <div className="metric-subtitle">
                vs mês anterior
              </div>
            </div>

            <div className="metric-card cost">
              <h3>Cupons Admin Usados</h3>
              <div className="metric-value">
                {monthlyMetrics.metrics.operationalCosts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <div className="metric-subtitle">
                custo operacional do mês
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
                  <span>Taxas de Serviço (comissões)</span>
                  <span>{monthlyMetrics.metrics.serviceFees.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="summary-item">
                  <span>Assinaturas Premium</span>
                  <span>{monthlyMetrics.metrics.premiumSubscriptions.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="summary-item total">
                  <span>Receita Bruta Total</span>
                  <span>{(monthlyMetrics.metrics.serviceFees + monthlyMetrics.metrics.premiumSubscriptions).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="summary-item section-divider">
                  <span><strong>Custos Operacionais</strong></span>
                  <span></span>
                </div>
                <div className="summary-item expense">
                  <span>Cupons Admin Usados</span>
                  <span>- {monthlyMetrics.metrics.operationalCosts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="summary-item section-divider">
                  <span><strong>Resultado Final</strong></span>
                  <span></span>
                </div>
                <div className="summary-item">
                  <span>Receita Bruta</span>
                  <span>{(monthlyMetrics.metrics.serviceFees + monthlyMetrics.metrics.premiumSubscriptions).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="summary-item expense">
                  <span>(-) Cupons Admin</span>
                  <span>- {monthlyMetrics.metrics.operationalCosts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="summary-item total">
                  <span><strong>Lucro Líquido</strong></span>
                  <span><strong>{monthlyMetrics.metrics.netProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></span>
                </div>
                <div className="summary-item">
                  <span>Margem de Lucro</span>
                  <span>{monthlyMetrics.metrics.profitMargin.toFixed(1)}%</span>
                </div>
                <div className="summary-item">
                  <span>Custo por Pedido</span>
                  <span>{monthlyMetrics.metrics.costPerOrder.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="summary-item">
                  <span>Receita por Parceiro</span>
                  <span>{monthlyMetrics.metrics.averageRevenuePerPartner.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
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