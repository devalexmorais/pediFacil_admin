import { useState, useEffect } from 'react';
import CategoryModal from '../../components/CategoryModal';
import SubcategoryModal from '../../components/SubcategoryModal';
import ErrorNotification from '../../components/ErrorNotification';
import { 
  getAllCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  getSubcategories,
  Category,
  createSubcategory
} from '../../services/categoryServices';
import './styles.css';


const Categories = () => {
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [subcategoriesCount, setSubcategoriesCount] = useState<{ [key: string]: number }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  const fetchCategories = async () => {
    try {
      console.log('Buscando categorias...');
      const categoriesList = await getAllCategories();
      console.log('Categorias encontradas:', categoriesList);
      setCategories(categoriesList);
      
      // Buscar contagem de subcategorias para cada categoria
      for (const category of categoriesList) {
        const subcategoriesList = await getSubcategories(category.id);
        setSubcategoriesCount(prev => ({
          ...prev,
          [category.id]: subcategoriesList.length
        }));
      }
    } catch (error: any) {
      console.error('Erro ao buscar categorias:', error);
      setError({
        title: 'Erro ao buscar categorias',
        message: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

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
      const category = categories.find(c => c.id === categoryId);
      if (!category) return;

      await updateCategory(categoryId, { isActive: !category.isActive });
      await fetchCategories();
    } catch (error: any) {
      setError({
        title: 'Erro ao atualizar status da categoria',
        message: error.message
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      try {
        await deleteCategory(categoryId);
        await fetchCategories();
      } catch (error: any) {
        setError({
          title: 'Erro ao excluir categoria',
          message: error.message
        });
      }
    }
  };

  const handleSaveCategory = async (categoryData: any) => {
    try {
      console.log('Dados da categoria a serem salvos:', categoryData);
      
      if (categoryToEdit) {
        await updateCategory(categoryToEdit.id, categoryData);
      } else {
        await createCategory(categoryData);
      }
      
      await fetchCategories();
      setIsModalOpen(false);
      setCategoryToEdit(null);
    } catch (error: any) {
      console.error('Erro ao salvar categoria:', error);
      setError({
        title: 'Erro ao salvar categoria',
        message: error.message
      });
    }
  };

  const handleAddSubcategory = (category: Category) => {
    setSelectedCategory(category);
    setIsSubcategoryModalOpen(true);
  };

  const handleSaveSubcategory = async (subcategoryData: { name: string }) => {
    try {
      if (!selectedCategory) {
        setError({
          title: 'Erro ao criar subcategoria',
          message: 'Nenhuma categoria selecionada'
        });
        return;
      }

      await createSubcategory({
        name: subcategoryData.name,
        parentCategoryId: selectedCategory.id,
        isActive: true
      });

      // Atualizar a contagem de subcategorias para a categoria selecionada
      await handleUpdateSubcategoriesCount(selectedCategory.id);

      setIsSubcategoryModalOpen(false);
    } catch (error: any) {
      setError({
        title: 'Erro ao salvar subcategoria',
        message: error.message
      });
    }
  };

  const handleUpdateSubcategoriesCount = async (categoryId: string) => {
    const subcategoriesList = await getSubcategories(categoryId);
    setSubcategoriesCount(prev => ({
      ...prev,
      [categoryId]: subcategoriesList.length
    }));
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
                src={category.image || 'https://via.placeholder.com/150'} 
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
                <span className="subcategories-count">
                  {subcategoriesCount[category.id] || 0} subcategorias
                </span>
              </div>
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
        ))}
      </div>

      {isModalOpen && (
        <CategoryModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setCategoryToEdit(null);
          }}
          onSave={handleSaveCategory}
          categoryToEdit={categoryToEdit || undefined}
        />
      )}

      {isSubcategoryModalOpen && selectedCategory && (
        <SubcategoryModal
          isOpen={isSubcategoryModalOpen}
          onClose={() => setIsSubcategoryModalOpen(false)}
          onSave={handleSaveSubcategory}
          mainCategoryId={selectedCategory.id}
          mainCategoryName={selectedCategory.name}
          onUpdateCount={() => handleUpdateSubcategoriesCount(selectedCategory.id)}
        />
      )}
    </div>
  );
}

export default Categories; 