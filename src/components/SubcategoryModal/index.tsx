import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './styles.css';

interface Subcategory {
  id: string;
  name: string;
  isActive: boolean;
  mainCategoryId: string;
  createdAt: string;
}

interface SubcategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subcategoryData: { name: string; mainCategoryId: string }) => void;
  mainCategoryId: string;
  mainCategoryName: string;
}

const SubcategoryModal: React.FC<SubcategoryModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  mainCategoryId,
  mainCategoryName
}) => {
  const [name, setName] = useState('');
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getAuthHeader = () => {
    const token = localStorage.getItem('@AdminApp:token');
    if (!token) {
      console.error('Token de acesso não encontrado');
      return {};
    }
    console.log('Token encontrado:', token);
    return {
      Authorization: `Bearer ${token}`
    };
  };

  const fetchSubcategories = async () => {
    try {
      const headers = getAuthHeader();
      console.log('Headers da requisição:', headers);
      
      const response = await axios.get(
        `http://localhost:8080/api/admin/subcategories?mainCategoryId=${mainCategoryId}`,
        { headers }
      );
      console.log('Resposta da API (subcategorias):', response.data);
      setSubcategories(response.data);
    } catch (error) {
      console.error('Erro ao buscar subcategorias:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSubcategories();
      setName('');
      setEditingSubcategory(null);
    }
  }, [isOpen, mainCategoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('Por favor, insira um nome para a subcategoria');
      return;
    }

    try {
      if (editingSubcategory) {
        // Editando subcategoria existente
        await axios.put(
          `http://localhost:8080/api/admin/subcategories/${editingSubcategory.id}`,
          {
            name: name.trim(),
            mainCategoryId: mainCategoryId
          },
          { 
            headers: {
              ...getAuthHeader(),
              'Content-Type': 'application/json'
            } 
          }
        );
      } else {
        // Criando nova subcategoria
        await onSave({
          name: name.trim(),
          mainCategoryId: mainCategoryId
        });
      }
      
      setName('');
      setEditingSubcategory(null);
      await fetchSubcategories();
    } catch (error: any) {
      console.error('Erro detalhado:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        mainCategoryId: mainCategoryId // Log do ID da categoria
      });
      alert('Erro ao salvar subcategoria: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    setName(subcategory.name);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta subcategoria?')) {
      try {
        await axios.delete(
          `http://localhost:8080/api/admin/subcategories/${id}`,
          { headers: getAuthHeader() }
        );
        await fetchSubcategories();
      } catch (error: any) {
        console.error('Erro ao excluir subcategoria:', error);
        alert('Erro ao excluir subcategoria: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleCancel = () => {
    setName('');
    setEditingSubcategory(null);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content subcategory-modal">
        <div className="modal-header">
          <div>
            <h2>Subcategorias</h2>
            <p className="modal-subtitle">{mainCategoryName}</p>
          </div>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <div className="subcategories-container">
          <div className="subcategories-list">
            <h3>Subcategorias Existentes</h3>
            {isLoading ? (
              <p>Carregando subcategorias...</p>
            ) : subcategories.length > 0 ? (
              <div className="subcategories-grid">
                {subcategories.map((subcategory) => (
                  <div key={subcategory.id} className="subcategory-item">
                    <span className="subcategory-name">{subcategory.name}</span>
                    <div className="subcategory-actions">
                      <button 
                        className="action-btn edit"
                        onClick={() => handleEdit(subcategory)}
                      >
                        <i className="icon">✏️</i>
                      </button>
                      <button 
                        className="action-btn delete"
                        onClick={() => handleDelete(subcategory.id)}
                      >
                        <i className="icon">🗑️</i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-subcategories">Nenhuma subcategoria cadastrada</p>
            )}
          </div>

          <div className="subcategory-form">
            <h3>{editingSubcategory ? 'Editar Subcategoria' : 'Nova Subcategoria'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Nome da Subcategoria*</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ex: Pizza de Queijo"
                />
              </div>

              <div className="form-buttons">
                {editingSubcategory && (
                  <button type="button" className="cancel-button" onClick={handleCancel}>
                    Cancelar
                  </button>
                )}
                <button type="submit" className="save-button">
                  {editingSubcategory ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubcategoryModal; 