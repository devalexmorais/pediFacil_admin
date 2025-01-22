import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './styles.css';

interface District {
  id: string;
  cityId: string;
  name: string;
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
  const API_URL = 'http://localhost:8080';

  useEffect(() => {
    loadDistricts();
  }, [cityId]);

  const loadDistricts = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('@AdminApp:token');
      
      if (!token) {
        throw new Error('Token não encontrado');
      }

      const response = await fetch(`${API_URL}/api/location/districts?cityId=${cityId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Erro ao carregar bairros');
      }

      const data = await response.json();
      setDistricts(Array.isArray(data) ? data : []);
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
      const token = localStorage.getItem('@AdminApp:token');
      
      if (!token) {
        throw new Error('Token não encontrado');
      }

      const response = await fetch(`${API_URL}/api/location/districts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newDistrict)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar bairro');
      }

      await loadDistricts();
      setIsDistrictModalOpen(false);
      setNewDistrict({
        name: '',
        cityId: cityId || ''
      });
    } catch (err: any) {
      setDistrictError(err.message || 'Erro ao criar bairro');
    }
  };

  const handleDeleteDistrict = async (districtId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este bairro?')) {
      return;
    }

    try {
      setDistrictError('');
      const token = localStorage.getItem('@AdminApp:token');
      
      if (!token) {
        throw new Error('Token não encontrado');
      }

      const response = await fetch(`${API_URL}/api/location/districts/${districtId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        throw new Error('Erro ao excluir bairro');
      }

      await loadDistricts();
    } catch (err: any) {
      console.error('Erro completo:', err);
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

      <section className="content-section">
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