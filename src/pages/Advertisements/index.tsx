import React, { useState, useEffect } from 'react';
import { createAdvertisement, getAllAdvertisements, updateAdvertisement, deleteAdvertisement, Advertisement } from '../../services/advertisementServices';
import { getAuth } from 'firebase/auth';
import './styles.css';

const Advertisements = () => {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdvertisement, setEditingAdvertisement] = useState<Advertisement | null>(null);
  const [formData, setFormData] = useState({
    image: null as File | null,
    isActive: true,
  });

  useEffect(() => {
    loadAdvertisements();
  }, []);

  const loadAdvertisements = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const data = await getAllAdvertisements();
      setAdvertisements(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar advertisements');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError('');

      // Verificar status de autenticação
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error('Você precisa estar autenticado para gerenciar advertisements');
      }

      if (!formData.image && !editingAdvertisement) {
        throw new Error('Selecione uma imagem para o advertisement');
      }

      if (editingAdvertisement) {
        // Editando advertisement existente
        const updateData: any = {
          isActive: formData.isActive
        };
        
        if (formData.image) {
          updateData.image = formData.image;
        }

        await updateAdvertisement(editingAdvertisement.id, updateData);
      } else {
        // Criando novo advertisement
        await createAdvertisement({
          image: formData.image!,
          isActive: formData.isActive
        });
      }

      await loadAdvertisements();
      handleCloseModal();
    } catch (err: any) {
      console.error('Erro completo:', err);
      setError(err.message || 'Erro ao salvar advertisement');
    }
  };

  const handleEdit = (advertisement: Advertisement) => {
    setEditingAdvertisement(advertisement);
    setFormData({
      image: null,
      isActive: advertisement.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (advertisementId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este advertisement?')) {
      return;
    }

    try {
      setError('');
      await deleteAdvertisement(advertisementId);
      await loadAdvertisements();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir advertisement');
    }
  };

  const handleToggleStatus = async (advertisement: Advertisement) => {
    try {
      setError('');
      await updateAdvertisement(advertisement.id, {
        isActive: !advertisement.isActive
      });
      await loadAdvertisements();
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar status do advertisement');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, image: e.target.files[0] });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAdvertisement(null);
    setFormData({ image: null, isActive: true });
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Data não disponível';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Data inválida';
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="advertisements-container">
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError('')} className="close-error">
            ×
          </button>
        </div>
      )}
      
      <header className="page-header">
        <h1>Advertisements</h1>
        <button 
          className="add-button"
          onClick={() => setIsModalOpen(true)}
        >
          Adicionar Advertisement
        </button>
      </header>

      <div className="advertisements-grid">
        {advertisements.map((advertisement) => (
          <div key={advertisement.id} className="advertisement-card">
            <img 
              src={advertisement.image}
              alt="Advertisement" 
              className="advertisement-image"
            />
            <div className="advertisement-info">
              <div className="advertisement-meta">
                <span className="advertisement-date">
                  Criado: {formatDate(advertisement.createdAt)}
                </span>
                <span className="advertisement-date">
                  Atualizado: {formatDate(advertisement.updatedAt)}
                </span>
              </div>
              
              <div className="advertisement-status">
                <span className={`status-badge ${advertisement.isActive ? 'active' : 'inactive'}`}>
                  {advertisement.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="advertisement-actions">
                <button 
                  onClick={() => handleEdit(advertisement)}
                  className="edit-button"
                >
                  Editar
                </button>
                <button 
                  onClick={() => handleToggleStatus(advertisement)}
                  className={`toggle-button ${advertisement.isActive ? 'deactivate' : 'activate'}`}
                >
                  {advertisement.isActive ? 'Desativar' : 'Ativar'}
                </button>
                <button 
                  onClick={() => handleDelete(advertisement.id)}
                  className="delete-button"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {advertisements.length === 0 && (
        <div className="empty-state">
          <p>Nenhum advertisement encontrado</p>
          <button 
            className="add-button"
            onClick={() => setIsModalOpen(true)}
          >
            Criar primeiro advertisement
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingAdvertisement ? 'Editar Advertisement' : 'Adicionar Advertisement'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="image">Imagem do Advertisement</label>
                <input
                  type="file"
                  id="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  required={!editingAdvertisement}
                />
                {editingAdvertisement && !formData.image && (
                  <p className="form-help">Deixe em branco para manter a imagem atual</p>
                )}
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  Advertisement Ativo
                </label>
              </div>

              <div className="modal-footer">
                <button type="submit" className="save-button">
                  {editingAdvertisement ? 'Atualizar' : 'Salvar'}
                </button>
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={handleCloseModal}
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

export default Advertisements; 