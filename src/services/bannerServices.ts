import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { serverTimestamp } from 'firebase/firestore';
import { convertToWebP } from '../utils/imageCompression';

export interface Banner {
  id: string;
  title: string;
  image: string;
  subcategoryId: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const bannersCollection = collection(db, 'banners');

// Função helper para extrair o path da imagem a partir da URL do Firebase Storage
const extractImagePathFromUrl = (imageUrl: string): string | null => {
  try {
    // URL format: https://firebasestorage.googleapis.com/v0/b/PROJECT_ID/o/ENCODED_PATH?alt=media&token=TOKEN
    const url = new URL(imageUrl);
    const pathParam = url.pathname.split('/o/')[1];
    if (!pathParam) return null;
    
    // Decodifica o path
    const decodedPath = decodeURIComponent(pathParam);
    return decodedPath;
  } catch (error) {
    console.error('Erro ao extrair path da URL:', error);
    return null;
  }
};

export const createBanner = async (bannerData: {
  title: string;
  mainCategoryId: string;
  image: File;
}) => {
  try {
    console.log('Iniciando upload do banner...');
    
    // Converter para WEBP antes do upload
    const webpFile = await convertToWebP(bannerData.image);
    
    // Log do tamanho final para monitoramento
    const sizeMB = webpFile.size / (1024 * 1024);
    console.log(`Tamanho final da imagem WEBP: ${sizeMB.toFixed(2)}MB`);
    
    // 1. Gera caminho único para a imagem (agora .webp)
    const storagePath = `banners/${Date.now()}_banner.webp`;
    const storageRef = ref(storage, storagePath);
    
    // 2. Faz upload da imagem
    const uploadTask = await uploadBytes(storageRef, webpFile);
    console.log('Upload realizado com sucesso:', uploadTask);
    
    // 3. Obtém URL pública
    const imageUrl = await getDownloadURL(uploadTask.ref);
    console.log('URL obtida:', imageUrl);

    // 4. Cria documento no Firestore
    const docRef = await addDoc(bannersCollection, {
      title: bannerData.title,
      subcategoryId: bannerData.mainCategoryId,
      image: imageUrl,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('Banner criado com ID:', docRef.id);
    return docRef.id;

  } catch (error: any) {
    console.error('Erro detalhado:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    throw new Error(`Falha ao criar banner: ${error.message}`);
  }
};

export const getAllBanners = async (): Promise<Banner[]> => {
  try {
    console.log('Buscando todos os banners...');
    const q = query(
      bannersCollection,
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const banners = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data()
    } as Banner));
    
    console.log(`${banners.length} banners encontrados`);
    return banners;
  } catch (error: any) {
    console.error('Erro ao buscar banners:', error);
    throw new Error(`Erro ao carregar banners: ${error.message}`);
  }
};

export const updateBanner = async (
  bannerId: string, 
  updateData: {
    title?: string;
    subcategoryId?: string;
    image?: File;
    isActive?: boolean;
  }
): Promise<void> => {
  try {
    console.log('Iniciando atualização do banner:', bannerId);
    
    const bannerRef = doc(db, 'banners', bannerId);
    const updateFields: any = {
      updatedAt: serverTimestamp()
    };

    // Se há uma nova imagem, faz upload
    if (updateData.image) {
      // Primeiro, busca o banner atual para obter a URL da imagem antiga
      const currentDoc = await getDoc(bannerRef);
      if (currentDoc.exists()) {
        const currentData = currentDoc.data();
        const oldImageUrl = currentData.image;

        // Converter para WEBP antes do upload
        const webpFile = await convertToWebP(updateData.image);
        
        // Log do tamanho final para monitoramento
        const sizeMB = webpFile.size / (1024 * 1024);
        console.log(`Tamanho final da imagem WEBP: ${sizeMB.toFixed(2)}MB`);

        // Faz upload da nova imagem (agora .webp)
        const storagePath = `banners/${Date.now()}_banner.webp`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = await uploadBytes(storageRef, webpFile);
        const newImageUrl = await getDownloadURL(uploadTask.ref);
        
        updateFields.image = newImageUrl;

        // Tenta excluir a imagem antiga
        if (oldImageUrl) {
          const oldImagePath = extractImagePathFromUrl(oldImageUrl);
          try {
            if (oldImagePath) {
              const oldImageRef = ref(storage, oldImagePath);
              await deleteObject(oldImageRef);
              console.log('Imagem antiga excluída com sucesso:', oldImagePath);
            }
          } catch (error: any) {
            // Ignora o erro se o arquivo não existir
            if (error.code !== 'storage/object-not-found') {
              console.error('Erro ao excluir imagem antiga:', error);
            } else {
              console.log('Imagem antiga já não existe no storage:', oldImagePath);
            }
          }
        }
      }
    }

    // Atualiza os campos fornecidos
    if (updateData.title !== undefined) {
      updateFields.title = updateData.title;
    }

    if (updateData.subcategoryId !== undefined) {
      updateFields.subcategoryId = updateData.subcategoryId;
    }

    if (updateData.isActive !== undefined) {
      updateFields.isActive = updateData.isActive;
    }

    await updateDoc(bannerRef, updateFields);
    console.log('Banner atualizado com sucesso');
  } catch (error: any) {
    console.error('Erro ao atualizar banner:', error);
    throw new Error(`Erro ao atualizar banner: ${error.message}`);
  }
};

export const deleteBanner = async (bannerId: string): Promise<void> => {
  try {
    console.log('Iniciando exclusão do banner:', bannerId);
    
    // Primeiro, busca o banner para obter a URL da imagem
    const bannerDoc = await getDoc(doc(db, 'banners', bannerId));
    if (!bannerDoc.exists()) {
      throw new Error('Banner não encontrado');
    }

    const bannerData = bannerDoc.data();
    const imageUrl = bannerData.image;

    // Se houver uma imagem, tenta excluí-la do Storage
    if (imageUrl) {
      const imagePath = extractImagePathFromUrl(imageUrl);
      try {
        if (imagePath) {
          console.log('Tentando excluir arquivo:', imagePath);

          // Cria a referência e exclui a imagem
          const imageRef = ref(storage, imagePath);
          await deleteObject(imageRef);
          console.log('Imagem excluída com sucesso:', imagePath);
        } else {
          console.warn('Não foi possível extrair o caminho da imagem da URL:', imageUrl);
        }
      } catch (error: any) {
        // Ignora o erro se o arquivo não existir
        if (error.code !== 'storage/object-not-found') {
          console.error('Erro ao excluir imagem do banner:', error);
        } else {
          console.log('Imagem já não existe no storage:', imagePath);
        }
      }
    }

    // Por fim, exclui o documento do banner
    await deleteDoc(doc(db, 'banners', bannerId));
    console.log('Banner excluído com sucesso do Firestore');
  } catch (error: any) {
    console.error('Erro ao excluir banner:', error);
    throw new Error(`Erro ao excluir banner: ${error.message}`);
  }
}; 