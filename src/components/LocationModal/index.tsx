import React, { useState, useEffect } from 'react';
import { City, Neighborhood } from '../../services/locationServices';
import './styles.css';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCity: (data: { name: string }) => void;
  onSaveNeighborhood: (data: { name: string }) => void;
  onDeleteCity: (cityId: string) => void;
  onDeleteNeighborhood: (neighborhoodId: string) => void;
  stateName: string;
  cities: City[];
  neighborhoods: Neighborhood[];
  onCitySelect: (city: City) => void;
}

const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  onSaveCity,
  onSaveNeighborhood,
  onDeleteCity,
  onDeleteNeighborhood,
  stateName,
  cities,
  neighborhoods,
  onCitySelect,
}) => {
  const [newCityName, setNewCityName] = useState('');
  const [newNeighborhoodName, setNewNeighborhoodName] = useState('');
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

  useEffect(() => {
    if (selectedCity) {
      setNewNeighborhoodName('');
    }
  }, [selectedCity]);

  const handleSubmitCity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityName.trim()) return;
    
    onSaveCity({ name: newCityName.trim() });
    setNewCityName('');
  };

  const handleSubmitNeighborhood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCity || !newNeighborhoodName.trim()) return;
    
    onSaveNeighborhood({ name: newNeighborhoodName.trim() });
    setNewNeighborhoodName('');
  };

  const handleCityClick = (city: City) => {
    setSelectedCity(city);
    onCitySelect(city);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content location-modal">
        <div className="modal-header">
          <div>
            <h2>Gerenciar Localidades</h2>
            <p className="modal-subtitle">{stateName}</p>
          </div>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="locations-container">
          <div className="cities-section">
            <h3>Cidades</h3>
            <form onSubmit={handleSubmitCity}>
              <div className="form-group">
                <input
                  type="text"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  placeholder="Nome da cidade"
                  required
                />
                <button type="submit">Adicionar Cidade</button>
              </div>
            </form>

            <div className="cities-list">
              {cities.map((city) => (
                <div 
                  key={city.id} 
                  className={`city-item ${selectedCity?.id === city.id ? 'selected' : ''}`}
                >
                  <span 
                    className="city-name"
                    onClick={() => handleCityClick(city)}
                  >
                    {city.name}
                  </span>
                  <button
                    className="delete-btn"
                    onClick={() => onDeleteCity(city.id)}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>

          {selectedCity && (
            <div className="neighborhoods-section">
              <h3>Bairros de {selectedCity.name}</h3>
              <form onSubmit={handleSubmitNeighborhood}>
                <div className="form-group">
                  <input
                    type="text"
                    value={newNeighborhoodName}
                    onChange={(e) => setNewNeighborhoodName(e.target.value)}
                    placeholder="Nome do bairro"
                    required
                  />
                  <button type="submit">Adicionar Bairro</button>
                </div>
              </form>

              <div className="neighborhoods-list">
                {neighborhoods.map((neighborhood) => (
                  <div key={neighborhood.id} className="neighborhood-item">
                    <span>{neighborhood.name}</span>
                    <button
                      className="delete-btn"
                      onClick={() => onDeleteNeighborhood(neighborhood.id)}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationModal; 