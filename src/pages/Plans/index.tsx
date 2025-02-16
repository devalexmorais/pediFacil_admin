import React, { useState, useEffect } from 'react';
import './styles.css';
import { db } from '../../config/firebase';
import { collection, getDocs, addDoc, Timestamp, query, orderBy, doc, updateDoc } from 'firebase/firestore';

interface PlanFeatures {
  support: string;
  analytics: string;
  advantages: string[];
  maxProducts: number;
  showInPremiumSection: boolean;
  showPromotionsInHome: boolean;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: string;
  platformFeeRate: string;
  features: PlanFeatures;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PlanFormData {
  name: string;
  description: string;
  price: number;
  platformFeeRate: number;
  features: {
    maxProducts: number;
    support: 'email' | 'priority';
    analytics: 'basic' | 'advanced';
    showInPremiumSection: boolean;
    advantages: string[];
  };
}

const Plans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>({
    name: '',
    description: '',
    price: 0,
    platformFeeRate: 0,
    features: {
      maxProducts: 0,
      support: 'email',
      analytics: 'basic',
      showInPremiumSection: false,
      advantages: ['']
    }
  });

  const fetchPlans = async () => {
    try {
      const plansRef = collection(db, 'plans');
      const q = query(plansRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const plansData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate().toISOString() || new Date().toISOString()
      })) as Plan[];
      
      setPlans(plansData);
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
      alert('Erro ao carregar planos disponíveis');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    try {
      const plansRef = collection(db, 'plans');
      const now = Timestamp.now();
      
      const planData = {
        ...formData,
        isActive: true,
        createdAt: now,
        updatedAt: now
      };

      await addDoc(plansRef, planData);
      await fetchPlans();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao criar plano:', error);
      alert('Erro ao criar plano');
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;

    try {
      const planRef = doc(db, 'plans', editingPlan.id);
      const now = Timestamp.now();
      
      const planData = {
        ...formData,
        updatedAt: now
      };

      await updateDoc(planRef, planData);
      await fetchPlans();
      setShowModal(false);
      setEditingPlan(null);
      resetForm();
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      alert('Erro ao atualizar plano');
    }
  };

