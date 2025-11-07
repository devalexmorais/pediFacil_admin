import { useEffect, useState } from 'react';
import { getPlatformFees, updatePlatformFees } from '../../services/platformFeesService';
import { useAuth } from '../../contexts/AuthContext';
import './styles.css';

const PlatformFees = () => {
  const { user } = useAuth();
  const [standardFee, setStandardFee] = useState<string>('5');
  const [premiumFee, setPremiumFee] = useState<string>('3');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadFees();
  }, []);

  const loadFees = async () => {
    try {
      setLoading(true);
      const fees = await getPlatformFees();
      
      if (fees) {
        setStandardFee(fees.standardFee.toString());
        setPremiumFee(fees.premiumFee.toString());
        
        if (fees.updatedAt) {
          const date = fees.updatedAt.toDate();
          setLastUpdate(date.toLocaleString('pt-BR'));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar taxas:', error);
      showMessage('error', 'Erro ao carregar as taxas da plataforma');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Converte strings para números
    const standardFeeNum = parseFloat(standardFee);
    const premiumFeeNum = parseFloat(premiumFee);

    // Validações
    if (isNaN(standardFeeNum) || standardFeeNum < 0 || standardFeeNum > 100) {
      showMessage('error', 'A taxa padrão deve estar entre 0% e 100%');
      return;
    }

    if (isNaN(premiumFeeNum) || premiumFeeNum < 0 || premiumFeeNum > 100) {
      showMessage('error', 'A taxa premium deve estar entre 0% e 100%');
      return;
    }

    if (premiumFeeNum >= standardFeeNum) {
      showMessage('error', 'A taxa premium deve ser menor que a taxa padrão');
      return;
    }

    try {
      setSaving(true);
      await updatePlatformFees(standardFeeNum, premiumFeeNum, user?.uid);
      showMessage('success', 'Taxas atualizadas com sucesso!');
      
      // Atualiza a data de última modificação
      setLastUpdate(new Date().toLocaleString('pt-BR'));
    } catch (error) {
      console.error('Erro ao salvar taxas:', error);
      showMessage('error', 'Erro ao salvar as taxas. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  if (loading) {
    return (
      <div className="platform-fees-container">
        <div className="loading">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="platform-fees-container">
      <div className="platform-fees-header">
        <h1>Taxas da Plataforma</h1>
        <p className="subtitle">Configure as taxas cobradas pela plataforma</p>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="fees-content">
        <div className="info-card">
          <div className="info-text">
            <strong>Importante:</strong> Essas taxas serão aplicadas em todos os pedidos da plataforma. 
            A taxa premium é aplicada apenas para usuários com assinatura ativa.
          </div>
        </div>

        <div className="fees-grid">
          {/* Taxa Padrão */}
          <div className="fee-card standard">
            <div className="fee-card-header">
              <h2>Taxa Padrão</h2>
            </div>
            <div className="fee-card-body">
              <p className="fee-description">
                Taxa aplicada para usuários sem assinatura premium
              </p>
              <div className="fee-input-group">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={standardFee}
                  onChange={(e) => setStandardFee(e.target.value)}
                  placeholder="Ex: 5"
                  className="fee-input"
                />
                <span className="fee-unit">%</span>
              </div>
              <div className="fee-example">
                Exemplo: Em um pedido de R$ 100,00, a taxa será de R$ {(100 * parseFloat(standardFee || '0') / 100).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Taxa Premium */}
          <div className="fee-card premium">
            <div className="fee-card-header">
              <h2>Taxa Premium</h2>
            </div>
            <div className="fee-card-body">
              <p className="fee-description">
                Taxa aplicada para usuários com assinatura premium ativa
              </p>
              <div className="fee-input-group">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={premiumFee}
                  onChange={(e) => setPremiumFee(e.target.value)}
                  placeholder="Ex: 3"
                  className="fee-input"
                />
                <span className="fee-unit">%</span>
              </div>
              <div className="fee-example">
                Exemplo: Em um pedido de R$ 100,00, a taxa será de R$ {(100 * parseFloat(premiumFee || '0') / 100).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="actions">
          <button 
            onClick={loadFees} 
            className="btn-secondary"
            disabled={saving}
          >
            Recarregar
          </button>
          <button 
            onClick={handleSave} 
            className="btn-primary"
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>

        {lastUpdate && (
          <div className="last-update">
            Última atualização: {lastUpdate}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlatformFees;

