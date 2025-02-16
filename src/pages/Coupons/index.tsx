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
  where
} from 'firebase/firestore';

interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  maxUses: number;
  uses: number;
  expiryDate: Date;
  minOrderValue: number;
  isActive: boolean;
  createdAt: Date;
  applicableCategories: string[];
  applicableProducts: string[];
}

interface CouponFormData {
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  maxUses: number;
  expiryDate: string;
  minOrderValue: number;
  applicableCategories: string;
  applicableProducts: string;
}

const Coupons: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [formData, setFormData] = useState<CouponFormData>({
    code: '',
    discountType: 'percentage',
    value: 0,
    maxUses: 100,
    expiryDate: '',
    minOrderValue: 0,
    applicableCategories: '',
    applicableProducts: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCoupons = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'coupons'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const couponsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        expiryDate: doc.data().expiryDate?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Coupon[];
      
      setCoupons(couponsData);
    } catch (error: any) {
      setError(error.message);
      console.error('Erro ao carregar cupons:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchCoupons();
    }
  }, [isAuthenticated]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const couponData = {
        code: formData.code,
        discountType: formData.discountType,
        value: Number(formData.value),
        maxUses: Number(formData.maxUses),
        expiryDate: new Date(formData.expiryDate),
        minOrderValue: Number(formData.minOrderValue),
        applicableCategories: formData.applicableCategories 
          ? formData.applicableCategories.split(',').filter(Boolean)
          : [],
        applicableProducts: formData.applicableProducts
          ? formData.applicableProducts.split(',').filter(Boolean)
          : [],
        isActive: true,
        uses: 0,
        createdAt: new Date()
      };

      console.log('Dados do cupom sendo enviados:', couponData);
      
      const expiryDate = new Date(formData.expiryDate);
      if (isNaN(expiryDate.getTime())) {
        alert('Data de validade inválida');
        return;
      }
      
      const value = Number(formData.value);
      if (value <= 0) {
        alert('O valor do desconto deve ser maior que zero');
        return;
      }
      
      if (formData.discountType === 'percentage' && value > 100) {
        alert('O desconto percentual não pode ser maior que 100%');
        return;
      }
      
      const codeQuery = query(
        collection(db, 'coupons'), 
        where('code', '==', formData.code)
      );
      const querySnapshot = await getDocs(codeQuery);

      if (!querySnapshot.empty) {
        alert('Já existe um cupom com este código');
        return;
      }
      
      await addDoc(collection(db, 'coupons'), couponData);
      
      alert('Cupom criado com sucesso!');
      setFormData({
        code: '',
        discountType: 'percentage',
        value: 0,
        maxUses: 100,
        expiryDate: '',
        minOrderValue: 0,
        applicableCategories: '',
        applicableProducts: ''
      });
      fetchCoupons();
    } catch (error) {
      console.error('Erro ao criar cupom:', error);
      alert('Erro ao criar cupom. Verifique o console para mais detalhes.');
    } finally {
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
          Adicionar Cupom
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Pesquisar cupons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Adicionar Novo Cupom</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Código do Cupom:</label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Tipo de Desconto:</label>
                <select
                  name="discountType"
                  value={formData.discountType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="percentage">Porcentagem</option>
                  <option value="fixed">Valor Fixo</option>
                </select>
              </div>

              <div className="form-group">
                <label>Valor do Desconto:</label>
                <input
                  type="number"
                  name="value"
                  value={formData.value}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Número Máximo de Usos:</label>
                <input
                  type="number"
                  name="maxUses"
                  value={formData.maxUses}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Data de Validade:</label>
                <input
                  type="datetime-local"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Valor Mínimo do Pedido:</label>
                <input
                  type="number"
                  name="minOrderValue"
                  value={formData.minOrderValue}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Categorias Aplicáveis (separadas por vírgula):</label>
                <input
                  type="text"
                  name="applicableCategories"
                  value={formData.applicableCategories}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Produtos Aplicáveis (separados por vírgula):</label>
                <input
                  type="text"
                  name="applicableProducts"
                  value={formData.applicableProducts}
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

      <div className="coupons-list">
        {filteredCoupons.map(coupon => (
          <div key={coupon.id} className={`coupon-card ${!coupon.isActive ? 'inactive' : ''}`}>
            <div className="coupon-header">
              <h3>{coupon.code}</h3>
              <div className="coupon-actions">
                <button
                  onClick={() => handleToggleStatus(coupon.id)}
                  className={`status-button ${coupon.isActive ? 'active' : 'inactive'}`}
                >
                  {coupon.isActive ? 'Ativo' : 'Inativo'}
                </button>
                <button onClick={() => handleDelete(coupon.id)} className="delete-button">
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
            
            <div className="coupon-details">
              <p>
                <strong>Desconto:</strong>{' '}
                {coupon.discountType === 'percentage'
                  ? `${coupon.value}%`
                  : `R$ ${coupon.value.toFixed(2)}`}
              </p>
              <p>
                <strong>Usos:</strong> {coupon.uses}/{coupon.maxUses}
              </p>
              <p>
                <strong>Validade:</strong>{' '}
                {coupon.expiryDate.toLocaleDateString('pt-BR')}
              </p>
              <p>
                <strong>Valor Mínimo:</strong> R$ {coupon.minOrderValue.toFixed(2)}
              </p>
              {coupon.applicableCategories.length > 0 && (
                <p>
                  <strong>Categorias:</strong>{' '}
                  {coupon.applicableCategories.join(', ')}
                </p>
              )}
              {coupon.applicableProducts.length > 0 && (
                <p>
                  <strong>Produtos:</strong>{' '}
                  {coupon.applicableProducts.join(', ')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Coupons;
