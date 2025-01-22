import { useState, useEffect } from 'react';
import './styles.css';

interface MainCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  isActive: boolean;
  createdAt: string;
  createdByAdminId: string;
}

interface Banner {
  id: string;
  title: string;
  image: string;
  mainCategoryId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  mainCategory: MainCategory;
}

const Banners = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBanner, setNewBanner] = useState({
    title: '',
    mainCategoryId: '',
    image: null as File | null,
  });
  const API_URL = 'http://localhost:8080';

  useEffect(() => {
    loadBanners();
    loadCategories();
  }, []);

  const loadBanners = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('@AdminApp:token');
      
      if (!token) {
        throw new Error('Token não encontrado');
      }

      const response = await fetch(`${API_URL}/api/admin/banners`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar banners');
      }

      const data = await response.json();
      setBanners(Array.isArray(data) ? data : [data]);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar banners');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const token = localStorage.getItem('@AdminApp:token');
      
      if (!token) {
        throw new Error('Token não encontrado');
      }

      const response = await fetch(`${API_URL}/api/admin/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar categorias');
      }

      const data = await response.json();
      setCategories(data);
    } catch (err: any) {
      console.error('Erro ao carregar categorias:', err);
    }
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError('');
      const token = localStorage.getItem('@AdminApp:token');
      
      console.log('Token:', token);
      console.log('Dados do banner:', {
        title: newBanner.title,
        mainCategoryId: newBanner.mainCategoryId,
        image: newBanner.image
      });

      if (!token) {
        throw new Error('Token não encontrado');
      }

      if (!newBanner.image) {
        throw new Error('Selecione uma imagem para o banner');
      }

      const formData = new FormData();
      formData.append('title', newBanner.title);
      formData.append('mainCategoryId', newBanner.mainCategoryId);
      formData.append('image', newBanner.image);

      console.log('FormData criado:', {
        title: formData.get('title'),
        mainCategoryId: formData.get('mainCategoryId'),
        image: formData.get('image')
      });

      const response = await fetch(`${API_URL}/api/admin/banners`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      console.log('Resposta da API:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar banner');
      }

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
      const token = localStorage.getItem('@AdminApp:token');
      
      if (!token) {
        throw new Error('Token não encontrado');
      }

      const response = await fetch(`${API_URL}/api/admin/banners/${bannerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao excluir banner');
      }

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
              src={`${API_URL}${banner.image}`} 
              alt={banner.title} 
              className="banner-image"
            />
            <div className="banner-info">
              <h3>{banner.title}</h3>
              <p>Categoria: {banner.mainCategory.name}</p>
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
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => setIsModalOpen(false)}
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
    </div>
  );
};

export default Banners; 