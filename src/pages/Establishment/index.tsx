import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSellers, toggleSellerBlock, type Seller } from '../../services/sellerServices';
import './styles.css';

const Establishment = () => {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    loadSellers();
  }, []);

  const loadSellers = async () => {
    try {
      setLoading(true);
      const sellersData = await getAllSellers();
      console.log('Dados recebidos do Firebase:', sellersData);
      setSellers(sellersData || []);
    } catch (err) {
      console.error('Erro detalhado:', err);
      setError('Erro ao carregar estabelecimentos');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    const seller = sellers.find(s => s.id === id);
    if (!seller) return;

    try {
      await toggleSellerBlock(id, seller.isBlocked);
      // Atualiza a lista de estabelecimentos após o bloqueio/desbloqueio
      await loadSellers();
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err);
      alert(err.message || 'Erro ao alterar status do estabelecimento. Tente novamente.');
    }
  };

  const filteredSellers = sellers.filter(seller =>
    seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    seller.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    seller.cnpj_or_cpf.includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredSellers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSellers = filteredSellers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando estabelecimentos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={loadSellers} className="retry-button">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="establishments-container">
      <div className="page-header">
        <div className="header-content">
          <h1>Gerenciar Estabelecimentos</h1>
        </div>
        <div className="search-filters">
          <input
            type="text"
            placeholder="Buscar por nome, email ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select className="filter-select">
            <option value="">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="blocked">Bloqueados</option>
          </select>
        </div>
      </div>

      {searchTerm && (
        <div className="filter-summary">
          <button className="clear-filters" onClick={() => setSearchTerm('')}>
            Limpar filtros
          </button>
        </div>
      )}

      <div className="table-container">
        <table className="establishments-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>CNPJ/CPF</th>
              <th>Email</th>
              <th>Telefone</th>
              <th>Endereço</th>
              <th>Status</th>
              <th>Pedidos</th>
              <th>Avaliações</th>
              <th>Cadastro</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {currentSellers.map(seller => (
              <tr key={seller.id}>
                <td>{seller.storeName}</td>
                <td>{seller.cnpj_or_cpf}</td>
                <td>{seller.email}</td>
                <td>{seller.phone}</td>
                <td>{`${seller.street}, ${seller.number}`}</td>
                <td>
                  <span className={`status-badge ${seller.isBlocked ? 'inactive' : 'active'}`}>
                    {seller.isBlocked ? 'Bloqueado' : 'Ativo'}
                  </span>
                </td>
                <td className="count-cell">
                  <span className="count-badge orders">
                    {seller._count.orders}
                  </span>
                </td>
                <td className="count-cell">
                  <span className="count-badge reviews">
                    {seller._count.reviews}
                  </span>
                </td>
                <td>{seller.createdAt.toDate().toLocaleDateString('pt-BR')}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => navigate(`/establishment/${seller.id}`)}
                      className="action-btn view"
                    >
                      Visualizar
                    </button>
                    <button
                      onClick={() => handleToggleStatus(seller.id)}
                      className={`action-btn ${seller.isBlocked ? 'unblock' : 'block'}`}
                    >
                      {seller.isBlocked ? 'Desbloquear' : 'Bloquear'}
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
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            Anterior
          </button>
          <span className="pagination-info">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
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

export default Establishment; 