import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';
import { getAuth } from 'firebase/auth';
import imageCompression from 'browser-image-compression';
import './styles.css';

interface Category {
  id: string;
  name: string;
  image: string;
  isActive: boolean;
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (categoryData: any) => void;
  categoryToEdit?: Category;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSave, categoryToEdit }) => {
  const [formData, setFormData] = useState({
    name: '',
    imagePreview: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [compressionProgress, setCompressionProgress] = useState<number>(0);

  useEffect(() => {
    if (categoryToEdit) {
      setFormData({
        name: categoryToEdit.name,
        imagePreview: categoryToEdit.image || ''
      });
      setSelectedFile(null);
    } else {
      setFormData({
        name: '',
        imagePreview: ''
      });
      setSelectedFile(null);
    }
    setUploadError(null);
    setCompressionProgress(0);
  }, [categoryToEdit]);

  const convertToPng = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível criar o contexto do canvas'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], 'image.png', { type: 'image/png' });
            resolve(newFile);
          } else {
            reject(new Error('Não foi possível converter a imagem'));
          }
        }, 'image/png');
      };
      
      img.onerror = () => reject(new Error('Erro ao carregar a imagem'));
      img.src = URL.createObjectURL(file);
    });
  };

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 800,
      useWebWorker: true,
      onProgress: (progress: number) => {
        setCompressionProgress(Math.round(progress));
      }
    };

    try {
      console.log('Iniciando compressão da imagem...');
      console.log('Tamanho original:', (file.size / 1024 / 1024).toFixed(2), 'MB');
      
      const compressedFile = await imageCompression(file, options);
      console.log('Compressão concluída!');
      console.log('Tamanho após compressão:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');
      
      // Converter para PNG após a compressão
      console.log('Convertendo para PNG...');
      const pngFile = await convertToPng(compressedFile);
      console.log('Conversão para PNG concluída!');
      
      return pngFile;
    } catch (error: any) {
      console.error('Erro no processamento da imagem:', error);
      throw new Error('Erro ao processar imagem: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setUploadError(null);

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error('Usuário não está autenticado. Por favor, faça login novamente.');
      }

      console.log('Status de autenticação:', !!user);
      console.log('User ID:', user.uid);
      console.log('Email:', user.email);
      console.log('Email verificado:', user.emailVerified);

      if (!formData.name.trim()) {
        throw new Error('Nome da categoria é obrigatório');
      }

      let imageUrl = categoryToEdit?.image || '';

      if (selectedFile) {
        try {
          const processedFile = await compressImage(selectedFile);
          const timestamp = Date.now();
          const fileName = `${timestamp}_category.png`;
          const storageRef = ref(storage, `categories/${fileName}`);
          
          console.log('Iniciando upload...', {
            fileName,
            fileSize: processedFile.size,
            fileType: processedFile.type,
            storagePath: `categories/${fileName}`
          });

          const uploadResult = await uploadBytes(storageRef, processedFile);
          console.log('Upload concluído:', uploadResult);
          
          imageUrl = await getDownloadURL(uploadResult.ref);
          console.log('URL da imagem:', imageUrl);
        } catch (uploadError: any) {
          console.error('Erro detalhado no upload:', {
            code: uploadError.code,
            message: uploadError.message,
            name: uploadError.name,
            stack: uploadError.stack
          });
          throw new Error(`Erro no upload: ${uploadError.message}`);
        }
      } else if (!categoryToEdit) {
        throw new Error('Imagem é obrigatória para novas categorias');
      }

      const categoryData = {
        name: formData.name,
        image: imageUrl,
        isActive: true,
        ...(categoryToEdit && { id: categoryToEdit.id })
      };

      await onSave(categoryData);
      onClose();
      setFormData({ name: '', imagePreview: '' });
      setSelectedFile(null);
    } catch (error: any) {
      console.error('Erro ao salvar categoria:', error);
      setUploadError(error.message || 'Erro ao salvar categoria');
    } finally {
      setIsLoading(false);
      setCompressionProgress(0);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setCompressionProgress(0);
    
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validar tipo do arquivo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Por favor, selecione apenas imagens nos formatos: JPG, JPEG, PNG ou WEBP');
        return;
      }
      
      // Validar tamanho máximo (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('A imagem deve ter no máximo 5MB');
        return;
      }

      try {
        setSelectedFile(file);
        setFormData(prev => ({
          ...prev,
          imagePreview: URL.createObjectURL(file)
        }));
      } catch (error: any) {
        console.error('Erro ao processar arquivo:', error);
        setUploadError('Erro ao processar imagem: ' + error.message);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{categoryToEdit ? 'Editar Categoria' : 'Nova Categoria'}</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Nome da Categoria*</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Ex: Restaurantes"
            />
          </div>

          <div className="form-group">
            <label htmlFor="image">Imagem da Categoria{!categoryToEdit && '*'}</label>
            <input
              type="file"
              id="image"
              name="image"
              onChange={handleFileChange}
              accept="image/*"
              required={!categoryToEdit}
            />
            {formData.imagePreview && (
              <div className="image-preview">
                <img src={formData.imagePreview} alt="Preview" />
                {compressionProgress > 0 && compressionProgress < 100 && (
                  <div className="compression-progress">
                    <div 
                      className="progress-bar" 
                      style={{ width: `${compressionProgress}%` }}
                    />
                    <span>Comprimindo: {compressionProgress}%</span>
                  </div>
                )}
              </div>
            )}
            {uploadError && (
              <p className="error-message">{uploadError}</p>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-button" onClick={onClose} disabled={isLoading}>
              Cancelar
            </button>
            <button type="submit" className="save-button" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CategoryModal; 