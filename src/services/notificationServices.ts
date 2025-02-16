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
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'PROMOTION' | 'ORDER_STATUS' | 'SYSTEM';
  recipientId: string;
  recipientType: 'CUSTOMER' | 'SELLER' | 'ALL';
  read: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  orderId?: string;
  couponCode?: string;
}

const notificationsCollection = collection(db, 'notifications');

export const createNotification = async (notificationData: Omit<Notification, 'id' | 'read' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(notificationsCollection, {
      ...notificationData,
      read: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    throw new Error('Erro ao criar notificação');
  }
};

export const getNotificationById = async (notificationId: string): Promise<Notification | null> => {
  try {
    const notificationDoc = await getDoc(doc(db, 'notifications', notificationId));
    if (!notificationDoc.exists()) {
      return null;
    }
    return { id: notificationDoc.id, ...notificationDoc.data() } as Notification;
  } catch (error) {
    console.error('Erro ao buscar notificação:', error);
    throw new Error('Erro ao buscar notificação');
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    throw new Error('Erro ao atualizar notificação');
  }
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (error) {
    console.error('Erro ao excluir notificação:', error);
    throw new Error('Erro ao excluir notificação');
  }
};

export const getNotificationsByUser = async (userId: string): Promise<Notification[]> => {
  try {
    const q = query(
      notificationsCollection,
      where('recipientId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data()
    } as Notification));
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    throw new Error('Erro ao carregar notificações');
  }
};

export const getUnreadNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const q = query(
      notificationsCollection,
      where('recipientId', '==', userId),
      where('read', '==', false),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data()
    } as Notification));
  } catch (error) {
    console.error('Erro ao buscar notificações não lidas:', error);
    throw new Error('Erro ao carregar notificações');
  }
};

export const createPromotionalNotification = async (title: string, message: string, couponCode?: string): Promise<void> => {
  try {
    await createNotification({
      title,
      message,
      type: 'PROMOTION',
      recipientType: 'ALL',
      recipientId: 'ALL',
      couponCode
    });
  } catch (error) {
    console.error('Erro ao criar notificação promocional:', error);
    throw new Error('Erro ao criar notificação');
  }
};

export const createOrderStatusNotification = async (
  recipientId: string,
  recipientType: 'CUSTOMER' | 'SELLER',
  orderId: string,
  title: string,
  message: string
): Promise<void> => {
  try {
    await createNotification({
      title,
      message,
      type: 'ORDER_STATUS',
      recipientType,
      recipientId,
      orderId
    });
  } catch (error) {
    console.error('Erro ao criar notificação de pedido:', error);
    throw new Error('Erro ao criar notificação');
  }
}; 