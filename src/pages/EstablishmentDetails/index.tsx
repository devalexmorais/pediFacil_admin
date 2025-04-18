import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getStoreInvoices, Invoice } from '../../services/invoiceService';
import { checkBillingControl, initializeBillingControl, } from '../../services/billingService';
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
  const [hasBillingControl, setHasBillingControl] = useState(false);
  const [initializingBilling, setInitializingBilling] = useState(false);

  useEffect(() => {
    if (id) {
      loadEstablishmentDetails();
      loadInvoices();
      checkBillingControlExists();
    }
  }, [id]);

  const loadInvoices = async () => {
    if (!id) return;
    try {
      const storeInvoices = await getStoreInvoices(id);
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
            minimumOrderAmount: data.settings?.delivery?.minimumOrderAmount || 0
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

  const checkBillingControlExists = async () => {
    if (!id) return;
    try {
      console.log('Verificando billing control para estabelecimento:', id);
      const exists = await checkBillingControl(id);
      console.log('Billing control existe?', exists);
      setHasBillingControl(exists);
    } catch (error) {
      console.error('Erro ao verificar controle de faturamento:', error);
    }
  };

  const handleInitializeBilling = async () => {
    if (!id) {
      console.error('ID do estabelecimento não disponível');
      alert('Erro: ID do estabelecimento não disponível');
      return;
    }

    try {
      console.log('Iniciando inicialização do billing control para:', id);
      setInitializingBilling(true);
      setError('');

      await initializeBillingControl(id);
      console.log('Billing control inicializado com sucesso');
      
      // Verificar se foi realmente criado
      const exists = await checkBillingControl(id);
      if (!exists) {
        throw new Error('Billing control não foi criado corretamente');
      }
      
      setHasBillingControl(true);
      // Recarregar faturas após inicialização
      await loadInvoices();
    } catch (err: any) {
      console.error('Erro detalhado ao inicializar faturamento:', {
        error: err,
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      
      // Mostrar mensagem de erro apropriada para o usuário
      let errorMessage = 'Erro ao inicializar faturamento. ';
      if (err.message?.includes('permission-denied')) {
        errorMessage += 'Você não tem permissão para realizar esta ação.';
      } else if (err.message?.includes('not-found')) {
        errorMessage += 'Estabelecimento não encontrado.';
      } else {
        errorMessage += err.message || 'Por favor, tente novamente.';
      }
      
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setInitializingBilling(false);
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago':
        return 'status-paid';
      case 'atrasado':
        return 'status-late';
      default:
        return 'status-pending';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pago':
        return 'Pago';
      case 'atrasado':
        return 'Atrasado';
      default:
        return 'Pendente';
    }
  };

  return (
    <div className="establishment-details">
      <button 
        className="back-button"
        onClick={() => navigate(-1)}
      >
        ← Voltar
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
              <span className="value">R$ {establishment.settings.delivery.minimumOrderAmount.toFixed(2)}</span>
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
          {!hasBillingControl ? (
            <div className="billing-init-container">
              <p>O controle de faturamento ainda não foi inicializado para este estabelecimento.</p>
              <button 
                className="initialize-billing-button"
                onClick={handleInitializeBilling}
                disabled={initializingBilling}
              >
                {initializingBilling ? 'Inicializando...' : 'Inicializar Controle de Faturamento'}
              </button>
            </div>
          ) : (
            <>
              {invoices.length === 0 ? (
                <p className="no-invoices">Nenhuma fatura encontrada</p>
              ) : (
                <div className="invoices-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Período</th>
                        <th>Valor</th>
                        <th>Status</th>
                        <th>Data de Criação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td>
                            {formatDate(invoice.cycleStart.toDate())} - {formatDate(invoice.cycleEnd.toDate())}
                          </td>
                          <td>{formatCurrency(invoice.totalFee)}</td>
                          <td>
                            <span className={`status-badge ${getStatusColor(invoice.status)}`}>
                              {getStatusText(invoice.status)}
                            </span>
                          </td>
                          <td>{formatDate(invoice.createdAt.toDate())}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default EstablishmentDetails; 