/**
 * Função para comprimir imagens antes do upload
 * Reduz o tamanho do arquivo mantendo boa qualidade visual
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
}

export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<File> => {
  const {
    maxWidth = 1200,
    maxHeight = 800,
    quality = 0.8,
    maxSizeKB = 500
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // Calcular novas dimensões mantendo proporção
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        // Configurar canvas
        canvas.width = width;
        canvas.height = height;

        // Desenhar imagem redimensionada
        ctx?.drawImage(img, 0, 0, width, height);

        // Converter para blob com qualidade especificada
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha ao comprimir imagem'));
              return;
            }

            // Verificar se o tamanho está dentro do limite
            const sizeKB = blob.size / 1024;
            
            if (sizeKB <= maxSizeKB) {
              // Criar novo arquivo com o blob comprimido
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              // Se ainda estiver muito grande, reduzir qualidade
              const newQuality = Math.max(0.1, quality * 0.7);
              compressImage(file, { ...options, quality: newQuality })
                .then(resolve)
                .catch(reject);
            }
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Erro ao carregar imagem'));
    };

    // Carregar imagem
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Função para verificar se uma imagem precisa ser comprimida
 */
export const shouldCompressImage = (file: File): boolean => {
  const maxSizeKB = 500; // 500KB
  const sizeKB = file.size / 1024;
  
  return sizeKB > maxSizeKB || file.type !== 'image/jpeg';
};

/**
 * Função para obter informações da imagem antes da compressão
 */
export const getImageInfo = (file: File): Promise<{
  width: number;
  height: number;
  sizeKB: number;
}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        sizeKB: file.size / 1024
      });
    };
    
    img.onerror = () => {
      reject(new Error('Erro ao carregar imagem'));
    };
    
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Função auxiliar para converter imagem para WEBP
 * Redimensiona para máximo 800x800 mantendo proporção e comprime para WEBP
 */
export const convertToWebP = async (file: File | string): Promise<File> => {
  try {
    let originalSize: number;
    let imageFile: File | null = null;

    // Se for string (URI/URL), converter para File primeiro
    if (typeof file === 'string') {
      // Se for uma URL/URI, fazer fetch para obter o blob
      const response = await fetch(file);
      const blob = await response.blob();
      originalSize = blob.size;
      imageFile = new File([blob], 'image.jpg', { type: blob.type });
    } else {
      imageFile = file;
      originalSize = file.size;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Não foi possível criar o contexto do canvas'));
            return;
          }

          // Redimensionar para máximo 800x800 mantendo proporção
          let { width, height } = img;
          const maxDimension = 800;
          
          if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width = width * ratio;
            height = height * ratio;
          }

          // Configurar canvas
          canvas.width = width;
          canvas.height = height;

          // Desenhar imagem redimensionada
          ctx.drawImage(img, 0, 0, width, height);

          // Converter para WEBP com compressão de 60%
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Falha ao converter imagem para WEBP'));
                return;
              }

              const newSize = blob.size;
              const sizeMB = newSize / (1024 * 1024);
              const reduction = ((originalSize - newSize) / originalSize * 100).toFixed(1);

              console.log(`Imagem convertida para WEBP: ${sizeMB.toFixed(2)}MB (${reduction}% de redução)`);

              // Criar novo arquivo com extensão .webp
              const webpFile = new File([blob], 'image.webp', {
                type: 'image/webp',
                lastModified: Date.now()
              });

              resolve(webpFile);
            },
            'image/webp',
            0.6 // Compressão de 60% para WEBP
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Erro ao carregar imagem'));
      };

      // Carregar imagem
      if (typeof file === 'string') {
        // Se for URL, usar diretamente
        img.src = file;
      } else if (imageFile) {
        // Se for File, criar URL do objeto
        img.src = URL.createObjectURL(imageFile);
      }
    });
  } catch (error) {
    console.error('Erro ao converter imagem para WEBP:', error);
    // Se falhar e for File, retorna o arquivo original
    if (typeof file === 'string') {
      throw error;
    }
    return file;
  }
};
