import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
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

export const createBanner = async (bannerData: {
  title: string;
  mainCategoryId: string;
  image: File;
}) => {
  try {
    console.log('Iniciando upload...');
    
    // 1. Gera caminho único para a imagem
    const storagePath = `banners/${Date.now()}_${bannerData.image.name}`;
    const storageRef = ref(storage, storagePath);
    
    // 2. Faz upload da imagem
    const uploadTask = await uploadBytes(storageRef, bannerData.image);
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
      try {
        // Extrai o nome do arquivo da URL
        const urlParts = imageUrl.split('/');
        const fileNameWithParams = urlParts[urlParts.length - 1];
        const fileName = fileNameWithParams.split('?')[0];
        
        // Monta o caminho completo para o arquivo no storage
        const storagePath = `banners/${fileName}`;
        console.log('Tentando excluir arquivo:', storagePath);

        // Cria a referência e exclui a imagem
        const imageRef = ref(storage, storagePath);
        await deleteObject(imageRef);
        console.log('Imagem excluída com sucesso:', storagePath);
      } catch (error: any) {
        console.error('Erro ao excluir imagem do banner:', error);
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