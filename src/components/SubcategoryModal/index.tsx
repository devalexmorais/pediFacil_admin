import React, { useState, useEffect } from 'react';
import { getSubcategories, deleteSubcategory } from '../../services/categoryServices';
import './styles.css';

interface Subcategory {
  id: string;
  name: string;
  isActive: boolean;
  parentCategoryId: string;
  createdAt: string;
}

interface SubcategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subcategoryData: { name: string }) => void;
  mainCategoryId: string;
  mainCategoryName: string;
  onUpdateCount: () => void;
}

const SubcategoryModal: React.FC<SubcategoryModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  mainCategoryId,
  mainCategoryName,
  onUpdateCount
}) => {
  const [name, setName] = useState('');
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  // const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubcategories = async () => {
    try {
      setIsLoading(true);
      console.log('Buscando subcategorias para categoria:', mainCategoryId);
      const subcategoriesList = await getSubcategories(mainCategoryId);
      console.log('Subcategorias encontradas:', subcategoriesList);
      setSubcategories(subcategoriesList.map(sub => ({
        ...sub,
        createdAt: sub.createdAt || ''
      })));
      setError(null);
    } catch (error: any) {
      console.error('Erro ao buscar subcategorias:', error);
      setError(error.message || 'Erro ao carregar subcategorias');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSubcategories();
      setName('');
      // setEditingSubcategory(null);
    }
  }, [isOpen, mainCategoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('Por favor, insira um nome para a subcategoria');
      return;
    }

    try {
      await onSave({ name: name.trim() });
      setName('');
      // setEditingSubcategory(null);
      await fetchSubcategories();
    } catch (error: any) {
      console.error('Erro ao salvar subcategoria:', error);
      alert('Erro ao salvar subcategoria: ' + error.message);
    }
  };

  // const handleCancel = () => {
  //   setName('');
  //   // setEditingSubcategory(null);
  // };

  const handleDeleteSubcategory = async (subcategoryId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta subcategoria?')) {
      try {
        await deleteSubcategory(mainCategoryId, subcategoryId);
        await fetchSubcategories();
        onUpdateCount();
      } catch (error: any) {
        console.error('Erro ao excluir subcategoria:', error);
        setError(error.message || 'Erro ao excluir subcategoria');
      }
    }
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
            ) : error ? (
              <p className="error-message">{error}</p>
            ) : subcategories.length > 0 ? (
              <div className="subcategories-grid">
                {subcategories.map((subcategory) => (
                  <div key={subcategory.id} className="subcategory-item">
                    <span className="subcategory-name">{subcategory.name}</span>
                    <div className="subcategory-actions">
                      <button
                        className="action-btn delete"
                        onClick={() => handleDeleteSubcategory(subcategory.id)}
                        title="Excluir subcategoria"
                      >
                        🗑️
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
            <h3>Nova Subcategoria</h3>
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
                <button type="submit" className="save-button">
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SubcategoryModal; 