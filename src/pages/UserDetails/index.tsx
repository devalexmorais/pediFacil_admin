import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import './styles.css';

const formatCPF = (encryptedCPF: string): string => {
  try {
    // Pega os últimos 3 dígitos após o último ponto
    const lastPart = encryptedCPF.split('.').pop();
    if (!lastPart) return '***.***.***-**';
    
    // Formata como CPF usando os 3 dígitos como início
    return `${lastPart}.***.***-**`;
  } catch (error) {
    return '***.***.***-**';
  }
};

interface Address {
  id: string;
  title: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  neighborhoodId: string;
  city: string;
  cityId: string;
  state: string;
  stateId: string;
  isDefault: boolean;
}

interface DeviceInfo {
  lastUpdated: Timestamp;
  platform: string;
  version: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate: string;
  profileImage: string;
  role: string;
  status: string;
  deviceInfo: DeviceInfo;
  addresses: Address[];
  usedCoupons: string[];
  fcmToken: string;
  fcmTokens: Record<string, boolean>;
  lastTokenUpdate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  _count: {
    orders: number;
    reviews: number;
    addresses: number;
  };
}

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadCustomerDetails();
    }
  }, [id]);

  const loadCustomerDetails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError('');

      const userRef = doc(db, 'users', id);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('Cliente não encontrado');
      }

      const userData = userDoc.data();

      // Buscar contagens relacionadas
      const ordersCollection = collection(db, `users/${id}/orders`);
      const reviewsCollection = collection(db, `users/${id}/reviews`);

      const [ordersSnapshot, reviewsSnapshot] = await Promise.all([
        getDocs(ordersCollection),
        getDocs(reviewsCollection)
      ]);

      // Mapear endereços diretamente do userData
      const addresses = userData.addresses || [];

      const validCustomer = {
        id: userDoc.id,
        name: userData.name || 'Nome não informado',
        email: userData.email || 'Email não informado',
        phone: userData.phone || 'Telefone não informado',
        cpf: userData.cpf || 'CPF não informado',
        birthDate: userData.birthDate || '',
        profileImage: userData.profileImage || '',
        role: userData.role || 'customer',
        status: userData.status || 'active',
        deviceInfo: userData.deviceInfo || {
          lastUpdated: Timestamp.now(),
          platform: '',
          version: 0
        },
        addresses: addresses,
        usedCoupons: userData.usedCoupons || [],
        fcmToken: userData.fcmToken || '',
        fcmTokens: userData.fcmTokens || {},
        lastTokenUpdate: userData.lastTokenUpdate || Timestamp.now(),
        createdAt: userData.createdAt || Timestamp.now(),
        updatedAt: userData.updatedAt || Timestamp.now(),
        _count: {
          orders: ordersSnapshot.size,
          reviews: reviewsSnapshot.size,
          addresses: addresses.length
        }
      };

      setCustomer(validCustomer);
    } catch (err: any) {
      console.error('Erro detalhado:', err);
      setError(err.message || 'Erro ao carregar detalhes do cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!customer || !id) return;
    
    try {
      const userRef = doc(db, 'users', id);
      
      await updateDoc(userRef, {
        status: customer.status === 'active' ? 'blocked' : 'active',
        updatedAt: Timestamp.now()
      });

      await loadCustomerDetails();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status do cliente');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando detalhes do cliente...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={loadCustomerDetails} className="retry-button">
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="error-container">
        <p>Cliente não encontrado</p>
        <button onClick={() => navigate('/users')} className="back-button">
          Voltar para lista
        </button>
      </div>
    );
  }

  return (
    <div className="user-details">
      <button 
        className="back-button"
        onClick={() => navigate(-1)}
      >
        ← Voltar
      </button>

      <div className="details-header">
        <div className="user-profile">
          {customer.profileImage && (
            <img 
              src={customer.profileImage} 
              alt={customer.name}
              className="profile-image"
            />
          )}
          <h1>{customer.name}</h1>
        </div>
        <div className="user-info">
          <span className={`status-badge ${customer.status === 'blocked' ? 'inativo' : 'ativo'}`}>
            {customer.status === 'blocked' ? 'Bloqueado' : 'Ativo'}
          </span>
          <span className="order-count">🛍️ {customer._count.orders} pedidos</span>
        </div>
      </div>

      <div className="details-content">
        <section className="info-section">
          <h2>Informações Pessoais</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Email</span>
              <span className="value">{customer.email}</span>
            </div>
            <div className="info-item">
              <span className="label">Telefone</span>
              <span className="value">{customer.phone}</span>
            </div>
            <div className="info-item">
              <span className="label">CPF</span>
              <span className="value">{formatCPF(customer.cpf)}</span>
            </div>
            <div className="info-item">
              <span className="label">Data de Nascimento</span>
              <span className="value">{customer.birthDate}</span>
            </div>
          </div>
        </section>

        <section className="info-section">
          <h2>Endereços</h2>
          <div className="addresses-grid">
            {customer.addresses.map(address => (
              <div key={address.id} className={`address-card ${address.isDefault ? 'default' : ''}`}>
                <div className="address-header">
                  <h3>{address.title}</h3>
                  {address.isDefault && <span className="default-badge">Padrão</span>}
                </div>
                <p>{address.street}, {address.number}</p>
                {address.complement && <p>{address.complement}</p>}
                <p>{address.neighborhood} - {address.city}/{address.state}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="info-section">
          <h2>Informações da Conta</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Data de Cadastro</span>
              <span className="value">{new Date(customer.createdAt.toDate()).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="info-item">
              <span className="label">Última Atualização</span>
              <span className="value">{new Date(customer.updatedAt.toDate()).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="info-item">
              <span className="label">Total de Pedidos</span>
              <span className="value">{customer._count.orders}</span>
            </div>
            <div className="info-item">
              <span className="label">Total de Avaliações</span>
              <span className="value">{customer._count.reviews}</span>
            </div>
            <div className="info-item">
              <span className="label">Total de Endereços</span>
              <span className="value">{customer.addresses.length}</span>
            </div>
          </div>
        </section>

        <section className="info-section">
          <h2>Informações do Dispositivo</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Plataforma</span>
              <span className="value">{customer.deviceInfo.platform}</span>
            </div>
            <div className="info-item">
              <span className="label">Versão</span>
              <span className="value">{customer.deviceInfo.version}</span>
            </div>
            <div className="info-item">
              <span className="label">Última Atualização</span>
              <span className="value">
                {new Date(customer.deviceInfo.lastUpdated.toDate()).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </section>

        {customer.usedCoupons.length > 0 && (
          <section className="info-section">
            <h2>Cupons Utilizados</h2>
            <div className="coupons-grid">
              {customer.usedCoupons.map((coupon, index) => (
                <div key={index} className="coupon-card">
                  {coupon}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="actions">
          <button 
            onClick={handleToggleBlock}
            className={`block-button ${customer.status === 'blocked' ? 'unblock' : 'block'}`}
          >
            {customer.status === 'blocked' ? 'Desbloquear Cliente' : 'Bloquear Cliente'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetails; 