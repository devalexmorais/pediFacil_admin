import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Seller {
  id: string;
  email: string;
  name: string;
  phone: string;
  cityId: string;
  districtId: string;
  street: string;
  number: string;
  complement: string;
  mainCategoryId: string;
  subCategoryId: string;
  storeName: string;
  cnpj_or_cpf: string;
  logo: string | null;
  coverImage: string | null;
  isOpen: boolean;
  isBlocked: boolean;
  minimumOrderValue: string;
  isPremium: boolean;
  rating: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  allowsPickup: boolean;
  openingHours: string | null;
  estimated_delivery_time: string | null;
  _count: {
    products: number;
    orders: number;
    reviews: number;
  };
}

const sellersCollection = collection(db, 'sellers');

export const getAllSellers = async (): Promise<Seller[]> => {
  try {
    const snapshot = await getDocs(sellersCollection);
    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt || Timestamp.now(),
      updatedAt: doc.data().updatedAt || Timestamp.now(),
      _count: doc.data()._count || { products: 0, orders: 0, reviews: 0 }
    } as Seller));
  } catch (error) {
    console.error('Erro ao buscar estabelecimentos:', error);
    throw new Error('Erro ao carregar estabelecimentos');
  }
};

export const getSellerById = async (sellerId: string): Promise<Seller | null> => {
  try {
    const sellerRef = doc(db, 'sellers', sellerId);
    const sellerDoc = await getDoc(sellerRef);

    if (!sellerDoc.exists()) {
      return null;
    }

    return {
      id: sellerDoc.id,
      ...sellerDoc.data(),
      createdAt: sellerDoc.data().createdAt || Timestamp.now(),
      updatedAt: sellerDoc.data().updatedAt || Timestamp.now(),
      _count: sellerDoc.data()._count || { products: 0, orders: 0, reviews: 0 }
    } as Seller;
  } catch (error) {
    console.error('Erro ao buscar estabelecimento:', error);
    throw new Error('Erro ao carregar estabelecimento');
  }
};

export const toggleSellerBlock = async (sellerId: string, currentStatus: boolean): Promise<void> => {
  try {
    const sellerRef = doc(db, 'sellers', sellerId);
    await updateDoc(sellerRef, {
      isBlocked: !currentStatus,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Erro ao alterar status do estabelecimento:', error);
    throw new Error('Erro ao alterar status do estabelecimento');
  }
}; 