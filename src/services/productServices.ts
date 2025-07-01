import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface ProductVariation {
  id: string;
  productId: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
}

export interface ProductOption {
  id: string;
  productId: string;
  name: string;
  additionalPrice: number;
  isRequired: boolean;
  maxChoices: number;
}

export interface Product {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isActive: boolean;
  isPromotion: boolean;
  promotionalPrice: number | null;
  categoryId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  variations?: ProductVariation[];
  options?: ProductOption[];
}

const productsCollection = collection(db, 'products');

export const createProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(productsCollection, {
      ...productData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    throw new Error('Erro ao criar produto');
  }
};

export const getProductById = async (productId: string): Promise<Product | null> => {
  try {
    const productDoc = await getDoc(doc(db, 'products', productId));
    if (!productDoc.exists()) {
      return null;
    }
    return { id: productDoc.id, ...productDoc.data() } as Product;
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    throw new Error('Erro ao buscar produto');
  }
};

export const updateProduct = async (productId: string, productData: Partial<Product>): Promise<void> => {
  try {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      ...productData,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    throw new Error('Erro ao atualizar produto');
  }
};

export const deleteProduct = async (productId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    throw new Error('Erro ao excluir produto');
  }
};

export const getProductsBySeller = async (sellerId: string): Promise<Product[]> => {
  try {
    const q = query(
      productsCollection, 
      where('sellerId', '==', sellerId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data()
    } as Product));
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    throw new Error('Erro ao carregar produtos');
  }
};

export const getPromotionalProducts = async (limit: number = 10): Promise<Product[]> => {
  try {
    const q = query(
      productsCollection,
      where('isActive', '==', true),
      where('isPromotion', '==', true),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data()
    } as Product));
  } catch (error) {
    console.error('Erro ao buscar produtos em promoção:', error);
    throw new Error('Erro ao carregar produtos');
  }
};

export const getProductsByCategory = async (categoryId: string): Promise<Product[]> => {
  try {
    const q = query(
      productsCollection,
      where('categoryId', '==', categoryId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data()
    } as Product));
  } catch (error) {
    console.error('Erro ao buscar produtos por categoria:', error);
    throw new Error('Erro ao carregar produtos');
  }
}; 