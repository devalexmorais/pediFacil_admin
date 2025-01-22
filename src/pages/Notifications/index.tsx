import { useState, ChangeEvent, useEffect } from 'react';
import './styles.css';

interface Recipient {
  id: string;
  name: string;
  email: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
  recipientType: string;
  recipient: Recipient;
  order: any;
}

interface ApiResponse {
  notifications: Notification[];
  pagination: {
    total: number;
    pages: number;
    currentPage: number;
    perPage: number;
  };
}

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: string;
  validUntil: string;
  maxUses: number;
  useCount: number;
  minOrderValue: string;
  isActive: boolean;
}

const Notifications = () => {
  const [selectedTab, setSelectedTab] = useState('create');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [formData, setFormData] = useState({
    userType: 'CUSTOMER',
    title: '',
    message: '',
    type: 'PROMOTION',
    couponCode: ''
  });

  const fetchCoupons = async () => {
    try {
      const token = localStorage.getItem('@AdminApp:token');
      console.log('Token para buscar cupons:', token);

      const response = await fetch('http://localhost:8080/api/coupon/all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Cupons recebidos:', data);
        // Filtra apenas cupons ativos
        const activeCoupons = data.filter((coupon: Coupon) => coupon.isActive);
        console.log('Cupons ativos:', activeCoupons);
        setCoupons(activeCoupons);
      } else {
        const errorData = await response.json();
        console.error('Erro ao buscar cupons:', errorData);
        console.error('Status:', response.status);
      }
    } catch (error) {
      console.error('Erro ao buscar cupons:', error);
    }
  };

  useEffect(() => {
    fetchCoupons();
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('@AdminApp:token');
      console.log('Token recuperado:', token);

      const response = await fetch('http://localhost:8080/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data: ApiResponse = await response.json();
        console.log('Dados recebidos da API:', data);
        setNotifications(data.notifications);
      } else {
        const errorData = await response.json();
        console.error('Erro da API:', errorData);
        console.error('Status:', response.status);
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    }
  };

  useEffect(() => {
    if (selectedTab === 'history') {
      fetchNotifications();
    }
  }, [selectedTab]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('@AdminApp:token');
      const response = await fetch('http://localhost:8080/api/notifications/by-type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userType: formData.userType,
          title: formData.title,
          message: formData.message,
          type: formData.type,
          couponCode: formData.couponCode || undefined
        })
      });

      if (response.ok) {
        alert('Notificação enviada com sucesso!');
        setFormData({
          userType: 'CUSTOMER',
          title: '',
          message: '',
          type: 'PROMOTION',
          couponCode: ''
        });
        // Atualiza a lista de notificações se estiver na aba de histórico
        if (selectedTab === 'history') {
          fetchNotifications();
        }
      } else {
        const errorData = await response.json();
        alert(`Erro ao enviar notificação: ${errorData.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao enviar notificação: Erro de conexão');
    }
  };

  return (
    <div className="notifications-container">
      <header className="page-header">
        <div className="header-content">
          <h1>Notificações</h1>
        </div>
        
        <div className="tabs">
          <button 
            className={`tab ${selectedTab === 'create' ? 'active' : ''}`}
            onClick={() => setSelectedTab('create')}
          >
            Nova Notificação
          </button>
          <button 
            className={`tab ${selectedTab === 'history' ? 'active' : ''}`}
            onClick={() => setSelectedTab('history')}
          >
            Histórico
          </button>
        </div>
      </header>

      {selectedTab === 'create' ? (
        <div className="create-notification">
          <div className="form-card">
            <h2>Criar Nova Notificação</h2>
            
            <div className="form-group">
              <label>Título</label>
              <input 
                type="text" 
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Digite o título da notificação"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Mensagem</label>
              <textarea 
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Digite a mensagem da notificação"
                className="form-textarea"
                rows={4}
              />
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label>Tipo de Usuário</label>
                <select 
                  name="userType"
                  value={formData.userType}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="CUSTOMER">Cliente</option>
                  <option value="SELLER">Vendedor</option>
                </select>
              </div>

              <div className="form-group flex-1">
                <label>Tipo de Notificação</label>
                <select 
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="PROMOTION">Promoção</option>
                  <option value="NEWS">Novidades</option>
                  <option value="ALERT">Alerta</option>
                </select>
              </div>
            </div>

            {formData.type === 'PROMOTION' && (
              <div className="form-group">
                <label>Cupom</label>
                <select 
                  name="couponCode"
                  value={formData.couponCode}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="">Selecione um cupom</option>
                  {coupons.map((coupon) => (
                    <option key={coupon.id} value={coupon.code}>
                      {coupon.code} - {coupon.type === 'PERCENTAGE' ? `${coupon.value}%` : `R$ ${coupon.value}`} OFF
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-actions">
              <button 
                className="cancel-button"
                onClick={() => setFormData({
                  userType: 'CUSTOMER',
                  title: '',
                  message: '',
                  type: 'PROMOTION',
                  couponCode: ''
                })}
              >
                Cancelar
              </button>
              <button 
                className="submit-button"
                onClick={handleSubmit}
              >
                Enviar Notificação
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="notification-history">
          {!notifications.length ? (
            <div className="empty-state">
              <p>Nenhuma notificação encontrada</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="notifications-table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Destinatário</th>
                    <th>Tipo</th>
                    <th>Data de Envio</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((notification) => (
                    <tr key={notification.id}>
                      <td>
                        <div className="notification-title">
                          <strong>{notification.title}</strong>
                          <span className="message-preview">
                            {notification.message}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="recipient-info">
                          <strong>{notification.recipient.name}</strong>
                          <span className="email-preview">
                            {notification.recipient.email}
                          </span>
                        </div>
                      </td>
                      <td>
                        {notification.type === 'PROMOTION' ? 'Promoção' : 
                         notification.type === 'NEWS' ? 'Novidades' : 'Alerta'}
                      </td>
                      <td>{new Date(notification.createdAt).toLocaleString('pt-BR')}</td>
                      <td>
                        <span className={`status-badge ${notification.read ? 'read' : 'unread'}`}>
                          {notification.read ? 'Lida' : 'Não lida'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications; 