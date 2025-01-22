import React, { useState, useEffect } from 'react';
import './styles.css';

interface Neighborhood {
  name: string;
  deliveryFee: number;
}

interface AddCityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cityData: any) => void;
  cityToEdit?: {
    id?: number;
    name: string;
    state: string;
    status: string;
    neighborhoods?: Neighborhood[];
  };
}

const AddCityModal: React.FC<AddCityModalProps> = ({ isOpen, onClose, onSave, cityToEdit }) => {
  const [formData, setFormData] = useState({
    name: '',
    state: '',
    status: 'ativo'
  });

  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [newNeighborhood, setNewNeighborhood] = useState({
    name: '',
    deliveryFee: ''
  });

  // Carrega os dados da cidade quando estiver em modo de edição
  useEffect(() => {
    if (cityToEdit) {
      setFormData({
        name: cityToEdit.name,
        state: cityToEdit.state,
        status: cityToEdit.status.toLowerCase()
      });
      setNeighborhoods(cityToEdit.neighborhoods || []);
    } else {
      // Reseta o formulário quando não houver cidade para editar
      setFormData({
        name: '',
        state: '',
        status: 'ativo'
      });
      setNeighborhoods([]);
    }
  }, [cityToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(cityToEdit?.id && { id: cityToEdit.id }), // Mantém o ID se estiver editando
      ...formData,
      neighborhoods: neighborhoods
    });
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddNeighborhood = () => {
    if (newNeighborhood.name && newNeighborhood.deliveryFee) {
      setNeighborhoods([
        ...neighborhoods,
        {
          name: newNeighborhood.name,
          deliveryFee: Number(newNeighborhood.deliveryFee)
        }
      ]);
      setNewNeighborhood({ name: '', deliveryFee: '' });
    }
  };

  const handleRemoveNeighborhood = (index: number) => {
    setNeighborhoods(neighborhoods.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{cityToEdit ? 'Editar Cidade' : 'Nova Cidade'}</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Nome da Cidade*</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Ex: São Paulo"
            />
          </div>

          <div className="form-group">
            <label htmlFor="state">Estado*</label>
            <select
              id="state"
              name="state"
              value={formData.state}
              onChange={handleChange}
              required
            >
              <option value="">Selecione um estado</option>
              <option value="SP">São Paulo</option>
              <option value="RJ">Rio de Janeiro</option>
              <option value="MG">Minas Gerais</option>
              <option value="ES">Espírito Santo</option>
              <option value="BA">Bahia</option>
              <option value="PR">Paraná</option>
              <option value="SC">Santa Catarina</option>
              <option value="RS">Rio Grande do Sul</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>

          <div className="neighborhoods-section">
            <h3>Bairros</h3>
            <p className="helper-text">Adicione bairros com taxas de entrega específicas</p>
            
            <div className="add-neighborhood">
              <div className="neighborhood-inputs">
                <input
                  type="text"
                  placeholder="Nome do bairro"
                  value={newNeighborhood.name}
                  onChange={(e) => setNewNeighborhood(prev => ({ ...prev, name: e.target.value }))}
                />
                <input
                  type="number"
                  placeholder="Taxa de entrega (R$)"
                  value={newNeighborhood.deliveryFee}
                  onChange={(e) => setNewNeighborhood(prev => ({ ...prev, deliveryFee: e.target.value }))}
                  min="0"
                  step="0.01"
                />
                <button 
                  type="button" 
                  className="add-neighborhood-button"
                  onClick={handleAddNeighborhood}
                >
                  Adicionar
                </button>
              </div>
            </div>

            {neighborhoods.length > 0 && (
              <div className="neighborhoods-list">
                <table>
                  <thead>
                    <tr>
                      <th>Bairro</th>
                      <th>Taxa de Entrega</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {neighborhoods.map((neighborhood, index) => (
                      <tr key={index}>
                        <td>{neighborhood.name}</td>
                        <td>R$ {neighborhood.deliveryFee.toFixed(2)}</td>
                        <td>
                          <button
                            type="button"
                            className="remove-neighborhood-button"
                            onClick={() => handleRemoveNeighborhood(index)}
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="save-button">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCityModal; 