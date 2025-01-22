import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './styles.css';
import {
  getStates,
  getCities,
  getDistricts,
  createState,
  createCity,
  createDistrict,
  deleteState,
  deleteCity,
  deleteDistrict,
  toggleCityStatus
} from '../../services/firebaseServices';

interface State {
  id: string;
  name: string;
  abbreviation: string;
  isActive: boolean;
}

interface City {
  id: string;
  stateId: string;
  name: string;
  isActive: boolean;
  state: State;
}

interface District {
  id?: string;
  cityId: string;
  name: string;
  city?: City;
}

const Cities = () => {
  const navigate = useNavigate();
  const [cities, setCities] = useState<City[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isStateModalOpen, setIsStateModalOpen] = useState(false);
  const [isDistrictModalOpen, setIsDistrictModalOpen] = useState(false);
  const [newCity, setNewCity] = useState({
    name: '',
    stateId: ''
  });
  const [newState, setNewState] = useState({
    name: '',
    abbreviation: ''
  });
  const [newDistrict, setNewDistrict] = useState<District>({
    name: '',
    cityId: ''
  });
  const [cityError, setCityError] = useState('');
  const [stateError, setStateError] = useState('');
  const [districtError, setDistrictError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [citiesData, statesData, districtsData] = await Promise.all([
        getCities(),
        getStates(),
        getDistricts()
      ]);

      setCities(citiesData);
      setStates(statesData);
      setDistricts(districtsData);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCity = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setCityError('');
      await createCity({
        name: newCity.name.toLowerCase(),
        stateId: newCity.stateId
      });

      await loadData();
      setIsCityModalOpen(false);
      setNewCity({ name: '', stateId: '' });
    } catch (err: any) {
      setCityError(err.message || 'Erro ao criar cidade');
    }
  };

  const handleCreateState = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setStateError('');
      await createState({
        name: newState.name.toLowerCase(),
        abbreviation: newState.abbreviation.toUpperCase()
      });

      await loadData();
      setIsStateModalOpen(false);
      setNewState({ name: '', abbreviation: '' });
    } catch (err: any) {
      setStateError(err.message || 'Erro ao criar estado');
    }
  };

  const handleDeleteCity = async (cityId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta cidade?')) {
      return;
    }

    try {
      setCityError('');
      await deleteCity(cityId);
      await loadData();
    } catch (err: any) {
      console.error('Erro completo:', err);
      setCityError(err.message || 'Erro ao excluir cidade');
    }
  };

  const handleDeleteState = async (stateId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este estado?')) {
      return;
    }

    try {
      setStateError('');
      await deleteState(stateId);
      await loadData();
    } catch (err: any) {
      console.error('Erro completo:', err);
      setStateError(err.message || 'Erro ao excluir estado');
    }
  };

  const handleToggleStatus = async (cityId: string, currentStatus: boolean) => {
    try {
      await toggleCityStatus(cityId, currentStatus);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar status da cidade');
    }
  };

  const handleCreateDistrict = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setDistrictError('');
      await createDistrict(newDistrict);
      await loadData();
      setIsDistrictModalOpen(false);
      setNewDistrict({
        name: '',
        cityId: ''
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
      await deleteDistrict(districtId);
      await loadData();
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
        <button onClick={loadData} className="retry-button">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="cities-container">
      <header className="page-header">
        <div className="header-content">
          <h1>Gerenciamento de Localidades</h1>
        </div>
      </header>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError('')} className="close-error">
            ×
          </button>
        </div>
      )}
      
      <section className="states-section">
        <header className="section-header">
          <h2>Estados</h2>
          <button 
            className="add-button"
            onClick={() => setIsStateModalOpen(true)}
          >
            Adicionar Estado
          </button>
        </header>

        {stateError && (
          <div className="error-message">
            <p>{stateError}</p>
            <button onClick={() => setStateError('')} className="close-error">
              ×
            </button>
          </div>
        )}

        <div className="table-container">
          <table className="cities-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Sigla</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {states.map((state) => (
                <tr key={state.id}>
                  <td>{state.name}</td>
                  <td>{state.abbreviation}</td>
                  <td>
                    <span className={`status-badge ${state.isActive ? 'active' : 'inactive'}`}>
                      {state.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        onClick={() => handleDeleteState(state.id)}
                        className="action-btn delete"
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
      </section>

      <section className="cities-section">
        <header className="section-header">
          <h2>Cidades</h2>
          <button 
            className="add-button"
            onClick={() => setIsCityModalOpen(true)}
          >
            Adicionar Cidade
          </button>
        </header>

        {cityError && (
          <div className="error-message">
            <p>{cityError}</p>
            <button onClick={() => setCityError('')} className="close-error">
              ×
            </button>
          </div>
        )}

        <div className="table-container">
          <table className="cities-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Estado</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {cities.map((city) => (
                <tr key={city.id}>
                  <td>{city.name}</td>
                  <td>
                    {city.state.name} ({city.state.abbreviation})
                  </td>
                  <td>
                    <span className={`status-badge ${city.isActive ? 'active' : 'inactive'}`}>
                      {city.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        onClick={() => navigate(`/cities/${city.id}/districts`)}
                        className="action-btn view"
                      >
                        Visualizar Bairros
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(city.id, city.isActive)}
                        className={`action-btn ${city.isActive ? 'block' : 'unblock'}`}
                      >
                        {city.isActive ? 'Desativar' : 'Ativar'}
                      </button>
                      <button 
                        onClick={() => handleDeleteCity(city.id)}
                        className="action-btn delete"
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
      </section>

      {isCityModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Adicionar Cidade</h2>
            {cityError && (
              <div className="error-message">
                <p>{cityError}</p>
                <button onClick={() => setCityError('')} className="close-error">
                  ×
                </button>
              </div>
            )}
            <form onSubmit={handleCreateCity}>
              <div className="form-group">
                <label htmlFor="name">Nome da Cidade</label>
                <input
                  type="text"
                  id="name"
                  value={newCity.name}
                  onChange={(e) => setNewCity({ ...newCity, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="state">Estado</label>
                <select
                  id="state"
                  value={newCity.stateId}
                  onChange={(e) => setNewCity({ ...newCity, stateId: e.target.value })}
                  required
                >
                  <option value="">Selecione um estado</option>
                  {states.map((state) => (
                    <option key={state.id} value={state.id}>
                      {state.name} ({state.abbreviation})
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => setIsCityModalOpen(false)}
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

      {isStateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Adicionar Estado</h2>
            {stateError && (
              <div className="error-message">
                <p>{stateError}</p>
                <button onClick={() => setStateError('')} className="close-error">
                  ×
                </button>
              </div>
            )}
            <form onSubmit={handleCreateState}>
              <div className="form-group">
                <label htmlFor="stateName">Nome do Estado</label>
                <input
                  type="text"
                  id="stateName"
                  value={newState.name}
                  onChange={(e) => setNewState({ ...newState, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="abbreviation">Sigla</label>
                <input
                  type="text"
                  id="abbreviation"
                  value={newState.abbreviation}
                  onChange={(e) => setNewState({ ...newState, abbreviation: e.target.value.toUpperCase() })}
                  maxLength={2}
                  required
                />
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => setIsStateModalOpen(false)}
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
                <label htmlFor="districtCity">Cidade:</label>
                <select
                  id="districtCity"
                  value={newDistrict.cityId}
                  onChange={(e) => setNewDistrict({ ...newDistrict, cityId: e.target.value })}
                  required
                >
                  <option value="">Selecione uma cidade</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="districtName">Nome do Bairro:</label>
                <input
                  type="text"
                  id="districtName"
                  value={newDistrict.name}
                  onChange={(e) => setNewDistrict({ ...newDistrict, name: e.target.value })}
                  required
                />
              </div>
              {districtError && <p className="error-message">{districtError}</p>}
              <div className="modal-actions">
                <button type="submit" className="submit-button">
                  Adicionar
                </button>
                <button
                  type="button"
                  onClick={() => setIsDistrictModalOpen(false)}
                  className="cancel-button"
                >
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

export default Cities; 