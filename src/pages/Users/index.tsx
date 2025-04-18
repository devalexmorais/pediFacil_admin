import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, query, where, Timestamp } from 'firebase/firestore';
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

const Users = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError('');

      const usersCollection = collection(db, 'users');
      const q = query(usersCollection, where('role', '==', 'customer'));
      const querySnapshot = await getDocs(q);

      const customersData = await Promise.all(querySnapshot.docs.map(async (doc) => {
        const userData = doc.data();
        
        // Buscar contagens relacionadas
        const ordersCollection = collection(db, `users/${doc.id}/orders`);
        const reviewsCollection = collection(db, `users/${doc.id}/reviews`);
        const addressesCollection = collection(db, `users/${doc.id}/addresses`);

        const [ordersSnapshot, reviewsSnapshot, addressesSnapshot] = await Promise.all([
          getDocs(ordersCollection),
          getDocs(reviewsCollection),
          getDocs(addressesCollection)
        ]);

        // Mapear endereços com todos os campos
        const addresses = addressesSnapshot.docs.map(addressDoc => {
          const addressData = addressDoc.data();
          return {
            id: addressDoc.id,
            title: addressData.title || '',
            street: addressData.street || '',
            number: addressData.number || '',
            complement: addressData.complement || '',
            neighborhood: addressData.neighborhood || '',
            neighborhoodId: addressData.neighborhoodId || '',
            city: addressData.city || '',
            cityId: addressData.cityId || '',
            state: addressData.state || '',
            stateId: addressData.stateId || '',
            isDefault: addressData.isDefault || false
          };
        });

        return {
          id: doc.id,
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
          addresses,
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
      }));

      setCustomers(customersData);
    } catch (err: any) {
      console.error('Erro detalhado:', err);
      setError(err.message || 'Erro ao carregar lista de clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (customerId: string) => {
    try {
      const userRef = doc(db, 'users', customerId);
      const customerToUpdate = customers.find(c => c.id === customerId);
      
      if (!customerToUpdate) {
        throw new Error('Cliente não encontrado');
      }

      await updateDoc(userRef, {
        status: customerToUpdate.status === 'active' ? 'blocked' : 'active',
        updatedAt: Timestamp.now()
      });

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

    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCustomers = filteredCustomers.slice(startIndex, endIndex);

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
        </div>

        {searchText && (
          <div className="filter-summary">
            <button 
              className="clear-filters"
              onClick={() => setSearchText('')}
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
              <th>Pedidos</th>
              <th>Avaliações</th>
              <th>Cadastro</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {currentCustomers.map((customer) => (
              <tr key={customer.id}>
                <td>
                  <div className="user-info">
                    {customer.profileImage && (
                      <img 
                        src={customer.profileImage} 
                        alt={customer.name}
                        className="user-avatar"
                      />
                    )}
                    <span>{customer.name}</span>
                  </div>
                </td>
                <td>{customer.email}</td>
                <td>{customer.phone}</td>
                <td>{formatCPF(customer.cpf)}</td>
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
                <td>{new Date(customer.createdAt.toDate()).toLocaleDateString('pt-BR')}</td>
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
                      className={`action-btn ${customer.status === 'blocked' ? 'unblock' : 'block'}`}
                    >
                      {customer.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
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