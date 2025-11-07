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

export interface Advertisement {
  id: string;
  image: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const advertisementsCollection = collection(db, 'advertisements');

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
    console.error('Erro ao extrair path da imagem:', error);
    return null;
  }
};

export const createAdvertisement = async (advertisementData: {
  image: File;
  isActive?: boolean;
}) => {
  try {
    console.log('Iniciando upload do advertisement...');
    
    // 1. Gera caminho único para a imagem
    const storagePath = `advertisements/${Date.now()}_${advertisementData.image.name}`;
    const storageRef = ref(storage, storagePath);
    
    // 2. Faz upload da imagem
    const uploadTask = await uploadBytes(storageRef, advertisementData.image);
    console.log('Upload realizado com sucesso:', uploadTask);
    
    // 3. Obtém URL pública
    const imageUrl = await getDownloadURL(uploadTask.ref);
    console.log('URL obtida:', imageUrl);

    // 4. Cria documento no Firestore
    const docRef = await addDoc(advertisementsCollection, {
      image: imageUrl,
      isActive: advertisementData.isActive ?? true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('Advertisement criado com ID:', docRef.id);
    return docRef.id;

  } catch (error: any) {
    console.error('Erro detalhado:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    throw new Error(`Falha ao criar advertisement: ${error.message}`);
  }
};

export const getAllAdvertisements = async (): Promise<Advertisement[]> => {
  try {
    console.log('Buscando todos os advertisements...');
    const q = query(
      advertisementsCollection,
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const advertisements = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data()
    } as Advertisement));
    
    console.log(`${advertisements.length} advertisements encontrados`);
    return advertisements;
  } catch (error: any) {
    console.error('Erro ao buscar advertisements:', error);
    throw new Error(`Erro ao carregar advertisements: ${error.message}`);
  }
};

export const updateAdvertisement = async (
  advertisementId: string, 
  updateData: {
    image?: File;
    isActive?: boolean;
  }
): Promise<void> => {
  try {
    console.log('Iniciando atualização do advertisement:', advertisementId);
    
    const advertisementRef = doc(db, 'advertisements', advertisementId);
    const updateFields: any = {
      updatedAt: serverTimestamp()
    };

    // Se há uma nova imagem, faz upload
    if (updateData.image) {
      // Primeiro, busca o advertisement atual para obter a URL da imagem antiga
      const currentDoc = await getDoc(advertisementRef);
      if (currentDoc.exists()) {
        const currentData = currentDoc.data();
        const oldImageUrl = currentData.image;

        // Faz upload da nova imagem
        const storagePath = `advertisements/${Date.now()}_${updateData.image.name}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = await uploadBytes(storageRef, updateData.image);
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

    // Atualiza o status se fornecido
    if (updateData.isActive !== undefined) {
      updateFields.isActive = updateData.isActive;
    }

    await updateDoc(advertisementRef, updateFields);
    console.log('Advertisement atualizado com sucesso');
  } catch (error: any) {
    console.error('Erro ao atualizar advertisement:', error);
    throw new Error(`Erro ao atualizar advertisement: ${error.message}`);
  }
};

export const deleteAdvertisement = async (advertisementId: string): Promise<void> => {
  try {
    console.log('Iniciando exclusão do advertisement:', advertisementId);
    
    // Primeiro, busca o advertisement para obter a URL da imagem
    const advertisementDoc = await getDoc(doc(db, 'advertisements', advertisementId));
    if (!advertisementDoc.exists()) {
      throw new Error('Advertisement não encontrado');
    }

    const advertisementData = advertisementDoc.data();
    const imageUrl = advertisementData.image;

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
        }
      } catch (error: any) {
        // Ignora o erro se o arquivo não existir
        if (error.code !== 'storage/object-not-found') {
          console.error('Erro ao excluir imagem do advertisement:', error);
        } else {
          console.log('Imagem já não existe no storage:', imagePath);
        }
      }
    }

    // Por fim, exclui o documento do advertisement
    await deleteDoc(doc(db, 'advertisements', advertisementId));
    console.log('Advertisement excluído com sucesso do Firestore');
  } catch (error: any) {
    console.error('Erro ao excluir advertisement:', error);
    throw new Error(`Erro ao excluir advertisement: ${error.message}`);
  }
}; 