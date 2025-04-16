import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSellers, toggleSellerBlock, type Seller } from '../../services/sellerServices';
import { verifyAndFixUserRole } from '../../services/userServices';
import './styles.css';

const Establishment = () => {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    loadSellers();
  }, []);

  const loadSellers = async () => {
    try {
      setLoading(true);
      const sellersData = await getAllSellers();
      console.log('Dados dos estabelecimentos:', JSON.stringify(sellersData, null, 2));
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
      const confirmMessage = seller.isActive 
        ? `Tem certeza que deseja bloquear o estabelecimento "${seller.store.name}"?`
        : `Tem certeza que deseja desbloquear o estabelecimento "${seller.store.name}"?`;

      if (window.confirm(confirmMessage)) {
        try {
          // Tenta primeiro verificar e corrigir as permissões
          await verifyAndFixUserRole();
          // Se der certo, tenta fazer o toggle
          await toggleSellerBlock(id, seller.isActive);
          await loadSellers();
        } catch (permissionError) {
          console.error('Erro de permissão:', permissionError);
          alert('Você não tem permissão para realizar esta ação. Apenas administradores podem bloquear/desbloquear estabelecimentos.');
        }
      }
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err);
      alert(err.message || 'Erro ao alterar status do estabelecimento. Tente novamente.');
    }
  };

  const filteredSellers = sellers.filter(seller => {
    const matchesSearch = 
      seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seller.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seller.store.document.includes(searchTerm);

    const matchesStatus = 
      statusFilter === '' || 
      (statusFilter === 'open' && seller.isOpen) ||
      (statusFilter === 'closed' && !seller.isOpen);

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredSellers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSellers = filteredSellers.slice(startIndex, endIndex);

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
            placeholder="Buscar por nome, email ou documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select 
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="open">Aberto</option>
            <option value="closed">Fechado</option>
          </select>
        </div>
      </div>

      {(searchTerm || statusFilter) && (
        <div className="filter-summary">
          <button 
            className="clear-filters" 
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
            }}
          >
            Limpar filtros
          </button>
        </div>
      )}

      <div className="table-container">
        <table className="establishments-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Documento</th>
              <th>Email</th>
              <th>Telefone</th>
              <th>Status de Funcionamento</th>
              <th>Cadastro</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {currentSellers.map(seller => {
              const isOpenStatus = Boolean(seller.isOpen);
              console.log('Status do estabelecimento:', {
                nome: seller.store.name,
                isOpen: seller.isOpen,
                isOpenBoolean: isOpenStatus,
                rawData: seller
              });
              return (
                <tr key={seller.id}>
                  <td>{seller.store.name}</td>
                  <td>{seller.email}</td>
                  <td>{seller.phone}</td>
                  <td>
                    <span className={`status-badge ${isOpenStatus ? 'open' : 'closed'}`}>
                      {isOpenStatus ? 'Aberto' : 'Fechado'}
                    </span>
                  </td>
                  <td>{new Date(seller.createdAt.seconds * 1000).toLocaleDateString('pt-BR')}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => navigate(`/establishment/${seller.id}`)}
                        className="action-btn view"
                      >
                        Visualizar
                      </button>
                      <button
                        className={`action-btn ${seller.isActive ? 'block' : 'unblock'}`}
                        onClick={() => handleToggleStatus(seller.id)}
                      >
                        {seller.isActive ? 'Bloquear' : 'Desbloquear'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
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

export default Establishment; 