import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  variations: string[];
  options: string[];
  notes: string;
}

export interface OrderAddress {
  cityId: string;
  districtId: string;
  street: string;
  number: string;
  complement: string;
}

export interface Order {
  id: string;
  customerId: string;
  sellerId: string;
  items: OrderItem[];
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';
  total: number;
  deliveryFee: number;
  address: OrderAddress;
  paymentMethod: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const ordersCollection = collection(db, 'orders');

export const createOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(ordersCollection, {
      ...orderData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    throw new Error('Erro ao criar pedido');
  }
};

export const getOrderById = async (orderId: string): Promise<Order | null> => {
  try {
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (!orderDoc.exists()) {
      return null;
    }
    return { id: orderDoc.id, ...orderDoc.data() } as Order;
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    throw new Error('Erro ao buscar pedido');
  }
};

export const updateOrderStatus = async (orderId: string, status: Order['status']): Promise<void> => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    throw new Error('Erro ao atualizar status do pedido');
  }
};

export const getOrdersByCustomer = async (customerId: string): Promise<Order[]> => {
  try {
    const q = query(
      ordersCollection, 
      where('customerId', '==', customerId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data()
    } as Order));
  } catch (error) {
    console.error('Erro ao buscar pedidos do cliente:', error);
    throw new Error('Erro ao carregar pedidos');
  }
};

export const getOrdersBySeller = async (sellerId: string): Promise<Order[]> => {
  try {
    const q = query(
      ordersCollection, 
      where('sellerId', '==', sellerId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data()
    } as Order));
  } catch (error) {
    console.error('Erro ao buscar pedidos do estabelecimento:', error);
    throw new Error('Erro ao carregar pedidos');
  }
};

export const getOrdersByStatus = async (status: Order['status']): Promise<Order[]> => {
  try {
    const q = query(
      ordersCollection, 
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data()
    } as Order));
  } catch (error) {
    console.error('Erro ao buscar pedidos por status:', error);
    throw new Error('Erro ao carregar pedidos');
  }
}; 