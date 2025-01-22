import { useState, useEffect } from 'react';
import CategoryModal from '../../components/CategoryModal';
import SubcategoryModal from '../../components/SubcategoryModal';
import ErrorNotification from '../../components/ErrorNotification';
import axios from 'axios';
import './styles.css';

interface Category {
  id: string;
  name: string;
  image: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    sellers: number;
    subCategories: number;
  };
}

interface Subcategory {
  id: string;
  name: string;
  isActive: boolean;
  mainCategoryId: string;
  createdAt: string;
}

const Categories = () => {
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  // Pegar o token do localStorage
  const getAuthHeader = () => {
    const token = localStorage.getItem('@AdminApp:token');
    if (!token) {
      console.error('Token de acesso não encontrado');
      return {};
    }
    console.log('Token encontrado (Categories):', token);
    return {
      Authorization: `Bearer ${token}`
    };
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/admin/categories', {
        headers: getAuthHeader()
      });
      setCategories(response.data);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      setError({
        title: 'Erro ao buscar categorias',
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubcategories = async (categoryId: string) => {
    try {
      const response = await axios.get(`http://localhost:8080/api/admin/subcategories?mainCategoryId=${categoryId}`, {
        headers: getAuthHeader()
      });
      setSubcategories(response.data);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      setError({
        title: 'Erro ao buscar subcategorias',
        message: errorMessage
      });
    }
  };

  // Atualização automática
  useEffect(() => {
    // Primeira chamada ao montar o componente
    fetchCategories();

    // Configura o intervalo de atualização (a cada 5 segundos)
    const intervalId = setInterval(() => {
      fetchCategories();
    }, 5000);

    // Limpa o intervalo quando o componente é desmontado
    return () => clearInterval(intervalId);
  }, []); // Array vazio significa que só executa ao montar o componente

  // Atualização quando houver mudanças nas subcategorias
  useEffect(() => {
    if (selectedCategory) {
      fetchSubcategories(selectedCategory.id);
    }
  }, [selectedCategory]);

  // Atualização quando o modal de subcategorias estiver aberto
  useEffect(() => {
    if (isSubcategoryModalOpen && selectedCategory) {
      const intervalId = setInterval(() => {
        fetchSubcategories(selectedCategory.id);
      }, 5000);

      return () => clearInterval(intervalId);
    }
  }, [isSubcategoryModalOpen, selectedCategory]);

  // Filtra as categorias
  const filteredCategories = categories.filter(category => {
    const matchSearch = !searchText || category.name.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = !selectedStatus || selectedStatus === 'Todos os status' || 
      (category.isActive ? 'Ativo' === selectedStatus : 'Inativo' === selectedStatus);
    return matchSearch && matchStatus;
  });

  const handleAddCategory = () => {
    setCategoryToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setCategoryToEdit(category);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (categoryId: string) => {
    try {
      const response = await axios.patch(
        `http://localhost:8080/api/admin/categories/${categoryId}/toggle`,
        null,
        {
          headers: getAuthHeader()
        }
      );

      // Atualiza a lista de categorias
      await fetchCategories();

      // Mostra mensagem de sucesso
      setError({
        title: 'Sucesso',
        message: response.data.message
      });
    } catch (error: any) {
      setError({
        title: 'Erro ao atualizar status da categoria',
        message: extractErrorMessage(error)
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      try {
        await axios.delete(`http://localhost:8080/api/admin/categories/${categoryId}`, {
          headers: getAuthHeader()
        });
        await fetchCategories();
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message;
        setError({
          title: 'Erro ao excluir categoria',
          message: errorMessage
        });
      }
    }
  };

  const extractErrorMessage = (error: any): string => {
    console.log('Erro completo:', error);
    console.log('Response data:', error.response?.data);
    
    const errorData = error.response?.data;
    
    // Se não houver dados na resposta, retorna a mensagem do erro
    if (!errorData) {
      return error.message || 'Erro desconhecido';
    }

    // Se for uma string direta
    if (typeof errorData === 'string') {
      return errorData;
    }

    // Se tiver uma mensagem direta no objeto
    if (errorData.message) {
      return errorData.message;
    }

    // Se tiver um erro do Prisma
    if (errorData.error) {
      if (typeof errorData.error === 'object') {
        // Erro do Prisma com mensagem
        if (errorData.error.message) {
          return errorData.error.message;
        }
        // Erro do Prisma com meta informações
        if (errorData.error.meta?.cause) {
          return errorData.error.meta.cause;
        }
      }
      return errorData.error.toString();
    }

    // Se for um array de erros
    if (Array.isArray(errorData)) {
      return errorData.map(err => {
        if (typeof err === 'string') return err;
        if (err.message) return err.message;
        if (err.error) return err.error;
        return JSON.stringify(err);
      }).join(', ');
    }

    // Se tiver detalhes do erro
    if (errorData.details) {
      return errorData.details;
    }

    // Se tiver uma causa específica
    if (errorData.cause) {
      return errorData.cause;
    }

    // Se for um objeto com mensagem aninhada
    if (errorData.error?.message) {
      return errorData.error.message;
    }

    // Se nada mais funcionar, converte o objeto para string
    return JSON.stringify(errorData);
  };

  const handleSaveCategory = async (formData: FormData) => {
    try {
      if (categoryToEdit) {
        await axios.put(
          `http://localhost:8080/api/admin/categories/${categoryToEdit.id}`, 
          formData,
          {
            headers: {
              ...getAuthHeader(),
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      } else {
        await axios.post(
          'http://localhost:8080/api/admin/categories', 
          formData,
          {
            headers: {
              ...getAuthHeader(),
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      }
      await fetchCategories();
      setIsModalOpen(false);
      setCategoryToEdit(null);
    } catch (error: any) {
      setError({
        title: 'Erro ao salvar categoria',
        message: extractErrorMessage(error)
      });
    }
  };

  const handleAddSubcategory = (category: Category) => {
    console.log('Categoria selecionada:', category); // Log para debug
    setSelectedCategory(category);
    setIsSubcategoryModalOpen(true);
  };

  const handleSaveSubcategory = async (subcategoryData: { name: string; mainCategoryId: string }) => {
    try {
      if (!selectedCategory) {
        setError({
          title: 'Erro ao criar subcategoria',
          message: 'Nenhuma categoria selecionada'
        });
        return;
      }

      const response = await axios.post(
        'http://localhost:8080/api/admin/subcategories',
        {
          name: subcategoryData.name,
          mainCategoryId: selectedCategory.id
        },
        {
          headers: {
            ...getAuthHeader(),
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data) {
        setIsSubcategoryModalOpen(false);
        await fetchCategories();
        setSelectedCategory(null);
      }
    } catch (error: any) {
      setError({
        title: 'Erro ao salvar subcategoria',
        message: extractErrorMessage(error)
      });
    }
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="categories-container">
      {error && (
        <ErrorNotification
          title={error.title}
          message={error.message}
          onClose={() => setError(null)}
        />
      )}
      
      <header className="page-header">
        <div className="header-content">
          <h1>Categorias</h1>
          <button className="add-button" onClick={handleAddCategory}>
            + Nova Categoria
          </button>
        </div>
        
        <div className="search-filters">
          <input 
            type="text" 
            placeholder="Buscar categoria..." 
            className="search-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <select 
            className="filter-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>
        </div>
      </header>

      <div className="categories-grid">
        {filteredCategories.map((category) => (
          <div key={category.id} className="category-card">
            <div className="category-image">
              <img 
                src={`http://localhost:8080${category.image}`} 
                alt={category.name} 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/150';
                }}
              />
              <span className={`status-badge ${category.isActive ? 'ativo' : 'inativo'}`}>
                {category.isActive ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="category-content">
              <div className="category-header">
                <h3>{category.name}</h3>
              </div>
              <div className="category-info">
                <span className="establishments-count">
                  {category._count?.sellers || 0} estabelecimentos
                </span>
                <span className="subcategories-count">
                  {category._count?.subCategories || 0} subcategorias
                </span>
              </div>
              <div className="action-buttons">
                <div className="action-row">
                  <button 
                    className="action-btn edit"
                    onClick={() => handleEditCategory(category)}
                  >
                    <i className="icon">✏️</i>
                    Editar
                  </button>
                  <button 
                    className="action-btn subcategories"
                    onClick={() => handleAddSubcategory(category)}
                  >
                    <i className="icon">📑</i>
                    Subcategorias
                  </button>
                </div>
                <div className="action-row">
                  <button 
                    className="action-btn delete"
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    <i className="icon">🗑️</i>
                    Excluir
                  </button>
                  <button 
                    className={`action-btn ${category.isActive ? 'deactivate' : 'activate'}`}
                    onClick={() => handleToggleStatus(category.id)}
                  >
                    <i className="icon">{category.isActive ? '🔴' : '🟢'}</i>
                    {category.isActive ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setCategoryToEdit(null);
        }}
        onSave={handleSaveCategory}
        categoryToEdit={categoryToEdit || undefined}
      />

      {selectedCategory && (
        <SubcategoryModal
          isOpen={isSubcategoryModalOpen}
          onClose={() => {
            setIsSubcategoryModalOpen(false);
            setSelectedCategory(null);
          }}
          onSave={handleSaveSubcategory}
          mainCategoryId={selectedCategory.id}
          mainCategoryName={selectedCategory.name}
        />
      )}
    </div>
  );
};

export default Categories; 