import { useState, useEffect } from 'react';
import ErrorNotification from '../../components/ErrorNotification';
import './styles.css';
import {
  getAllStates,
  getCitiesByState,
  getNeighborhoodsByCity,
  createState,
  createCity,
  createNeighborhood,
  deleteState,
  deleteCity,
  deleteNeighborhood,
  State,
  City,
  Neighborhood
} from '../../services/locationServices';
import LocationModal from '../../components/LocationModal';

const Cities = () => {
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [states, setStates] = useState<State[]>([]);
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  // Estados do modal
  const [isStateModalOpen, setIsStateModalOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isNeighborhoodModalOpen, setIsNeighborhoodModalOpen] = useState(false);

  // Estados dos formulários
  const [newState, setNewState] = useState({ name: '', uf: '' });
  const [newCity, setNewCity] = useState({ name: '' });
  const [newNeighborhood, setNewNeighborhood] = useState({ name: '' });

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const [citiesCount, setCitiesCount] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadStates();
  }, []);

  useEffect(() => {
    if (selectedState) {
      loadCities(selectedState.id);
    }
  }, [selectedState]);

  useEffect(() => {
    if (selectedState && selectedCity) {
      loadNeighborhoods(selectedState.id, selectedCity.id);
    }
  }, [selectedCity]);

  // Efeito para carregar cidades quando o estado é selecionado
  useEffect(() => {
    const loadInitialCities = async () => {
      if (states.length > 0) {
        for (const state of states) {
          try {
            const citiesData = await getCitiesByState(state.id);
            setCities(prev => [...prev, ...citiesData]);
          } catch (err) {
            console.error(`Erro ao carregar cidades do estado ${state.name}:`, err);
          }
        }
      }
    };

    loadInitialCities();
  }, [states]);

  // Efeito para carregar contagem de cidades
  useEffect(() => {
    const loadCitiesCounts = async () => {
      const counts: { [key: string]: number } = {};
      
      for (const state of states) {
        try {
          const citiesData = await getCitiesByState(state.id);
          counts[state.id] = citiesData.length;
        } catch (err) {
          console.error(`Erro ao carregar cidades do estado ${state.name}:`, err);
          counts[state.id] = 0;
        }
      }
      
      setCitiesCount(counts);
    };

    if (states.length > 0) {
      loadCitiesCounts();
    }
  }, [states]);

  // Atualizar a contagem quando adicionar/remover cidade
  const updateCityCount = async (stateId: string) => {
    try {
      const citiesData = await getCitiesByState(stateId);
      setCitiesCount(prev => ({
        ...prev,
        [stateId]: citiesData.length
      }));
    } catch (err) {
      console.error('Erro ao atualizar contagem de cidades:', err);
    }
  };

  const loadStates = async () => {
    try {
      setIsLoading(true);
      const data = await getAllStates();
      setStates(data);
      setError(null);
    } catch (err: any) {
      setError({
        title: 'Erro ao carregar estados',
        message: err.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCities = async (stateId: string) => {
    try {
      const data = await getCitiesByState(stateId);
      setCities(data);
    } catch (err: any) {
      setError({
        title: 'Erro ao carregar cidades',
        message: err.message
      });
    }
  };

  const loadNeighborhoods = async (stateId: string, cityId: string) => {
    try {
      const data = await getNeighborhoodsByCity(stateId, cityId);
      setNeighborhoods(data);
    } catch (err: any) {
      setError({
        title: 'Erro ao carregar bairros',
        message: err.message
      });
    }
  };

  const handleCreateState = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createState({
        name: newState.name,
        uf: newState.uf
      });
      await loadStates();
      setIsStateModalOpen(false);
      setNewState({ name: '', uf: '' });
    } catch (err: any) {
      setError({
        title: 'Erro ao criar estado',
        message: err.message
      });
    }
  };

  const handleCreateCity = async (cityData: { name: string }) => {
    if (!selectedState) return;
    
    try {
      await createCity(selectedState.id, {
        name: cityData.name.toLowerCase()
      });
      await loadCities(selectedState.id);
      await updateCityCount(selectedState.id);
    } catch (err: any) {
      setError({
        title: 'Erro ao criar cidade',
        message: err.message
      });
    }
  };

  const handleCreateNeighborhood = async (neighborhoodData: { name: string }) => {
    if (!selectedState || !selectedCity) return;
    
    try {
      await createNeighborhood(
        selectedState.id,
        selectedCity.id,
        { name: neighborhoodData.name.toLowerCase() }
      );
      await loadNeighborhoods(selectedState.id, selectedCity.id);
    } catch (err: any) {
      setError({
        title: 'Erro ao criar bairro',
        message: err.message
      });
    }
  };

  const handleDeleteState = async (stateId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este estado?')) return;
    
    try {
      await deleteState(stateId);
      await loadStates();
      setSelectedState(null);
      setCities([]);
      setNeighborhoods([]);
    } catch (err: any) {
      setError({
        title: 'Erro ao excluir estado',
        message: err.message
      });
    }
  };

  const handleDeleteCity = async (cityId: string) => {
    if (!selectedState || !window.confirm('Tem certeza que deseja excluir esta cidade?')) return;
    
    try {
      await deleteCity(selectedState.id, cityId);
      await loadCities(selectedState.id);
      setSelectedCity(null);
      setNeighborhoods([]);
    } catch (err: any) {
      setError({
        title: 'Erro ao excluir cidade',
        message: err.message
      });
    }
  };

  const handleDeleteNeighborhood = async (neighborhoodId: string) => {
    if (!selectedState || !selectedCity || !window.confirm('Tem certeza que deseja excluir este bairro?')) return;
    
    try {
      await deleteNeighborhood(selectedState.id, selectedCity.id, neighborhoodId);
      await loadNeighborhoods(selectedState.id, selectedCity.id);
    } catch (err: any) {
      setError({
        title: 'Erro ao excluir bairro',
        message: err.message
      });
    }
  };

  if (isLoading) {
    return (
      <div className="cities-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Carregando localidades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cities-container">
      {error && (
        <ErrorNotification
          title={error.title}
          message={error.message}
          onClose={() => setError(null)}
        />
      )}
      
      <header className="page-header">
        <div className="header-content">
          <h1>🏙️ Gerenciamento de Localidades</h1>
          <button 
            className="add-button" 
            onClick={() => setIsStateModalOpen(true)}
            aria-label="Adicionar novo estado"
          >
            ✨ Novo Estado
          </button>
        </div>
        
        <div className="search-filters">
          <input 
            type="text" 
            placeholder="🔍 Buscar localidade..." 
            className="search-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            aria-label="Campo de busca"
          />
          <select 
            className="filter-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filtrar por status"
          >
            <option value="">Todos os status</option>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>
        </div>
      </header>

      {states.length === 0 ? (
        <div className="error-container">
          <h3>🏙️ Nenhum estado encontrado</h3>
          <p>Comece adicionando um novo estado para gerenciar suas localidades.</p>
          <button 
            className="add-button" 
            onClick={() => setIsStateModalOpen(true)}
          >
            ✨ Adicionar Primeiro Estado
          </button>
        </div>
      ) : (
        <div className="categories-grid">
          {states.map((state) => (
            <div key={state.id} className="category-card">
              <div className="category-content">
                <div className="category-header">
                  <h3>🏛️ {state.name}</h3>
                  <span className="state-uf">{state.uf}</span>
                </div>
                <div className="category-info">
                  <div className="subcategories-count">
                    🏘️ {citiesCount[state.id] || 0} cidades
                  </div>
                  <div className="state-status">
                    ✅ Ativo
                  </div>
                </div>
                <div className="action-row">
                  <button 
                    className="action-btn edit"
                    onClick={() => {
                      setSelectedState(state);
                      setIsLocationModalOpen(true);
                    }}
                    aria-label={`Ver cidades de ${state.name}`}
                  >
                    <span className="icon">🗺️</span>
                    Ver Cidades
                  </button>
                  <button 
                    className="action-btn delete"
                    onClick={() => handleDeleteState(state.id)}
                    aria-label={`Excluir estado ${state.name}`}
                  >
                    <span className="icon">🗑️</span>
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modais */}
      {isStateModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>🏛️ Novo Estado</h2>
            <form onSubmit={handleCreateState}>
              <div className="form-group">
                <label htmlFor="stateName">Nome do Estado</label>
                <input
                  id="stateName"
                  type="text"
                  placeholder="Ex: São Paulo"
                  value={newState.name}
                  onChange={e => setNewState({ ...newState, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="stateUf">UF (Sigla)</label>
                <input
                  id="stateUf"
                  type="text"
                  placeholder="Ex: SP"
                  maxLength={2}
                  value={newState.uf}
                  onChange={e => setNewState({ ...newState, uf: e.target.value.toUpperCase() })}
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
                <button 
                  type="submit"
                  className="submit-button"
                >
                  ✨ Salvar Estado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cidade */}
      {isCityModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>🏘️ Nova Cidade</h2>
            <form onSubmit={() => setIsCityModalOpen(true)}>
              <div className="form-group">
                <label htmlFor="cityName">Nome da Cidade</label>
                <input
                  id="cityName"
                  type="text"
                  placeholder="Ex: Campinas"
                  value={newCity.name}
                  onChange={e => setNewCity({ ...newCity, name: e.target.value })}
                  required
                />
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => setIsCityModalOpen(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="submit-button"
                >
                  🏘️ Salvar Cidade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Bairro */}
      {isNeighborhoodModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>🏠 Novo Bairro</h2>
            <form onSubmit={() => setIsNeighborhoodModalOpen(true)}>
              <div className="form-group">
                <label htmlFor="neighborhoodName">Nome do Bairro</label>
                <input
                  id="neighborhoodName"
                  type="text"
                  placeholder="Ex: Centro"
                  value={newNeighborhood.name}
                  onChange={e => setNewNeighborhood({ ...newNeighborhood, name: e.target.value })}
                  required
                />
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => setIsNeighborhoodModalOpen(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="submit-button"
                >
                  🏠 Salvar Bairro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLocationModalOpen && selectedState && (
        <LocationModal
          isOpen={isLocationModalOpen}
          onClose={() => {
            setIsLocationModalOpen(false);
            setSelectedState(null);
            setSelectedCity(null);
          }}
          onSaveCity={handleCreateCity}
          onSaveNeighborhood={handleCreateNeighborhood}
          onDeleteCity={handleDeleteCity}
          onDeleteNeighborhood={handleDeleteNeighborhood}
          stateName={selectedState.name}
          cities={cities}
          neighborhoods={neighborhoods}
          onCitySelect={(city) => setSelectedCity(city)}
        />
      )}
    </div>
  );
};

export default Cities; 