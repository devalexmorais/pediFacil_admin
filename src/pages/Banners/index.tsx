import React, { useState, useEffect } from 'react';
import { getMainCategories, Category, getSubcategories } from '../../services/categoryServices';
import { createBanner, getAllBanners, deleteBanner, updateBanner, Banner } from '../../services/bannerServices';
import { getAuth } from 'firebase/auth';
import { getImageInfo, shouldCompressImage } from '../../utils/imageCompression';
import './styles.css';

interface Subcategory {
  id: string;
  name: string;
  isActive: boolean;
  parentCategoryId: string;
}

const Banners = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [allSubcategories, setAllSubcategories] = useState<Subcategory[]>([]);
  // const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [newBanner, setNewBanner] = useState({
    title: '',
    mainCategoryId: '',
    subcategoryId: '',
    image: null as File | null,
  });
  const [imageInfo, setImageInfo] = useState<{
    sizeKB: number;
    width: number;
    height: number;
    needsCompression: boolean;
  } | null>(null);

  useEffect(() => {
    loadBanners();
    loadCategories();
  }, []);

  // Efeito para carregar subcategorias dos banners existentes
  useEffect(() => {
    if (banners.length > 0 && categories.length > 0) {
      const loadAllRelevantSubcategories = async () => {
        // Criar um conjunto para evitar carregamentos duplicados
        const uniqueCategoryIds = new Set(categories.map(c => c.id));
        
        for (const categoryId of uniqueCategoryIds) {
          await loadSubcategories(categoryId);
        }
      };
      
      loadAllRelevantSubcategories();
    }
  }, [banners, categories]);

  useEffect(() => {
    if (newBanner.mainCategoryId) {
      loadSubcategories(newBanner.mainCategoryId);
    } else {
      setSubcategories([]);
    }
  }, [newBanner.mainCategoryId]);

  // Carregar subcategorias quando entrar em modo de edição
  useEffect(() => {
    if (editingBanner && newBanner.mainCategoryId) {
      loadSubcategories(newBanner.mainCategoryId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingBanner]);

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
      // setCategoriesLoading(true);
      const data = await getMainCategories();
      console.log('Categorias carregadas:', data);
      setCategories(data);
    } catch (err: any) {
      console.error('Erro completo ao carregar categorias:', err);
      setError(`Falha ao carregar categorias: ${err.message}`);
    } finally {
      // setCategoriesLoading(false);
    }
  };

  const loadSubcategories = async (categoryId: string) => {
    try {
      setSubcategoriesLoading(true);
      const data = await getSubcategories(categoryId);
      console.log('Subcategorias carregadas:', data);
      setSubcategories(data);

      // Adicionar às subcategorias globais para referência
      setAllSubcategories(prev => {
        const existing = prev.filter(sc => sc.parentCategoryId !== categoryId);
        return [...existing, ...data];
      });
    } catch (err: any) {
      console.error('Erro ao carregar subcategorias:', err);
      setError(`Falha ao carregar subcategorias: ${err.message}`);
    } finally {
      setSubcategoriesLoading(false);
    }
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError('');

      // Verificar status de autenticação
      const auth = getAuth();
      const user = auth.currentUser;
      console.log('Status de autenticação:', user ? 'Autenticado como ' + user.email : 'Não autenticado');

      if (!user) {
        throw new Error('Você precisa estar autenticado para criar banners');
      }

      if (editingBanner) {
        // Modo de edição
        if (!newBanner.subcategoryId) {
          throw new Error('Selecione uma subcategoria para o banner');
        }

        const updateData: any = {
          title: newBanner.title,
          subcategoryId: newBanner.subcategoryId,
        };

        if (newBanner.image) {
          updateData.image = newBanner.image;
        }

        await updateBanner(editingBanner.id, updateData);
      } else {
        // Modo de criação
        if (!newBanner.image) {
          throw new Error('Selecione uma imagem para o banner');
        }

        if (!newBanner.subcategoryId) {
          throw new Error('Selecione uma subcategoria para o banner');
        }

        await createBanner({
          title: newBanner.title,
          mainCategoryId: newBanner.subcategoryId, // Usar subcategoryId no lugar de mainCategoryId
          image: newBanner.image
        });
      }

      await loadBanners();
      setIsModalOpen(false);
      setEditingBanner(null);
      setNewBanner({ title: '', mainCategoryId: '', subcategoryId: '', image: null });
      setImageInfo(null);
    } catch (err: any) {
      console.error('Erro completo:', err);
      setError(err.message || `Erro ao ${editingBanner ? 'atualizar' : 'criar'} banner`);
    }
  };

  const handleEditBanner = (banner: Banner) => {
    // Encontrar a categoria principal através da subcategoria
    const subcategory = allSubcategories.find(sc => sc.id === banner.subcategoryId);
    const mainCategoryId = subcategory?.parentCategoryId || '';

    setEditingBanner(banner);
    setNewBanner({
      title: banner.title,
      mainCategoryId: mainCategoryId,
      subcategoryId: banner.subcategoryId,
      image: null,
    });
    setImageInfo(null);
    setIsModalOpen(true);
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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewBanner({ ...newBanner, image: file });
      
      try {
        // Obter informações da imagem
        const info = await getImageInfo(file);
        const needsCompression = shouldCompressImage(file);
        
        setImageInfo({
          sizeKB: info.sizeKB,
          width: info.width,
          height: info.height,
          needsCompression
        });
      } catch (error) {
        console.error('Erro ao obter informações da imagem:', error);
        setImageInfo(null);
      }
    }
  };

  // Função para obter o nome da subcategoria
  const getSubcategoryName = (subcategoryId: string): string => {
    const subcategory = allSubcategories.find(sc => sc.id === subcategoryId);
    if (subcategory) {
      const category = categories.find(c => c.id === subcategory.parentCategoryId);
      const categoryName = category ? category.name : 'Categoria não encontrada';
      return `${categoryName} > ${subcategory.name}`;
    }
    return `Subcategoria ID: ${subcategoryId}`;
  };

  // Função para carregar todas as subcategorias de uma categoria específica
  // const loadCategorySubcategories = async (categoryId: string) => {
  //   if (!allSubcategories.some(sc => sc.parentCategoryId === categoryId)) {
  //     await loadSubcategories(categoryId);
  //   }
  // };

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
              <p>Subcategoria: {getSubcategoryName(banner.subcategoryId)}</p>
              <span className={`status-badge ${banner.isActive ? 'active' : 'inactive'}`}>
                {banner.isActive ? 'Ativo' : 'Inativo'}
              </span>
              <div className="banner-actions">
                <button 
                  onClick={() => handleEditBanner(banner)}
                  className="edit-button"
                >
                  Editar
                </button>
                <button 
                  onClick={() => handleDeleteBanner(banner.id)}
                  className="delete-button"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingBanner ? 'Editar Banner' : 'Adicionar Banner'}</h2>
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
                  onChange={(e) => setNewBanner({ ...newBanner, mainCategoryId: e.target.value, subcategoryId: '' })}
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
                <label htmlFor="subcategory">Subcategoria</label>
                <select
                  id="subcategory"
                  value={newBanner.subcategoryId}
                  onChange={(e) => setNewBanner({ ...newBanner, subcategoryId: e.target.value })}
                  required
                  disabled={!newBanner.mainCategoryId || subcategoriesLoading}
                >
                  <option value="">Selecione uma subcategoria</option>
                  {subcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
                {subcategoriesLoading && <span className="loading-text">Carregando subcategorias...</span>}
                {!subcategoriesLoading && subcategories.length === 0 && newBanner.mainCategoryId && 
                  <span className="no-data-text">Nenhuma subcategoria disponível para esta categoria</span>
                }
              </div>
              <div className="form-group">
                <label htmlFor="image">Imagem do Banner</label>
                <input
                  type="file"
                  id="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  required={!editingBanner}
                />
                {editingBanner && (
                  <div className="current-image-preview">
                    <p>Imagem atual:</p>
                    <img src={editingBanner.image} alt={editingBanner.title} className="preview-image" />
                    <p className="image-note">Deixe em branco para manter a imagem atual</p>
                  </div>
                )}
                {imageInfo && (
                  <div className="image-info">
                    <div className="image-details">
                      <span><strong>Tamanho:</strong> {imageInfo.sizeKB.toFixed(1)} KB</span>
                      <span><strong>Dimensões:</strong> {imageInfo.width} × {imageInfo.height}px</span>
                    </div>
                    {imageInfo.needsCompression && (
                      <div className="compression-notice">
                        <span className="compression-icon">⚠️</span>
                        <span>A imagem será comprimida automaticamente para otimizar o upload</span>
                      </div>
                    )}
                    {!imageInfo.needsCompression && (
                      <div className="no-compression-notice">
                        <span className="no-compression-icon">✅</span>
                        <span>Imagem otimizada - não precisa de compressão</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="submit" className="save-button">
                  {editingBanner ? 'Atualizar' : 'Salvar'}
                </button>
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingBanner(null);
                    setNewBanner({ title: '', mainCategoryId: '', subcategoryId: '', image: null });
                    setImageInfo(null);
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