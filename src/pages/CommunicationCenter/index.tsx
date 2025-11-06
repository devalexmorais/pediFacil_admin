import { useState, useEffect } from 'react';
import { getAllSellers, type Seller } from '../../services/sellerServices';
import { sendBulkNotification, getSentNotificationsHistory, deleteNotificationFromHistory } from '../../services/notificationServices';
import './styles.css';

interface NotificationHistory {
  id: string;
  title: string;
  body: string;
  recipientCount: number;
  sentAt: any;
  status: string;
  deliveryMethod: string;
}

const CommunicationCenter = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [recipientType, setRecipientType] = useState<'all' | 'selected' | 'category'>('all');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadSellers();
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const historyData = await getSentNotificationsHistory(50);
      setHistory(historyData as NotificationHistory[]);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadSellers = async () => {
    try {
      setLoading(true);
      const sellersData = await getAllSellers();
      setSellers(sellersData || []);
    } catch (err) {
      console.error('Erro ao carregar estabelecimentos:', err);
      alert('Erro ao carregar estabelecimentos');
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(sellers.map(s => s.store.category).filter(Boolean)));

  const filteredSellers = sellers.filter(seller => {
    const matchesSearch = 
      seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seller.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seller.store.name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecipients(filteredSellers.map(s => s.id));
    } else {
      setSelectedRecipients([]);
    }
  };

  const handleSelectOne = (sellerId: string, checked: boolean) => {
    if (checked) {
      setSelectedRecipients([...selectedRecipients, sellerId]);
    } else {
      setSelectedRecipients(selectedRecipients.filter(id => id !== sellerId));
    }
  };

  const getRecipientIds = (): string[] => {
    switch (recipientType) {
      case 'all':
        return sellers.map(s => s.id);
      case 'selected':
        return selectedRecipients;
      case 'category':
        return sellers
          .filter(s => s.store.category === selectedCategory)
          .map(s => s.id);
      default:
        return [];
    }
  };

  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationBody.trim()) {
      alert('Por favor, preencha o título e a mensagem da notificação');
      return;
    }

    const recipientIds = getRecipientIds();

    if (recipientIds.length === 0) {
      alert('Selecione pelo menos um destinatário');
      return;
    }

    const confirmMessage = `Deseja enviar esta notificação para ${recipientIds.length} estabelecimento(s)?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setSending(true);

      await sendBulkNotification({
        recipientIds,
        title: notificationTitle,
        body: notificationBody,
      });

      alert(`Notificação enviada com sucesso para ${recipientIds.length} estabelecimento(s)!`);
      
      // Limpar o formulário
      setNotificationTitle('');
      setNotificationBody('');
      setSelectedRecipients([]);
      setRecipientType('all');
      setSelectedCategory('');
      
      // Recarregar histórico
      loadHistory();
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      alert('Erro ao enviar notificação. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Data não disponível';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Data inválida';
    }
  };

  const handleDeleteNotification = async (notificationId: string, title: string) => {
    const confirmMessage = `Tem certeza que deseja excluir a notificação "${title}"?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await deleteNotificationFromHistory(notificationId);
      
      // Atualiza a lista removendo a notificação excluída
      setHistory(history.filter(item => item.id !== notificationId));
      
      alert('Notificação excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
      alert('Erro ao excluir notificação. Tente novamente.');
    }
  };

  const recipientCount = getRecipientIds().length;

  return (
    <div className="communication-container">
      <div className="page-header">
        <h1>📢 Central de Comunicação</h1>
        <p className="subtitle">Envie notificações para os estabelecimentos parceiros</p>
      </div>

      <div className="communication-content">
        <div className="notification-form">
          <div className="form-section">
            <h2>Destinatários</h2>
            
            <div className="recipient-type-selector">
              <label className="radio-option">
                <input
                  type="radio"
                  name="recipientType"
                  value="all"
                  checked={recipientType === 'all'}
                  onChange={() => setRecipientType('all')}
                />
                <span>Todos os estabelecimentos ({sellers.length})</span>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  name="recipientType"
                  value="category"
                  checked={recipientType === 'category'}
                  onChange={() => setRecipientType('category')}
                />
                <span>Por categoria</span>
              </label>

              {recipientType === 'category' && (
                <select
                  className="category-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}

              <label className="radio-option">
                <input
                  type="radio"
                  name="recipientType"
                  value="selected"
                  checked={recipientType === 'selected'}
                  onChange={() => setRecipientType('selected')}
                />
                <span>Seleção manual ({selectedRecipients.length})</span>
              </label>
            </div>

            {recipientType === 'selected' && (
              <div className="manual-selection">
                <input
                  type="text"
                  placeholder="Buscar estabelecimento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />

                <div className="select-all-container">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedRecipients.length === filteredSellers.length && filteredSellers.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                    <span>Selecionar todos</span>
                  </label>
                </div>

                <div className="sellers-list">
                  {loading ? (
                    <div className="loading-message">Carregando...</div>
                  ) : filteredSellers.length === 0 ? (
                    <div className="empty-message">Nenhum estabelecimento encontrado</div>
                  ) : (
                    filteredSellers.map(seller => (
                      <label key={seller.id} className="seller-item">
                        <input
                          type="checkbox"
                          checked={selectedRecipients.includes(seller.id)}
                          onChange={(e) => handleSelectOne(seller.id, e.target.checked)}
                        />
                        <div className="seller-info">
                          <span className="seller-name">{seller.store.name}</span>
                          <span className="seller-category">{seller.store.category}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="recipient-count">
              <strong>{recipientCount}</strong> estabelecimento(s) receberá(ão) esta notificação
            </div>
          </div>

          <div className="form-section">
            <h2>Mensagem</h2>
            
            <div className="form-group">
              <label htmlFor="title">Título da Notificação</label>
              <input
                id="title"
                type="text"
                placeholder="Ex: Nova promoção disponível!"
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
                maxLength={50}
                className="form-input"
              />
              <span className="char-count">{notificationTitle.length}/50</span>
            </div>

            <div className="form-group">
              <label htmlFor="message">Mensagem</label>
              <textarea
                id="message"
                placeholder="Digite a mensagem que será enviada aos estabelecimentos..."
                value={notificationBody}
                onChange={(e) => setNotificationBody(e.target.value)}
                maxLength={200}
                rows={5}
                className="form-textarea"
              />
              <span className="char-count">{notificationBody.length}/200</span>
            </div>
          </div>

          <div className="form-section preview-section">
            <h2>Preview da Notificação</h2>
            <div className="notification-preview">
              <div className="preview-icon">🔔</div>
              <div className="preview-content">
                <div className="preview-title">
                  {notificationTitle || 'Título da notificação'}
                </div>
                <div className="preview-message">
                  {notificationBody || 'Mensagem da notificação aparecerá aqui...'}
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              className="send-button"
              onClick={handleSendNotification}
              disabled={sending || !notificationTitle.trim() || !notificationBody.trim() || recipientCount === 0}
            >
              {sending ? 'Enviando...' : `Enviar Notificação (${recipientCount})`}
            </button>
          </div>
        </div>

        {/* Histórico de Notificações */}
        <div className="history-section">
          <div className="history-header">
            <h2>📋 Histórico de Notificações Enviadas</h2>
            <button 
              className="refresh-button"
              onClick={loadHistory}
              disabled={loadingHistory}
            >
              {loadingHistory ? '⏳' : '🔄'} Atualizar
            </button>
          </div>

          {loadingHistory ? (
            <div className="loading-message">Carregando histórico...</div>
          ) : history.length === 0 ? (
            <div className="empty-history">
              <p>Nenhuma notificação enviada ainda.</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((notification) => (
                <div key={notification.id} className="history-item">
                  <div className="history-item-header">
                    <div className="history-title">
                      <strong>{notification.title}</strong>
                      <span className="recipient-badge">
                        {notification.recipientCount || 1} destinatário(s)
                      </span>
                    </div>
                    <div className="history-actions">
                      <div className="history-date">
                        {formatDate(notification.sentAt)}
                      </div>
                      <button
                        className="delete-history-button"
                        onClick={() => handleDeleteNotification(notification.id, notification.title)}
                        title="Excluir notificação"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="history-body">
                    {notification.body}
                  </div>
                  <div className="history-footer">
                    <span className={`status-badge ${notification.status || 'sent'}`}>
                      {notification.status === 'sent' ? '✓ Enviada' : notification.status}
                    </span>
                    <span className="delivery-method">
                      Via: {notification.deliveryMethod || 'admin'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunicationCenter;

