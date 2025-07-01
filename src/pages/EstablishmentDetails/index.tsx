import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Invoice } from '../../services/invoiceService';
import Layout from '../../components/Layout';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadEstablishmentDetails();
      loadInvoices();
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
      setEstablishment({
        id: docSnap.id,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        street: data.street || '',
        number: data.number || '',
        complement: data.complement || '',
        neighborhood: data.neighborhood || '',
        city: data.city || '',
        state: data.state || '',
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

  if (loading) {
    return (
      <Layout>
        <div className="establishment-details">
          <button 
            className="back-button"
            onClick={() => navigate(-1)}
          >
            Voltar
          </button>
          <div className="loading">Carregando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="establishment-details">
      <button 
        className="back-button"
        onClick={() => navigate(-1)}
      >
          Voltar
      </button>

      <div className="details-header">
        <h1>{establishment.store.name}</h1>
        <div className="establishment-info">
          <span className={`status-badge ${!establishment.isActive ? 'inactive' : 'active'}`}>
            {establishment.isActive ? 'Ativo' : 'Inativo'}
          </span>
          <span className={`status-badge ${!establishment.isOpen ? 'closed' : 'open'}`}>
            {establishment.isOpen ? 'Aberto' : 'Fechado'}
          </span>
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
    </Layout>
  );
};

export default EstablishmentDetails; 