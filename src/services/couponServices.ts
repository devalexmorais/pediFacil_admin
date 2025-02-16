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
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  increment
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Coupon {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  validUntil: Timestamp;
  maxUses: number;
  useCount: number;
  minOrderValue: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const couponsCollection = collection(db, 'coupons');

export const createCoupon = async (couponData: Omit<Coupon, 'id' | 'useCount' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(couponsCollection, {
      ...couponData,
      useCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Erro ao criar cupom:', error);
    throw new Error('Erro ao criar cupom');
  }
};

export const getCouponById = async (couponId: string): Promise<Coupon | null> => {
  try {
    const couponDoc = await getDoc(doc(db, 'coupons', couponId));
    if (!couponDoc.exists()) {
      return null;
    }
    return { id: couponDoc.id, ...couponDoc.data() } as Coupon;
  } catch (error) {
    console.error('Erro ao buscar cupom:', error);
    throw new Error('Erro ao buscar cupom');
  }
};

export const getCouponByCode = async (code: string): Promise<Coupon | null> => {
  try {
    const q = query(couponsCollection, where('code', '==', code.toUpperCase()));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    const couponDoc = snapshot.docs[0];
    return { id: couponDoc.id, ...couponDoc.data() } as Coupon;
  } catch (error) {
    console.error('Erro ao buscar cupom por código:', error);
    throw new Error('Erro ao buscar cupom');
  }
};

export const updateCoupon = async (couponId: string, couponData: Partial<Coupon>): Promise<void> => {
  try {
    const couponRef = doc(db, 'coupons', couponId);
    await updateDoc(couponRef, {
      ...couponData,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Erro ao atualizar cupom:', error);
    throw new Error('Erro ao atualizar cupom');
  }
};

export const deleteCoupon = async (couponId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'coupons', couponId));
  } catch (error) {
    console.error('Erro ao excluir cupom:', error);
    throw new Error('Erro ao excluir cupom');
  }
};

export const getAllCoupons = async (): Promise<Coupon[]> => {
  try {
    const q = query(
      couponsCollection,
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data()
    } as Coupon));
  } catch (error) {
    console.error('Erro ao buscar cupons:', error);
    throw new Error('Erro ao carregar cupons');
  }
};

export const getActiveCoupons = async (): Promise<Coupon[]> => {
  try {
    const now = Timestamp.now();
    const q = query(
      couponsCollection,
      where('isActive', '==', true),
      where('validUntil', '>', now),
      orderBy('validUntil', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data()
    } as Coupon));
  } catch (error) {
    console.error('Erro ao buscar cupons ativos:', error);
    throw new Error('Erro ao carregar cupons');
  }
};

export const validateCoupon = async (code: string, orderValue: number): Promise<Coupon> => {
  try {
    const coupon = await getCouponByCode(code);
    
    if (!coupon) {
      throw new Error('Cupom não encontrado');
    }

    if (!coupon.isActive) {
      throw new Error('Cupom inativo');
    }

    if (coupon.validUntil.toDate() < new Date()) {
      throw new Error('Cupom expirado');
    }

    if (coupon.useCount >= coupon.maxUses) {
      throw new Error('Cupom atingiu o limite máximo de usos');
    }

    if (orderValue < coupon.minOrderValue) {
      throw new Error(`Valor mínimo do pedido deve ser R$ ${coupon.minOrderValue.toFixed(2)}`);
    }

    return coupon;
  } catch (error) {
    console.error('Erro ao validar cupom:', error);
    throw error;
  }
};

export const useCoupon = async (couponId: string): Promise<void> => {
  try {
    const couponRef = doc(db, 'coupons', couponId);
    await updateDoc(couponRef, {
      useCount: increment(1),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Erro ao usar cupom:', error);
    throw new Error('Erro ao usar cupom');
  }
}; 