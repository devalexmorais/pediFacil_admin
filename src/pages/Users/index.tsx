import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const Users = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const API_URL = 'http://localhost:8080';

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('@AdminApp:token');
      
      if (!token) {
        throw new Error('Token não encontrado');
      }

      console.log('Tentando conectar à API...');
      const response = await fetch(`${API_URL}/api/admin/customers`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).catch(error => {
        console.error('Erro de conexão:', error);
        throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro da API:', errorData);
        throw new Error(errorData.message || 'Erro ao buscar clientes');
      }

      const data = await response.json();
      console.log('Dados recebidos:', data);

      // Verifica se data é um array
      if (!Array.isArray(data)) {
        throw new Error('Formato de resposta inválido');
      }

      // Valida cada cliente
      const validCustomers = data.map(customer => {
        if (!customer._count) {
          customer._count = { orders: 0, reviews: 0, addresses: 0 };
        }
        return {
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
            orders: Number(customer._count.orders) || 0,
            reviews: Number(customer._count.reviews) || 0,
            addresses: Number(customer._count.addresses) || 0
          }
        };
      });

      setCustomers(validCustomers);
    } catch (err: any) {
      console.error('Erro detalhado:', err);
      setError(err.message || 'Erro ao carregar lista de clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (customerId: string) => {
    try {
      const token = localStorage.getItem('@AdminApp:token');
      
      if (!token) {
        throw new Error('Token não encontrado');
      }

      const response = await fetch(`${API_URL}/api/admin/customers/${customerId}/toggle-block`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).catch(error => {
        console.error('Erro de conexão:', error);
        throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao alterar status do cliente');
      }

      await loadCustomers();
    } catch (err: any) {
      console.error('Erro detalhado:', err);
      alert(err.message || 'Erro ao alterar status do cliente. Tente novamente.');
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchText.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchText.toLowerCase()) ||
      customer.cpf.includes(searchText);

    const matchesStatus = 
      !selectedStatus || 
      (selectedStatus === 'Inativo' && customer.isBlocked) ||
      (selectedStatus === 'Ativo' && !customer.isBlocked);

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCustomers = filteredCustomers.slice(startIndex, endIndex);

  const handleClearFilters = () => {
    setSearchText('');
    setSelectedStatus('');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando clientes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={loadCustomers} className="retry-button">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="users-container">
      <header className="page-header">
        <div className="header-content">
          <h1>Gerenciar Clientes</h1>
        </div>
        
        <div className="search-filters">
          <input 
            type="text" 
            placeholder="Buscar por nome, email ou CPF..." 
            className="search-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <select 
            className="filter-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Bloqueado</option>
          </select>
        </div>

        {(searchText || selectedStatus) && (
          <div className="filter-summary">
            <button 
              className="clear-filters"
              onClick={handleClearFilters}
            >
              Limpar Filtros
            </button>
          </div>
        )}
      </header>

      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Telefone</th>
              <th>CPF</th>
              <th>Status</th>
              <th>Pedidos</th>
              <th>Avaliações</th>
              <th>Endereços</th>
              <th>Cadastro</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {currentCustomers.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.name}</td>
                <td>{customer.email}</td>
                <td>{customer.phone}</td>
                <td>{customer.cpf}</td>
                <td>
                  <span className={`status-badge ${customer.isBlocked ? 'inactive' : 'active'}`}>
                    {customer.isBlocked ? 'Bloqueado' : 'Ativo'}
                  </span>
                </td>
                <td className="count-cell">
                  <span className="count-badge orders">
                    {customer._count.orders}
                  </span>
                </td>
                <td className="count-cell">
                  <span className="count-badge reviews">
                    {customer._count.reviews}
                  </span>
                </td>
                <td className="count-cell">
                  <span className="count-badge addresses">
                    {customer._count.addresses}
                  </span>
                </td>
                <td>{new Date(customer.createdAt).toLocaleDateString('pt-BR')}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      onClick={() => navigate(`/users/${customer.id}`)}
                      className="action-btn view"
                    >
                      Visualizar
                    </button>
                    <button 
                      onClick={() => handleToggleBlock(customer.id)}
                      className={`action-btn ${customer.isBlocked ? 'unblock' : 'block'}`}
                    >
                      {customer.isBlocked ? 'Desbloquear' : 'Bloquear'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            Anterior
          </button>
          <span className="pagination-info">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
};

export default Users; 