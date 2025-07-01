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
  QueryDocumentSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';

export interface Category {
  id: string;
  name: string;
  image: string;
  isActive: boolean;
  parentId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface Subcategory {
  id: string;
  name: string;
  isActive: boolean;
  parentCategoryId: string;
}

const categoriesCollection = collection(db, 'categories');

export const createCategory = async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    console.log('Tentando criar categoria com dados:', categoryData);
    
    const docRef = await addDoc(categoriesCollection, {
      ...categoryData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    console.log('Categoria criada com sucesso. ID:', docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error('Erro detalhado ao criar categoria:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    throw new Error(`Erro ao criar categoria: ${error.message}`);
  }
};

export const getCategoryById = async (categoryId: string): Promise<Category | null> => {
  try {
    console.log('Buscando categoria por ID:', categoryId);
    const categoryDoc = await getDoc(doc(db, 'categories', categoryId));
    
    if (!categoryDoc.exists()) {
      console.log('Categoria não encontrada');
      return null;
    }
    
    const category = { id: categoryDoc.id, ...categoryDoc.data() } as Category;
    console.log('Categoria encontrada:', category);
    return category;
  } catch (error: any) {
    console.error('Erro ao buscar categoria:', error);
    throw new Error(`Erro ao buscar categoria: ${error.message}`);
  }
};

export const updateCategory = async (categoryId: string, categoryData: Partial<Category>): Promise<void> => {
  try {
    console.log('Atualizando categoria:', categoryId, 'com dados:', categoryData);
    const categoryRef = doc(db, 'categories', categoryId);
    await updateDoc(categoryRef, {
      ...categoryData,
      updatedAt: Timestamp.now()
    });
    console.log('Categoria atualizada com sucesso');
  } catch (error: any) {
    console.error('Erro ao atualizar categoria:', error);
    throw new Error(`Erro ao atualizar categoria: ${error.message}`);
  }
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  try {
    console.log('Iniciando exclusão da categoria:', categoryId);
    
    // Primeiro, busca a categoria para obter a URL da imagem
    const categoryDoc = await getDoc(doc(db, 'categories', categoryId));
    if (!categoryDoc.exists()) {
      throw new Error('Categoria não encontrada');
    }

    const categoryData = categoryDoc.data();
    const imageUrl = categoryData.image;

    console.log('Dados da categoria:', categoryData);
    console.log('URL da imagem encontrada:', imageUrl);

    // Excluir todas as subcategorias
    const subcategoriesRef = collection(db, `categories/${categoryId}/subcategories`);
    const subcategoriesQuery = query(subcategoriesRef);
    const subcategoriesSnapshot = await getDocs(subcategoriesQuery);

    // Excluir todas as subcategorias em um batch
    const batch = writeBatch(db);
    subcategoriesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`${subcategoriesSnapshot.size} subcategorias excluídas`);

    // Se houver uma imagem, tenta excluí-la do Storage
    if (imageUrl) {
      try {
        const urlParts = imageUrl.split('/');
        const fileNameWithParams = urlParts[urlParts.length - 1];
        const fileName = fileNameWithParams.split('?')[0];
        
        console.log('Nome do arquivo extraído:', fileName);
        
        const storagePath = `categories/${fileName}`;
        console.log('Tentando excluir arquivo:', storagePath);

        const imageRef = ref(storage, storagePath);
        await deleteObject(imageRef);
        console.log('Imagem excluída com sucesso:', storagePath);
      } catch (error: any) {
        console.error('Erro ao excluir imagem:', {
          error,
          imageUrl,
          message: error.message,
          code: error.code,
          stack: error.stack
        });
      }
    }

    // Por fim, exclui o documento da categoria
    await deleteDoc(doc(db, 'categories', categoryId));
    console.log('Categoria excluída com sucesso do Firestore');
  } catch (error: any) {
    console.error('Erro ao excluir categoria:', error);
    throw new Error(`Erro ao excluir categoria: ${error.message}`);
  }
};

export const getAllCategories = async (): Promise<Category[]> => {
  try {
    console.log('Buscando todas as categorias...');
    const q = query(
      categoriesCollection,
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const categories = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data()
    } as Category));
    
    console.log(`${categories.length} categorias encontradas`);
    return categories;
  } catch (error: any) {
    console.error('Erro detalhado ao buscar categorias:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    throw new Error(`Erro ao carregar categorias: ${error.message}`);
  }
};

export const getMainCategories = async (): Promise<Category[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'categories'));
    
    if (querySnapshot.empty) {
      console.log('Nenhuma categoria encontrada');
      return [];
    }

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      image: doc.data().image || '',
      isActive: doc.data().isActive || true,
      parentId: doc.data().parentId || null,
      createdAt: doc.data().createdAt || Timestamp.now(),
      updatedAt: doc.data().updatedAt || Timestamp.now()
    }));
  } catch (error) {
    console.error('Erro no getMainCategories:', error);
    throw new Error('Não foi possível carregar as categorias');
  }
};

export const createSubcategory = async (subcategoryData: {
  name: string;
  parentCategoryId: string;
  isActive?: boolean;
}) => {
  try {
    const subcategoriesRef = collection(db, `categories/${subcategoryData.parentCategoryId}/subcategories`);
    
    const newSubcategory = {
      name: subcategoryData.name,
      isActive: subcategoryData.isActive ?? true,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(subcategoriesRef, newSubcategory);
    return { id: docRef.id, ...newSubcategory };
  } catch (error) {
    console.error('Erro ao criar subcategoria:', error);
    throw error;
  }
};

export const getSubcategories = async (categoryId: string): Promise<Subcategory[]> => {
  try {
    const subcategoriesRef = collection(db, `categories/${categoryId}/subcategories`);
    const q = query(subcategoriesRef, orderBy('createdAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      parentCategoryId: categoryId
    })) as Subcategory[];
  } catch (error) {
    console.error('Erro ao buscar subcategorias:', error);
    throw error;
  }
};

export const deleteSubcategory = async (categoryId: string, subcategoryId: string) => {
  try {
    const subcategoryRef = doc(db, `categories/${categoryId}/subcategories`, subcategoryId);
    await deleteDoc(subcategoryRef);
  } catch (error) {
    console.error('Erro ao excluir subcategoria:', error);
    throw error;
  }
}; 