  const handleTogglePlanStatus = async (planId: string) => {
    try {
      const planRef = doc(db, 'plans', planId);
      
      await updateDoc(planRef, {
        isActive: !plans.find(plan => plan.id === planId)?.isActive
      });
      await fetchPlans();
    } catch (error) {
      console.error('Erro ao alterar status do plano:', error);
      alert('Erro ao alterar status do plano');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      platformFeeRate: 0,
      features: {
        maxProducts: 0,
        support: 'email',
        analytics: 'basic',
        showInPremiumSection: false,
        advantages: ['']
      }
    });
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      price: Number(plan.price),
      platformFeeRate: Number(plan.platformFeeRate),
      features: {
        maxProducts: plan.features.maxProducts,
        support: plan.features.support as 'email' | 'priority',
        analytics: plan.features.analytics as 'basic' | 'advanced',
        showInPremiumSection: plan.features.showInPremiumSection,
        advantages: [...plan.features.advantages]
      }
    });
    setShowModal(true);
  };

  const handleAddAdvantage = () => {
    setFormData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        advantages: [...prev.features.advantages, '']
      }
    }));
  };

  const handleRemoveAdvantage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        advantages: prev.features.advantages.filter((_, i) => i !== index)
      }
    }));
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value));
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  if (isLoading) {
    return (
      <div className="plans-container">
        <div className="loading">Carregando planos...</div>
      </div>
    );
  }

  return (
    <div className="plans-container">
      <header className="page-header">
        <div className="header-content">
          <h1>Gerenciamento de Planos</h1>
          <div className="header-actions">
            <button className="action-button" onClick={() => setShowModal(true)}>
              Criar Novo Plano
            </button>
          </div>
        </div>
      </header>

      <div className="plans-grid">
        {plans.map((plan) => (
          <div 
            key={plan.id} 
            className={`plan-card ${plan.name === 'Plano Premium' ? 'premium' : ''} ${!plan.isActive ? 'inactive' : ''}`}
          >
            {plan.name === 'Plano Premium' && (
              <div className="premium-badge">Premium</div>
            )}
            
            <div className="plan-header">
              <h2>{plan.name}</h2>
              <p className="plan-description">{plan.description}</p>
            </div>

            <div className="plan-price">
              <span className="currency">R$</span>
              <span className="amount">{Number(plan.price).toFixed(2)}</span>
              <span className="period">/mês</span>
            </div>

            <div className="plan-fee">
              Taxa por venda: {plan.platformFeeRate}%
            </div>

            <div className="plan-features">
              <h3>Vantagens do Plano</h3>
              <ul>
                {plan.features.advantages.map((advantage, index) => (
                  <li key={index}>
                    <span className="check-icon">✓</span>
                    {advantage}
                  </li>
                ))}
              </ul>
            </div>

            <div className="plan-support">
              <h4>Suporte</h4>
              <p>{plan.features.support === 'priority' ? 'Prioritário' : 'Email'}</p>
            </div>

            <div className="plan-analytics">
              <h4>Análises</h4>
              <p>{plan.features.analytics === 'advanced' ? 'Avançadas' : 'Básicas'}</p>
            </div>

            <div className="plan-products">
              <h4>Produtos</h4>
              <p>
                {plan.features.maxProducts === -1 
                  ? 'Ilimitados' 
                  : `Até ${plan.features.maxProducts} produtos`
                }
              </p>
            </div>

            <div className="plan-actions">
              <button 
                className="edit-button"
                onClick={() => handleEditPlan(plan)}
              >
                Editar
              </button>
              <button 
                className={`toggle-button ${plan.isActive ? 'active' : 'inactive'}`}
                onClick={() => handleTogglePlanStatus(plan.id)}
              >
                {plan.isActive ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingPlan ? 'Editar Plano' : 'Criar Novo Plano'}</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              editingPlan ? handleUpdatePlan() : handleCreatePlan();
            }}>
              <div className="form-group">
                <label>Nome do Plano</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Taxa da Plataforma (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.platformFeeRate}
                    onChange={(e) => setFormData({...formData, platformFeeRate: Number(e.target.value)})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Limite de Produtos</label>
                  <input
                    type="number"
                    value={formData.features.maxProducts}
                    onChange={(e) => setFormData({
                      ...formData,
                      features: {
                        ...formData.features,
                        maxProducts: Number(e.target.value)
                      }
                    })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Suporte</label>
                  <select
                    value={formData.features.support}
                    onChange={(e) => setFormData({
                      ...formData,
                      features: {
                        ...formData.features,
                        support: e.target.value as 'email' | 'priority'
                      }
                    })}
                  >
                    <option value="email">Email</option>
                    <option value="priority">Prioritário</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Análises</label>
                  <select
                    value={formData.features.analytics}
                    onChange={(e) => setFormData({
                      ...formData,
                      features: {
                        ...formData.features,
                        analytics: e.target.value as 'basic' | 'advanced'
                      }
                    })}
                  >
                    <option value="basic">Básicas</option>
                    <option value="advanced">Avançadas</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.features.showInPremiumSection}
                    onChange={(e) => setFormData({
                      ...formData,
                      features: {
                        ...formData.features,
                        showInPremiumSection: e.target.checked
                      }
                    })}
                  />
                  Mostrar na Seção Premium
                </label>
              </div>

              <div className="form-group">
                <label>Vantagens</label>
                {formData.features.advantages.map((advantage, index) => (
                  <div key={index} className="advantage-input">
                    <input
                      type="text"
                      value={advantage}
                      onChange={(e) => {
                        const newAdvantages = [...formData.features.advantages];
                        newAdvantages[index] = e.target.value;
                        setFormData({
                          ...formData,
                          features: {
                            ...formData.features,
                            advantages: newAdvantages
                          }
                        });
                      }}
                      required
                    />
                    <button
                      type="button"
                      className="remove-advantage"
                      onClick={() => handleRemoveAdvantage(index)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="add-advantage"
                  onClick={handleAddAdvantage}
                >
                  + Adicionar Vantagem
                </button>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPlan(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="save-button">
                  {editingPlan ? 'Salvar Alterações' : 'Criar Plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Plans;