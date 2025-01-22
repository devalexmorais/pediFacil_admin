import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './styles.css';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  isActive: boolean;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
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
  const API_URL = 'http://localhost:8080';

  useEffect(() => {
    loadCustomerDetails();
  }, [id]);

  const loadCustomerDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('@AdminApp:token');
      
      if (!token) {
        throw new Error('Token não encontrado');
      }

      // Primeiro busca todos os clientes
      const response = await fetch(`${API_URL}/api/admin/customers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao carregar clientes');
      }

      const data = await response.json();
      
      // Encontra o cliente específico pelo ID
      const customer = data.find((c: any) => c.id === id);
      
      if (!customer) {
        throw new Error('Cliente não encontrado');
      }
      
      // Validação dos dados
      const validCustomer = {
        id: customer.id || '',
        name: customer.name || 'Nome não informado',
        email: customer.email || 'Email não informado',
        phone: customer.phone || 'Telefone não informado',
        cpf: customer.cpf || 'CPF não informado',
        isActive: Boolean(customer.isActive),
        isBlocked: Boolean(customer.isBlocked),
        createdAt: customer.createdAt || new Date().toISOString(),
        updatedAt: customer.updatedAt || new Date().toISOString(),
        _count: {
          orders: Number(customer._count?.orders) || 0,
          reviews: Number(customer._count?.reviews) || 0,
          addresses: Number(customer._count?.addresses) || 0
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
    if (!customer) return;
    
    try {
      const token = localStorage.getItem('@AdminApp:token');
      
      if (!token) {
        throw new Error('Token não encontrado');
      }

      const response = await fetch(`${API_URL}/api/admin/customers/${customer.id}/toggle-block`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao alterar status do cliente');
      }

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
        <h1>{customer.name}</h1>
        <div className="user-info">
          <span className={`status-badge ${customer.isBlocked ? 'inativo' : 'ativo'}`}>
            {customer.isBlocked ? 'Bloqueado' : 'Ativo'}
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
              <span className="value">{customer.cpf}</span>
            </div>
          </div>
        </section>

        <section className="info-section">
          <h2>Informações da Conta</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Data de Cadastro</span>
              <span className="value">{new Date(customer.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="info-item">
              <span className="label">Última Atualização</span>
              <span className="value">{new Date(customer.updatedAt).toLocaleDateString('pt-BR')}</span>
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
              <span className="value">{customer._count.addresses}</span>
            </div>
          </div>
        </section>

        <div className="actions">
          <button 
            onClick={handleToggleBlock}
            className={`block-button ${customer.isBlocked ? 'unblock' : 'block'}`}
          >
            {customer.isBlocked ? 'Desbloquear Cliente' : 'Bloquear Cliente'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetails; 