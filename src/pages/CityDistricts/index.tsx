import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDistrictsByCity, createDistrict, deleteDistrict } from '../../services/firebaseServices';
import './styles.css';

interface District {
  id: string;
  name: string;
  cityId: string;
  isActive: boolean;
}

const CityDistricts = () => {
  const { cityId } = useParams();
  const navigate = useNavigate();
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDistrictModalOpen, setIsDistrictModalOpen] = useState(false);
  const [newDistrict, setNewDistrict] = useState({
    name: '',
    cityId: cityId || ''
  });
  const [districtError, setDistrictError] = useState('');

  useEffect(() => {
    if (cityId) {
      loadDistricts();
    }
  }, [cityId]);

  const loadDistricts = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!cityId) {
        throw new Error('ID da cidade não fornecido');
      }

      console.log('Buscando bairros para a cidade:', cityId);
      const districtsList = await getDistrictsByCity(cityId);
      console.log('Bairros encontrados:', districtsList);
      setDistricts(districtsList);
    } catch (err: any) {
      console.error('Erro ao carregar bairros:', err);
      setError(err.message || 'Erro ao carregar bairros');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDistrict = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setDistrictError('');
      
      if (!cityId) {
        throw new Error('ID da cidade não fornecido');
      }

      const districtId = await createDistrict({
        name: newDistrict.name,
        cityId: cityId
      });

      console.log('Bairro criado com sucesso. ID:', districtId);
      await loadDistricts();
      setIsDistrictModalOpen(false);
      setNewDistrict({
        name: '',
        cityId: cityId
      });
    } catch (err: any) {
      console.error('Erro ao criar bairro:', err);
      setDistrictError(err.message || 'Erro ao criar bairro');
    }
  };

  const handleDeleteDistrict = async (districtId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este bairro?')) {
      return;
    }

    try {
      setDistrictError('');
      await deleteDistrict(districtId);
      console.log('Bairro excluído com sucesso');
      await loadDistricts();
    } catch (err: any) {
      console.error('Erro ao excluir bairro:', err);
      setDistrictError(err.message || 'Erro ao excluir bairro');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={loadDistricts} className="retry-button">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="city-districts-container">
      <header className="page-header">
        <div className="header-content">
          <button onClick={() => navigate('/cities')} className="back-button">
            Voltar
          </button>
          <h1>Gerenciar Bairros</h1>
          <button 
            className="add-button"
            onClick={() => setIsDistrictModalOpen(true)}
          >
            <span>+</span> Adicionar Bairro
          </button>
        </div>
      </header>

      {districtError && (
        <div className="error-message">
          <p>{districtError}</p>
          <button onClick={() => setDistrictError('')} className="close-error">
            ×
          </button>
        </div>
      )}

      <section>
        <header className="section-header">
          <h2>Lista de Bairros</h2>
          <span className="total-count">{districts.length} bairros</span>
        </header>

        <div className="table-container">
          <table className="districts-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th style={{ width: '150px' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {districts.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', padding: '32px' }}>
                    Nenhum bairro cadastrado
                  </td>
                </tr>
              ) : (
                districts.map((district) => (
                  <tr key={district.id}>
                    <td>{district.name}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          onClick={() => handleDeleteDistrict(district.id)}
                          className="action-btn delete"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isDistrictModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Adicionar Bairro</h2>
            {districtError && (
              <div className="error-message">
                <p>{districtError}</p>
                <button onClick={() => setDistrictError('')} className="close-error">
                  ×
                </button>
              </div>
            )}
            <form onSubmit={handleCreateDistrict}>
              <div className="form-group">
                <label htmlFor="districtName">Nome do Bairro:</label>
                <input
                  type="text"
                  id="districtName"
                  value={newDistrict.name}
                  onChange={(e) => setNewDistrict({ ...newDistrict, name: e.target.value })}
                  placeholder="Digite o nome do bairro"
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsDistrictModalOpen(false)}
                  className="cancel-button"
                >
                  Cancelar
                </button>
                <button type="submit" className="submit-button">
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CityDistricts; 