import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './styles.css';
import { db } from '../../config/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  orderBy,
  where,
  Timestamp
} from 'firebase/firestore';

interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  maxDiscount?: number;
  isActive: boolean;
  validForFirstOrder: boolean;
  validUntil: Date | null;
  usedBy: string[];
  createdAt: Date;
}

interface CouponFormData {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  maxDiscount: number;
  validForFirstOrder: boolean;
  validUntil: string;
  maxDiscountDisplay: string;
  valueDisplay: string;
}

const Coupons: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [formData, setFormData] = useState<CouponFormData>({
    code: '',
    type: 'percentage',
    value: 0,
    maxDiscount: 0,
    validForFirstOrder: false,
    validUntil: '',
    maxDiscountDisplay: '',
    valueDisplay: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCoupons = async () => {
    console.log('A. Iniciando busca de cupons');
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('B. Criando query');
      const couponsRef = collection(db, 'coupons');
      const q = query(couponsRef, orderBy('createdAt', 'desc'));
      
      console.log('C. Executando query');
      const querySnapshot = await getDocs(q);
      
      console.log('D. Cupons encontrados:', querySnapshot.size);
      
      const couponsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          code: data.code,
          type: data.type,
          value: data.value,
          maxDiscount: data.maxDiscount,
          isActive: data.isActive,
          validForFirstOrder: data.validForFirstOrder,
          validUntil: data.validUntil?.toDate() || null,
          usedBy: data.usedBy || [],
          createdAt: data.createdAt?.toDate() || new Date()
        } as Coupon;
      });
      
      console.log('E. Cupons processados:', couponsData);
      setCoupons(couponsData);
      
    } catch (error: any) {
      console.error('F. Erro ao buscar cupons:', error);
      console.error('Stack trace:', error.stack);
      setError(error.message);
    } finally {
      console.log('G. Finalizando busca');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('Componente montado, autenticado:', isAuthenticated);
    if (isAuthenticated) {
      fetchCoupons();
    }
  }, [isAuthenticated]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (name === 'maxDiscountDisplay') {
      // Remove tudo exceto números
      const numbers = value.replace(/\D/g, '');
      
      if (numbers === '') {
        setFormData(prev => ({
          ...prev,
          maxDiscountDisplay: '',
          maxDiscount: 0
        }));
      } else {
        // Converte para formato de centavos e depois para decimal
        const valueInCents = parseInt(numbers);
        const formattedValue = (valueInCents / 100).toFixed(2).replace('.', ',');
        
        setFormData(prev => ({
          ...prev,
          maxDiscountDisplay: formattedValue,
          maxDiscount: valueInCents / 100
        }));
      }
    } else if (name === 'valueDisplay' && formData.type === 'fixed') {
      // Remove tudo exceto números
      const numbers = value.replace(/\D/g, '');
      
      if (numbers === '') {
        setFormData(prev => ({
          ...prev,
          valueDisplay: '',
          value: 0
        }));
      } else {
        // Converte para formato de centavos e depois para decimal
        const valueInCents = parseInt(numbers);
        const formattedValue = (valueInCents / 100).toFixed(2).replace('.', ',');
        
        setFormData(prev => ({
          ...prev,
          valueDisplay: formattedValue,
          value: valueInCents / 100
        }));
      }
    } else if (name === 'type') {
      // Quando muda o tipo, limpa o campo de exibição
      setFormData(prev => ({
        ...prev,
        type: value as 'percentage' | 'fixed',
        valueDisplay: '',
        value: 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : (name === 'code' ? value.toUpperCase() : value)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('1. Iniciando submit do formulário');
    console.log('Dados do formulário:', formData);

    if (!isAuthenticated) {
      console.log('Usuário não autenticado');
      alert('Você precisa estar autenticado para criar cupons');
      return;
    }

    setIsLoading(true);

    try {
      console.log('2. Iniciando validações');

      // Validações
      if (!formData.code) {
        console.log('Erro: Código do cupom vazio');
        alert('O código do cupom é obrigatório');
        return;
      }

      if (formData.type === 'percentage' && Number(formData.value) > 100) {
        console.log('Erro: Desconto percentual maior que 100%');
        alert('O desconto percentual não pode ser maior que 100%');
        return;
      }

      console.log('3. Verificando se o cupom já existe');
      const couponsRef = collection(db, 'coupons');
      const codeQuery = query(
        couponsRef, 
        where('code', '==', formData.code.toUpperCase())
      );
      
      const querySnapshot = await getDocs(codeQuery);
      console.log('Resultado da busca por cupons existentes:', querySnapshot.size);

      if (!querySnapshot.empty) {
        console.log('Erro: Cupom já existe');
        alert('Já existe um cupom com este código');
        return;
      }

      console.log('4. Preparando dados do cupom');
      const couponData = {
        code: formData.code.toUpperCase(),
        type: formData.type,
        value: Number(formData.value),
        maxDiscount: Number(formData.maxDiscount),
        validForFirstOrder: formData.validForFirstOrder,
        validUntil: formData.validUntil ? Timestamp.fromDate(new Date(formData.validUntil)) : null,
        usedBy: [],
        isActive: true,
        createdAt: Timestamp.now(),
        createdBy: user?.uid
      };

      console.log('5. Dados do cupom preparados:', couponData);

      console.log('6. Tentando salvar no Firestore');
      try {
        const docRef = await addDoc(couponsRef, couponData);
        console.log('7. Cupom criado com sucesso! ID:', docRef.id);

        // Criar notificação para todos os usuários
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);

        const notificationPromises = usersSnapshot.docs.map(async (userDoc) => {
          const userNotificationsRef = collection(doc(db, 'users', userDoc.id), 'notifications');
          
          const notificationData = {
            title: `Novo cupom: ${couponData.code}`,
            body: `Use ${couponData.code} até ${
              couponData.validUntil ? 
              couponData.validUntil.toDate().toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              }) : 
              'tempo indeterminado'
            } e ganhe ${
              couponData.type === 'percentage' ? 
              `${couponData.value}% OFF` : 
              `R$ ${couponData.value.toFixed(2)} OFF`
            }${
              couponData.maxDiscount > 0 ? 
              ` (máx: R$ ${couponData.maxDiscount.toFixed(2)})` : 
              ''
            }`,
            createdAt: Timestamp.now(),
            data: {
              couponId: docRef.id,
              couponCode: couponData.code,
              type: couponData.type,
              value: couponData.value,
              maxDiscount: couponData.maxDiscount,
              validUntil: couponData.validUntil,
              validForFirstOrder: couponData.validForFirstOrder
            },
            type: "coupon_created",
            read: false
          };

          return addDoc(userNotificationsRef, notificationData);
        });

        await Promise.all(notificationPromises);
        console.log('8. Notificações criadas com sucesso!');
        
        alert('Cupom criado com sucesso!');
        
        console.log('9. Limpando formulário');
        setFormData({
          code: '',
          type: 'percentage',
          value: 0,
          maxDiscount: 0,
          validForFirstOrder: false,
          validUntil: '',
          maxDiscountDisplay: '',
          valueDisplay: ''
        });
        
        setIsModalOpen(false);
        console.log('10. Atualizando lista de cupons');
        await fetchCoupons();

      } catch (firestoreError: any) {
        console.error('Erro específico do Firestore:', firestoreError);
        console.error('Código do erro:', firestoreError.code);
        console.error('Mensagem do erro:', firestoreError.message);
        alert(`Erro ao salvar no Firestore: ${firestoreError.message}`);
      }

    } catch (error: any) {
      console.error('Erro geral:', error);
      console.error('Stack trace:', error.stack);
      alert(`Erro ao criar cupom: ${error.message}`);
    } finally {
      console.log('11. Finalizando processo');
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (couponId: string) => {
    try {
      const couponRef = doc(db, 'coupons', couponId);
      const coupon = coupons.find(c => c.id === couponId);
      
      if (coupon) {
        await updateDoc(couponRef, {
          isActive: !coupon.isActive
        });
        await fetchCoupons();
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status do cupom');
    }
  };

  const handleDelete = async (couponId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cupom?')) {
      try {
        await deleteDoc(doc(db, 'coupons', couponId));
        await fetchCoupons();
        alert('Cupom excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir cupom:', error);
        alert('Erro ao excluir cupom');
      }
    }
  };

  const filteredCoupons = coupons.filter(coupon => 
    coupon.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (error) {
    return <div className="error-message">Erro: {error}</div>;
  }

  if (isLoading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div className="coupons-container">
      <div className="coupons-header">
        <h1>Gerenciar Cupons</h1>
        <button onClick={() => setIsModalOpen(true)} className="add-button">
          <i className="fas fa-plus"></i> Novo Cupom
        </button>
      </div>

      <div className="search-bar">
        <div className="search-input-wrapper">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            placeholder="Buscar cupons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="coupons-grid">
        {filteredCoupons.map(coupon => (
          <div key={coupon.id} className={`coupon-card ${!coupon.isActive ? 'inactive' : ''}`}>
            <div className="coupon-header">
              <div className="coupon-code">
                <h3>{coupon.code}</h3>
                <span className={`status-badge ${coupon.isActive ? 'active' : 'inactive'}`}>
                  {coupon.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="coupon-actions">
                <button
                  onClick={() => handleToggleStatus(coupon.id)}
                  className="action-button toggle"
                  title={coupon.isActive ? 'Desativar' : 'Ativar'}
                >
                  <i className={`fas fa-${coupon.isActive ? 'toggle-on' : 'toggle-off'}`}></i>
                </button>
                <button 
                  onClick={() => handleDelete(coupon.id)} 
                  className="action-button delete"
                  title="Excluir"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
            
            <div className="coupon-details">
              <div className="detail-row">
                <div className="detail-item">
                  <i className="fas fa-tag"></i>
                  <span>
                    {coupon.type === 'percentage'
                      ? `${coupon.value}% OFF`
                      : `R$ ${coupon.value.toFixed(2)} OFF`}
                  </span>
                </div>
                <div className="detail-item">
                  <i className="fas fa-dollar-sign"></i>
                  <span>Máx: R$ {coupon.maxDiscount?.toFixed(2)}</span>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-item">
                  <i className="fas fa-user-clock"></i>
                  <span>{coupon.validForFirstOrder ? 'Primeiro Pedido' : 'Todos os Pedidos'}</span>
                </div>
                <div className="detail-item">
                  <i className="fas fa-users"></i>
                  <span>Usos: {coupon.usedBy?.length || 0}</span>
                </div>
              </div>

              {coupon.validUntil && (
                <div className="detail-row">
                  <div className="detail-item full-width">
                    <i className="fas fa-calendar-alt"></i>
                    <span>Válido até: {coupon.validUntil.toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Adicionar Novo Cupom</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="code">Código do Cupom</label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="Ex: CUPOM10"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="type">Tipo de Desconto</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="percentage">Porcentagem (%)</option>
                  <option value="fixed">Valor Fixo (R$)</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor={formData.type === 'percentage' ? 'valuePercentage' : 'valueDisplay'}>
                  {formData.type === 'percentage' ? 'Valor do Desconto (%)' : 'Valor do Desconto (R$)'}
                </label>
                {formData.type === 'percentage' ? (
                  <input
                    type="text"
                    id="valuePercentage"
                    name="valuePercentage"
                    value={formData.valueDisplay}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setFormData(prev => ({
                        ...prev,
                        valueDisplay: val,
                        value: val ? parseFloat(val) : 0
                      }));
                    }}
                    placeholder="Ex: 10"
                    required
                  />
                ) : (
                  <input
                    type="text"
                    id="valueDisplay"
                    name="valueDisplay"
                    value={formData.valueDisplay}
                    onChange={handleInputChange}
                    placeholder="0,00"
                    required
                  />
                )}
              </div>

                              <div className="form-group">
                <label htmlFor="maxDiscountDisplay">Desconto Máximo (R$)</label>
                <input
                  type="text"
                  id="maxDiscountDisplay"
                  name="maxDiscountDisplay"
                  value={formData.maxDiscountDisplay}
                  onChange={handleInputChange}
                  placeholder="0,00"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="validForFirstOrder" className="checkbox-label">
                  <input
                    type="checkbox"
                    id="validForFirstOrder"
                    name="validForFirstOrder"
                    checked={formData.validForFirstOrder}
                    onChange={handleInputChange}
                  />
                  Válido apenas para primeiro pedido
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="validUntil">Data de Validade (opcional)</label>
                <input
                  type="datetime-local"
                  id="validUntil"
                  name="validUntil"
                  value={formData.validUntil}
                  onChange={handleInputChange}
                />
              </div>

              <div className="modal-buttons">
                <button type="submit" disabled={isLoading}>
                  {isLoading ? 'Criando...' : 'Criar Cupom'}
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons;
