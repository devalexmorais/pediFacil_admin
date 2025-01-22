import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './styles.css';

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
  createdAt: string;
  updatedAt: string;
}

interface CouponFormData {
  code: string;
  type: string;
  value: number;
  validUntil: string;
  maxUses: number;
  minOrderValue: number;
}

const Coupons: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [formData, setFormData] = useState<CouponFormData>({
    code: '',
    type: 'PERCENTAGE',
    value: 0,
    validUntil: '',
    maxUses: 100,
    minOrderValue: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  const getToken = () => localStorage.getItem('@AdminApp:token');

  const fetchCoupons = async () => {
    try {
      const token = getToken();
      const response = await fetch('http://localhost:8080/api/coupon/all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (!response.ok) {
        console.log('Erro completo:', data);
        alert(data.error || 'Erro ao carregar cupons');
        return;
      }
      
      setCoupons(data);
    } catch (error) {
      console.error('Erro ao carregar cupons:', error);
      alert('Erro ao carregar cupons');
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
      const token = getToken();
      const response = await fetch('http://localhost:8080/api/coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code: formData.code,
          type: formData.type,
          value: Number(formData.value),
          validUntil: formData.validUntil,
          maxUses: Number(formData.maxUses),
          minOrderValue: Number(formData.minOrderValue)
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.log('Erro completo:', data);
        alert(data.error || 'Erro ao criar cupom');
        return;
      }

      await fetchCoupons();
      setIsModalOpen(false);
      setFormData({
        code: '',
        type: 'PERCENTAGE',
        value: 0,
        validUntil: '',
        maxUses: 100,
        minOrderValue: 0
      });
      alert('Cupom criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar cupom:', error);
      alert('Erro ao criar cupom');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (couponId: string) => {
    try {
      const token = getToken();
      const response = await fetch(`http://localhost:8080/api/coupon/${couponId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.log('Erro completo:', data);
        alert(data.error || 'Erro ao atualizar status');
        return;
      }

      await fetchCoupons();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status do cupom');
    }
  };

  const handleDelete = async (couponId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cupom?')) {
      try {
        const token = getToken();
        const response = await fetch(`http://localhost:8080/api/coupon/${couponId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();
        
        if (!response.ok) {
          console.log('Erro completo:', data);
          alert(data.error || 'Erro ao excluir cupom');
          return;
        }

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

  return (
    <div className="coupons-container">
      <div className="coupons-header">
        <h1>Cupons</h1>
        <div className="coupons-actions">
          <input
            type="text"
            placeholder="Buscar cupom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button 
            className="new-coupon-button"
            onClick={() => setIsModalOpen(true)}
          >
            Novo Cupom
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="coupons-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th>Validade</th>
              <th>Usos</th>
              <th>Valor Mínimo</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredCoupons.map((coupon) => (
              <tr key={coupon.id}>
                <td>{coupon.code}</td>
                <td>{coupon.type === 'PERCENTAGE' ? 'Percentual' : 'Valor Fixo'}</td>
                <td>{coupon.type === 'PERCENTAGE' ? `${coupon.value}%` : `R$ ${coupon.value}`}</td>
                <td>{new Date(coupon.validUntil).toLocaleDateString()}</td>
                <td>{coupon.useCount} / {coupon.maxUses}</td>
                <td>R$ {coupon.minOrderValue}</td>
                <td>
                  <span className={`status-tag ${coupon.isActive ? 'ativo' : 'inativo'}`}>
                    {coupon.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className={coupon.isActive ? 'delete-button' : 'edit-button'}
                      onClick={() => handleToggleStatus(coupon.id)}
                    >
                      {coupon.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                    <button 
                      className="delete-button"
                      onClick={() => handleDelete(coupon.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Novo Cupom</h2>
              <button 
                className="close-button"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>
            <form className="coupon-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="code">Código do Cupom</label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  placeholder="Ex: WELCOME10"
                  value={formData.code}
                  onChange={handleInputChange}
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
                  <option value="PERCENTAGE">Percentual (%)</option>
                  <option value="FIXED">Valor Fixo (R$)</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="value">Valor do Desconto</label>
                <input
                  type="number"
                  id="value"
                  name="value"
                  placeholder={formData.type === 'PERCENTAGE' ? "Ex: 10" : "Ex: 50.00"}
                  value={formData.value}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="validUntil">Validade</label>
                <input
                  type="date"
                  id="validUntil"
                  name="validUntil"
                  value={formData.validUntil}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="maxUses">Número Máximo de Usos</label>
                <input
                  type="number"
                  id="maxUses"
                  name="maxUses"
                  value={formData.maxUses}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="minOrderValue">Valor Mínimo do Pedido</label>
                <input
                  type="number"
                  id="minOrderValue"
                  name="minOrderValue"
                  placeholder="Ex: 50"
                  value={formData.minOrderValue}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="submit-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Salvando...' : 'Salvar'}
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