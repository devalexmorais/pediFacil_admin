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
