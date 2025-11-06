import { 
  collection, 
  addDoc, 
  Timestamp,
  writeBatch,
  doc,
  getDocs,
  query,
  orderBy,
  limit,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export interface Notification {
  id?: string;
  title: string;
  body: string;
  createdAt: Timestamp;
  read: boolean;
  status: 'pending' | 'sent' | 'delivered' | 'read';
  deliveryMethod: 'fcm' | 'admin';
  tokenType: 'fcm' | 'admin';
  data?: {
    [key: string]: any;
  };
  userId?: string;
}

export interface SendNotificationParams {
  recipientId: string;
  title: string;
  body: string;
  data?: {
    [key: string]: any;
  };
}

export interface SendBulkNotificationParams {
  recipientIds: string[];
  title: string;
  body: string;
  data?: {
    [key: string]: any;
  };
}

/**
 * Envia uma notificação para um único destinatário
 */
export const sendNotification = async (params: SendNotificationParams): Promise<void> => {
  try {
    const { recipientId, title, body, data = {} } = params;

    const notificationData: Omit<Notification, 'id'> = {
      title,
      body,
      createdAt: Timestamp.now(),
      read: false,
      status: 'pending',
      deliveryMethod: 'admin',
      tokenType: 'admin',
      data: {
        ...data,
        type: 'admin_notification',
        sentBy: 'admin'
      },
      userId: recipientId
    };

    // Adiciona na coleção de notificações do parceiro
    const notificationsRef = collection(db, 'partners', recipientId, 'notifications');
    await addDoc(notificationsRef, notificationData);

    // Adiciona no histórico do admin (subcoleção)
    const currentUser = auth.currentUser;
    if (currentUser) {
      const adminNotificationsRef = collection(db, 'admin', currentUser.uid, 'sentNotifications');
      await addDoc(adminNotificationsRef, {
        ...notificationData,
        recipientId,
        sentAt: Timestamp.now()
      });
    }

  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    throw error;
  }
};

/**
 * Envia notificações em massa para múltiplos destinatários
 */
export const sendBulkNotification = async (params: SendBulkNotificationParams): Promise<void> => {
  try {
    const { recipientIds, title, body, data = {} } = params;

    // Firebase tem limite de 500 operações por batch
    const BATCH_SIZE = 500;
    const batches: any[] = [];

    for (let i = 0; i < recipientIds.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchRecipients = recipientIds.slice(i, i + BATCH_SIZE);

      for (const recipientId of batchRecipients) {
        const notificationData: Omit<Notification, 'id'> = {
          title,
          body,
          createdAt: Timestamp.now(),
          read: false,
          status: 'pending',
          deliveryMethod: 'admin',
          tokenType: 'admin',
          data: {
            ...data,
            type: 'admin_notification',
            sentBy: 'admin'
          },
          userId: recipientId
        };

        // Adiciona na coleção de notificações do parceiro
        const notificationRef = doc(collection(db, 'partners', recipientId, 'notifications'));
        batch.set(notificationRef, notificationData);
      }

      batches.push(batch);
    }

    // Executa todos os batches
    await Promise.all(batches.map(batch => batch.commit()));

    // Adiciona um registro no histórico do admin (subcoleção)
    const currentUser = auth.currentUser;
    if (currentUser) {
      const adminNotificationsRef = collection(db, 'admin', currentUser.uid, 'sentNotifications');
      await addDoc(adminNotificationsRef, {
        title,
        body,
        recipientCount: recipientIds.length,
        recipientIds: recipientIds.slice(0, 100), // Salva apenas os primeiros 100 IDs por limite de tamanho
        sentAt: Timestamp.now(),
        sentBy: 'admin',
        status: 'sent',
        deliveryMethod: 'admin'
      });
    }

  } catch (error) {
    console.error('Erro ao enviar notificações em massa:', error);
    throw error;
  }
};

/**
 * Busca o histórico de notificações enviadas pelo admin
 */
export const getSentNotificationsHistory = async (limitCount: number = 50) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }

    const notificationsRef = collection(db, 'admin', currentUser.uid, 'sentNotifications');
    const q = query(notificationsRef, orderBy('sentAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Erro ao buscar histórico de notificações:', error);
    throw error;
  }
};

/**
 * Exclui uma notificação do histórico do admin
 */
export const deleteNotificationFromHistory = async (notificationId: string): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }

    const notificationRef = doc(db, 'admin', currentUser.uid, 'sentNotifications', notificationId);
    await deleteDoc(notificationRef);
  } catch (error) {
    console.error('Erro ao excluir notificação do histórico:', error);
    throw error;
  }
};


