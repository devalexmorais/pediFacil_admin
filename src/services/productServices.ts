import { 
  collection, 
  getDocs, 
  query, 
  where,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Product {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  price: string;
  image: string;
  isActive: boolean;
  isPromotion: boolean;
  promotionalPrice: string | null;
  category: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  variations?: {
    id: string;
    productId: string;
    name: string;
    description: string;
    price: string;
    isAvailable: boolean;
  }[];
  options?: {
    id: string;
    productId: string;
    name: string;
    additionalPrice: string;
    isRequired: boolean;
    maxChoices: number;
  }[];
}

const productsCollection = collection(db, 'products');

export const getProductsBySeller = async (sellerId: string): Promise<Product[]> => {
  try {
    const q = query(productsCollection, where('sellerId', '==', sellerId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt || Timestamp.now(),
      updatedAt: doc.data().updatedAt || Timestamp.now()
    } as Product));
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    throw new Error('Erro ao carregar produtos');
  }
}; 