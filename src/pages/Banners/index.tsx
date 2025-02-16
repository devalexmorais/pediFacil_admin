import React, { useState, useEffect } from 'react';
import { getMainCategories, Category } from '../../services/categoryServices';
import { createBanner, getAllBanners, deleteBanner, Banner } from '../../services/bannerServices';
import './styles.css';

const Banners = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBanner, setNewBanner] = useState({
    title: '',
    mainCategoryId: '',
    image: null as File | null,
  });

  useEffect(() => {
    loadBanners();
    loadCategories();
  }, []);

  const loadBanners = async () => {
    try {
      setLoading(true);
      setError('');
      
      const data = await getAllBanners();
      setBanners(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar banners');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const data = await getMainCategories();
      console.log('Categorias carregadas:', data);
      setCategories(data);
    } catch (err: any) {
      console.error('Erro completo ao carregar categorias:', err);
      setError(`Falha ao carregar categorias: ${err.message}`);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError('');

      if (!newBanner.image) {
        throw new Error('Selecione uma imagem para o banner');
      }

      await createBanner({
        title: newBanner.title,
        mainCategoryId: newBanner.mainCategoryId,
        image: newBanner.image
      });

      await loadBanners();
      setIsModalOpen(false);
      setNewBanner({ title: '', mainCategoryId: '', image: null });
    } catch (err: any) {
      console.error('Erro completo:', err);
      setError(err.message || 'Erro ao criar banner');
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este banner?')) {
      return;
    }

    try {
      setError('');
      await deleteBanner(bannerId);
      await loadBanners();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir banner');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewBanner({ ...newBanner, image: e.target.files[0] });
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

  return (
    <div className="banners-container">
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError('')} className="close-error">
            ×
          </button>
        </div>
      )}
      
      <header className="page-header">
        <h1>Banners</h1>
        <button 
          className="add-button"
          onClick={() => setIsModalOpen(true)}
        >
          Adicionar Banner
        </button>
      </header>

      <div className="banners-grid">
        {banners.map((banner) => (
          <div key={banner.id} className="banner-card">
            <img 
              src={banner.image}
              alt={banner.title} 
              className="banner-image"
            />
            <div className="banner-info">
              <h3>{banner.title}</h3>
              <p>Categoria: {categories.find(c => c.id === banner.mainCategoryId)?.name || 'Categoria não encontrada'}</p>
              <span className={`status-badge ${banner.isActive ? 'active' : 'inactive'}`}>
                {banner.isActive ? 'Ativo' : 'Inativo'}
              </span>
              <button 
                onClick={() => handleDeleteBanner(banner.id)}
                className="delete-button"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Adicionar Banner</h2>
            <form onSubmit={handleCreateBanner}>
              <div className="form-group">
                <label htmlFor="title">Título do Banner</label>
                <input
                  type="text"
                  id="title"
                  value={newBanner.title}
                  onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="category">Categoria Principal</label>
                <select
                  id="category"
                  value={newBanner.mainCategoryId}
                  onChange={(e) => setNewBanner({ ...newBanner, mainCategoryId: e.target.value })}
                  required
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="image">Imagem do Banner</label>
                <input
                  type="file"
                  id="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  required
                />
              </div>
              <div className="modal-footer">
                <button type="submit" className="save-button">
                  Salvar
                </button>
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setNewBanner({ title: '', mainCategoryId: '', image: null });
                  }}
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

export default Banners; 