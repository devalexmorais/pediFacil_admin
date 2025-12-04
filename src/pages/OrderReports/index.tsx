import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import './styles.css';

interface OrderReport {
  id: string;
  orderId: string;
  orderCode: string;
  storeId: string;
  storeName: string;
  userId: string;
  userEmail: string;
  description: string;
  status: string;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
  orderData?: any;
  [key: string]: any;
}

const OrderReports = () => {
  const [orderReports, setOrderReports] = useState<OrderReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    loadOrderReports();
  }, []);

  const loadOrderReports = async () => {
    try {
      setLoading(true);
      setError('');

      // Buscar diretamente da coleção order_reports
      const reportsRef = collection(db, 'order_reports');
      const reportsQuery = query(reportsRef, orderBy('createdAt', 'desc'));
      const reportsSnapshot = await getDocs(reportsQuery);

      const reportsData: OrderReport[] = [];
      reportsSnapshot.forEach((reportDoc) => {
        const data = reportDoc.data();
        reportsData.push({
          id: reportDoc.id,
          orderId: data.orderId || data.orderCode || '',
          orderCode: data.orderCode || data.orderId || '',
          storeId: data.storeId || '',
          storeName: data.storeName || 'Nome não informado',
          userId: data.userId || '',
          userEmail: data.userEmail || '',
          description: data.description || '',
          status: data.status || 'pending',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          orderData: data.orderData || null,
          ...data
        } as OrderReport);
      });

      setOrderReports(reportsData);
      setLoading(false);
    } catch (err: any) {
      console.error('Erro ao carregar relatórios de pedidos:', err);
      setError('Erro ao carregar relatórios de pedidos. Tente novamente.');
      setLoading(false);
    }
  };

  // Filtrar dados
  const filteredData = orderReports.filter((report) => {
    const matchesSearch =
      report.orderId?.toLowerCase().includes(searchText.toLowerCase()) ||
      report.orderCode?.toLowerCase().includes(searchText.toLowerCase()) ||
      report.storeName?.toLowerCase().includes(searchText.toLowerCase()) ||
      report.userEmail?.toLowerCase().includes(searchText.toLowerCase()) ||
      report.description?.toLowerCase().includes(searchText.toLowerCase()) ||
      JSON.stringify(report).toLowerCase().includes(searchText.toLowerCase());

    const matchesStore = selectedStore === 'all' || report.storeId === selectedStore;
    const matchesStatus = selectedStatus === 'all' || report.status === selectedStatus;

    return matchesSearch && matchesStore && matchesStatus;
  });

  // Paginação
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Lista de estabelecimentos únicos para o filtro
  const uniqueStores = Array.from(
    new Set(orderReports.map((report) => report.storeId))
  ).map((storeId) => {
    const report = orderReports.find((r) => r.storeId === storeId);
    return {
      id: storeId,
      name: report?.storeName || 'Nome não informado'
    };
  });

  // Lista de status únicos para o filtro
  const uniqueStatuses = Array.from(
    new Set(orderReports.map((report) => report.status))
  ).filter(Boolean);

  const formatDate = (timestamp: Timestamp | any): string => {
    if (!timestamp) return 'Data não disponível';
    
    // Se for um objeto com _methodName (serverTimestamp), não há data disponível ainda
    if (timestamp._methodName === 'serverTimestamp') {
      return 'Aguardando servidor...';
    }
    
    try {
      let date: Date;
      
      // Se tiver método toDate (Timestamp do Firebase)
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      }
      // Se for um objeto com seconds e nanoseconds
      else if (timestamp.seconds !== undefined) {
        date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
      }
      // Se for uma string de data
      else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      }
      // Se for um número (timestamp em milissegundos)
      else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
      }
      // Tentar converter diretamente
      else {
        date = new Date(timestamp);
      }
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }
      
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return 'Data inválida';
    }
  };

  const toggleExpand = (reportId: string) => {
    setExpandedReport(expandedReport === reportId ? null : reportId);
  };

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    try {
      setUpdatingStatus(reportId);
      
      const reportRef = doc(db, 'order_reports', reportId);
      await updateDoc(reportRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });

      // Atualizar o estado local
      setOrderReports(prevReports =>
        prevReports.map(report =>
          report.id === reportId
            ? { ...report, status: newStatus, updatedAt: Timestamp.now() }
            : report
        )
      );

      setUpdatingStatus(null);
    } catch (err: any) {
      console.error('Erro ao atualizar status do relatório:', err);
      alert('Erro ao atualizar status do relatório. Tente novamente.');
      setUpdatingStatus(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'status-pending';
      case 'resolved':
      case 'approved':
        return 'status-resolved';
      case 'rejected':
      case 'cancelled':
        return 'status-rejected';
      default:
        return 'status-default';
    }
  };

  if (loading) {
    return (
      <div className="order-reports-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Carregando relatórios de pedidos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-reports-container">
        <div className="error-container">
          <p>{error}</p>
          <button className="retry-button" onClick={loadOrderReports}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="order-reports-container">
      <header className="page-header">
        <div className="header-content">
          <h1>Relatórios de Pedidos</h1>
          <p className="header-subtitle">
            Visualize e gerencie os relatórios dos pedidos
          </p>
        </div>
      </header>

      <div className="search-filters">
        <input
          type="text"
          className="search-input"
          placeholder="Buscar por código do pedido, estabelecimento, email do usuário ou descrição..."
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setCurrentPage(1);
          }}
        />
        <select
          className="filter-select"
          value={selectedStore}
          onChange={(e) => {
            setSelectedStore(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">Todos os estabelecimentos</option>
          {uniqueStores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">Todos os status</option>
          {uniqueStatuses.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-summary">
        <span className="results-count">
          {filteredData.length} {filteredData.length === 1 ? 'relatório encontrado' : 'relatórios encontrados'}
        </span>
        {(searchText || selectedStore !== 'all' || selectedStatus !== 'all') && (
          <button
            className="clear-filters"
            onClick={() => {
              setSearchText('');
              setSelectedStore('all');
              setSelectedStatus('all');
              setCurrentPage(1);
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="table-container">
        {paginatedData.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum relatório de pedido encontrado.</p>
          </div>
        ) : (
          <div className="orders-list">
            {paginatedData.map((report) => (
              <div key={report.id} className="order-card">
                <div className="order-header" onClick={() => toggleExpand(report.id)}>
                  <div className="order-info">
                    <div className="order-id">
                      <div>
                        <strong>Código do Pedido:</strong>
                        <div className="order-code-row">
                          <span>{report.orderCode || report.orderId}</span>
                          {report.status === 'resolved' && (
                            <span className="status-badge status-resolved-icon" title="Resolvido">
                              ✓
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="partner-name">
                      <strong>Estabelecimento:</strong> {report.storeName}
                    </div>
                    <div className="user-info">
                      <strong>Usuário:</strong> {report.userEmail || report.userId}
                    </div>
                    <div className="order-date">
                      <strong>Criado em:</strong> {formatDate(report.createdAt)}
                    </div>
                  </div>
                  <div className="expand-icon">
                    {expandedReport === report.id ? '▼' : '▶'}
                  </div>
                </div>

                {expandedReport === report.id && (
                  <div className="order-details">
                    <div className="report-description-section">
                      <h3>Descrição do Relatório</h3>
                      <div className="description-content">
                        {report.description || 'Sem descrição'}
                      </div>
                    </div>

                    <div className="report-info-section">
                      <h3>Informações do Relatório</h3>
                      <div className="order-data-grid">
                        <div className="data-item">
                          <span className="data-label">ID do Relatório:</span>
                          <span className="data-value">{report.id}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Código do Pedido:</span>
                          <span className="data-value">{report.orderCode || report.orderId}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Status:</span>
                          <span className={`data-value status-badge ${getStatusBadgeClass(report.status)}`}>
                            {report.status === 'resolved' ? 'Resolvido' : 
                             report.status === 'pending' ? 'Pendente' :
                             report.status || 'Pendente'}
                          </span>
                        </div>
                        {(report.status !== 'resolved') && (
                          <div className="data-item full-width">
                            <button
                              className="resolve-button"
                              onClick={() => handleUpdateStatus(report.id, 'resolved')}
                              disabled={updatingStatus === report.id}
                            >
                              {updatingStatus === report.id ? (
                                <>
                                  <span className="button-spinner"></span>
                                  Atualizando...
                                </>
                              ) : (
                                '✓ Marcar como Resolvido'
                              )}
                            </button>
                          </div>
                        )}
                        <div className="data-item">
                          <span className="data-label">Estabelecimento:</span>
                          <span className="data-value">{report.storeName}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">ID do Estabelecimento:</span>
                          <span className="data-value">{report.storeId}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Email do Usuário:</span>
                          <span className="data-value">{report.userEmail || 'N/A'}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">ID do Usuário:</span>
                          <span className="data-value">{report.userId}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Criado em:</span>
                          <span className="data-value">{formatDate(report.createdAt)}</span>
                        </div>
                        {report.updatedAt && (
                          <div className="data-item">
                            <span className="data-label">Atualizado em:</span>
                            <span className="data-value">{formatDate(report.updatedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {report.orderData && (
                      <>
                        <div className="order-data-section">
                          <h3>Informações do Pedido</h3>
                          <div className="order-data-grid">
                            <div className="data-item">
                              <span className="data-label">ID do Pedido:</span>
                              <span className="data-value">{report.orderData.id || report.orderCode || 'N/A'}</span>
                            </div>
                            <div className="data-item">
                              <span className="data-label">Código do Pedido:</span>
                              <span className="data-value">{report.orderData.orderCode || 'N/A'}</span>
                            </div>
                            <div className="data-item">
                              <span className="data-label">Status do Pedido:</span>
                              <span className="data-value">{report.orderData.status || 'N/A'}</span>
                            </div>
                            <div className="data-item">
                              <span className="data-label">Modo de Entrega:</span>
                              <span className="data-value">
                                {report.orderData.deliveryMode === 'delivery' ? 'Entrega' : report.orderData.deliveryMode === 'pickup' ? 'Retirada' : report.orderData.deliveryMode || 'N/A'}
                              </span>
                            </div>
                            <div className="data-item">
                              <span className="data-label">Valor Total:</span>
                              <span className="data-value highlight">
                                R$ {(report.orderData.finalPrice || report.orderData.totalPrice || 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="data-item">
                              <span className="data-label">Preço Base:</span>
                              <span className="data-value">
                                R$ {(report.orderData.totalPrice || 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="data-item">
                              <span className="data-label">Taxa do Cartão:</span>
                              <span className="data-value">
                                R$ {(report.orderData.cardFeeValue || 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="data-item">
                              <span className="data-label">Taxa de Entrega:</span>
                              <span className="data-value">
                                R$ {(report.orderData.deliveryFee || 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="data-item">
                              <span className="data-label">Desconto Total:</span>
                              <span className="data-value">
                                R$ {(report.orderData.discountTotal || 0).toFixed(2)}
                              </span>
                            </div>
                            {report.orderData.createdAt && (
                              <div className="data-item">
                                <span className="data-label">Pedido Criado em:</span>
                                <span className="data-value">{formatDate(report.orderData.createdAt)}</span>
                              </div>
                            )}
                            {report.orderData.updatedAt && (
                              <div className="data-item">
                                <span className="data-label">Pedido Atualizado em:</span>
                                <span className="data-value">{formatDate(report.orderData.updatedAt)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {report.orderData.payment && (
                          <div className="payment-section">
                            <h3>Informações de Pagamento</h3>
                            <div className="order-data-grid">
                              <div className="data-item">
                                <span className="data-label">Método de Pagamento:</span>
                                <span className="data-value">
                                  {report.orderData.payment.method === 'pix' ? 'PIX' : 
                                   report.orderData.payment.method === 'credit' ? 'Crédito' :
                                   report.orderData.payment.method === 'debit' ? 'Débito' :
                                   report.orderData.payment.method === 'money' ? 'Dinheiro' :
                                   report.orderData.payment.method || 'N/A'}
                                </span>
                              </div>
                              <div className="data-item">
                                <span className="data-label">Status do Pagamento:</span>
                                <span className={`data-value status-badge ${getStatusBadgeClass(report.orderData.payment.paymentStatus || 'pending')}`}>
                                  {report.orderData.payment.paymentStatus === 'approved' ? 'Aprovado' :
                                   report.orderData.payment.paymentStatus === 'pending' ? 'Pendente' :
                                   report.orderData.payment.paymentStatus === 'rejected' ? 'Rejeitado' :
                                   report.orderData.payment.paymentStatus || 'N/A'}
                                </span>
                              </div>
                              <div className="data-item">
                                <span className="data-label">Pagamento Aprovado:</span>
                                <span className="data-value">
                                  {report.orderData.payment.paymentApproved ? 'Sim' : 'Não'}
                                </span>
                              </div>
                              <div className="data-item">
                                <span className="data-label">Pagamento Confirmado:</span>
                                <span className="data-value">
                                  {report.orderData.payment.paymentConfirmed ? 'Sim' : 'Não'}
                                </span>
                              </div>
                              {report.orderData.payment.paymentApprovedAt && (
                                <div className="data-item">
                                  <span className="data-label">Pagamento Aprovado em:</span>
                                  <span className="data-value">
                                    {new Date(report.orderData.payment.paymentApprovedAt).toLocaleString('pt-BR')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {report.orderData.address && (
                          <div className="address-section">
                            <h3>Endereço de Entrega</h3>
                            <div className="order-data-grid">
                              <div className="data-item">
                                <span className="data-label">Rua:</span>
                                <span className="data-value">{report.orderData.address.street || 'N/A'}</span>
                              </div>
                              <div className="data-item">
                                <span className="data-label">Número:</span>
                                <span className="data-value">{report.orderData.address.number || 'N/A'}</span>
                              </div>
                              {report.orderData.address.complement && (
                                <div className="data-item">
                                  <span className="data-label">Complemento:</span>
                                  <span className="data-value">{report.orderData.address.complement}</span>
                                </div>
                              )}
                              <div className="data-item">
                                <span className="data-label">Bairro:</span>
                                <span className="data-value">{report.orderData.address.neighborhoodName || 'N/A'}</span>
                              </div>
                              <div className="data-item">
                                <span className="data-label">Cidade:</span>
                                <span className="data-value">{report.orderData.address.cityName || 'N/A'}</span>
                              </div>
                              <div className="data-item">
                                <span className="data-label">Estado:</span>
                                <span className="data-value">{report.orderData.address.stateName || 'N/A'}</span>
                              </div>
                              <div className="data-item">
                                <span className="data-label">ID do Bairro:</span>
                                <span className="data-value code">{report.orderData.address.neighborhood || 'N/A'}</span>
                              </div>
                              <div className="data-item">
                                <span className="data-label">ID da Cidade:</span>
                                <span className="data-value code">{report.orderData.address.city || 'N/A'}</span>
                              </div>
                              <div className="data-item">
                                <span className="data-label">ID do Estado:</span>
                                <span className="data-value code">{report.orderData.address.state || 'N/A'}</span>
                              </div>
                              <div className="data-item full-width">
                                <span className="data-label">Endereço Completo:</span>
                                <span className="data-value address-full">
                                  {report.orderData.address.street}, {report.orderData.address.number}
                                  {report.orderData.address.complement && ` - ${report.orderData.address.complement}`}
                                  <br />
                                  {report.orderData.address.neighborhoodName}, {report.orderData.address.cityName} - {report.orderData.address.stateName}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {report.orderData.items && report.orderData.items.length > 0 && (
                          <div className="items-section">
                            <h3>Itens do Pedido ({report.orderData.items.length})</h3>
                            <div className="items-table">
                              <div className="items-header">
                                <div className="item-col-name">Produto</div>
                                <div className="item-col-quantity">Quantidade</div>
                                <div className="item-col-price">Preço Unitário</div>
                                <div className="item-col-total">Total</div>
                              </div>
                              {report.orderData.items.map((item: any, index: number) => (
                                <div key={index} className="item-row">
                                  <div className="item-col-name">
                                    <div className="item-name">{item.name || 'Produto sem nome'}</div>
                                    {item.productId && (
                                      <div className="item-id">ID: {item.productId}</div>
                                    )}
                                  </div>
                                  <div className="item-col-quantity">{item.quantity || 0}</div>
                                  <div className="item-col-price">
                                    R$ {(item.price || 0).toFixed(2)}
                                  </div>
                                  <div className="item-col-total">
                                    R$ {(item.totalPrice || (item.price || 0) * (item.quantity || 0)).toFixed(2)}
                                  </div>
                                </div>
                              ))}
                              <div className="items-footer">
                                <div className="item-col-name"></div>
                                <div className="item-col-quantity"></div>
                                <div className="item-col-price"><strong>Total:</strong></div>
                                <div className="item-col-total">
                                  <strong>R$ {(report.orderData.finalPrice || report.orderData.totalPrice || 0).toFixed(2)}</strong>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="additional-info-section">
                          <h3>Informações Adicionais</h3>
                          <div className="order-data-grid">
                            {report.orderData.storeName && (
                              <div className="data-item">
                                <span className="data-label">Nome do Estabelecimento:</span>
                                <span className="data-value">{report.orderData.storeName}</span>
                              </div>
                            )}
                            {report.orderData.storeId && (
                              <div className="data-item">
                                <span className="data-label">ID do Estabelecimento:</span>
                                <span className="data-value code">{report.orderData.storeId}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {report.orderData.payment?.receiptImage && (
                          <div className="receipt-section">
                            <h3>Comprovante de Pagamento</h3>
                            <div className="receipt-image-container">
                              {imageErrors.has(report.orderData.payment.receiptImage) ? (
                                <div className="receipt-error">
                                  <p>Erro ao carregar imagem</p>
                                  <a 
                                    href={report.orderData.payment.receiptImage} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="receipt-error-link"
                                  >
                                    Abrir comprovante em nova aba
                                  </a>
                                </div>
                              ) : (
                                <a 
                                  href={report.orderData.payment.receiptImage} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="receipt-link"
                                >
                                  <img 
                                    src={report.orderData.payment.receiptImage} 
                                    alt="Comprovante de pagamento" 
                                    className="receipt-image"
                                    onError={() => {
                                      setImageErrors(prev => new Set(prev).add(report.orderData.payment.receiptImage));
                                    }}
                                    onLoad={() => {
                                      // Imagem carregou com sucesso
                                    }}
                                    loading="lazy"
                                  />
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </button>
          <span className="pagination-info">
            Página {currentPage} de {totalPages}
          </span>
          <button
            className="pagination-button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderReports;
