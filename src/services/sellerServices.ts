import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  query,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { auth } from '../config/firebase';
import { getUserById } from './userServices';

export interface Seller {
  id: string;
  name: string;
  email: string;
  phone: string;
  // Endereço
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  // Informações da loja
  store: {
    name: string;
    category: string;
    subcategory: string;
    document: string;
    isPremium: boolean;
    premiumExpiresAt: null | Timestamp;
  };
  // Configurações
  settings: {
    delivery: {
      maxTime: string;
      minTime: string;
      minimumOrderAmount: number;
    };
    pickup: {
      enabled: boolean;
      estimatedTime: string;
    };
    schedule: {
      [key: string]: {
        closeTime: string;
        openTime: string;
        isOpen: boolean;
      };
    };
    paymentOptions: {
      cardFlags: Array<{
        name: string;
        enabled: boolean;
        fee: string;
      }>;
    };
  };
  // Recursos premium
  premiumFeatures: {
    advancedReports: boolean;
    analytics: boolean;
    prioritySupport: boolean;
  };
  // Status e datas
  isActive: boolean;
  isOpen: boolean;
  status: string;
  role: string;
  createdAt: Timestamp;
  lastUpdated: string;
}

const getLocationName = async (collectionName: string, id: string): Promise<string> => {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().name || '';
    }
    return '';
  } catch (error) {
    console.error(`Erro ao buscar ${collectionName}:`, error);
    return '';
  }
};

export const getAllSellers = async (): Promise<Seller[]> => {
  try {
    const partnersRef = collection(db, 'partners');
    const snapshot = await getDocs(partnersRef);
    
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        street: data.street || '',
        number: data.number || '',
        complement: data.complement || '',
        neighborhood: data.neighborhood || '',
        city: data.city || '',
        state: data.state || '',
        store: {
          name: data.store?.name || '',
          category: data.store?.category || '',
          subcategory: data.store?.subcategory || '',
          document: data.store?.document || '',
          isPremium: data.store?.isPremium || false,
          premiumExpiresAt: data.store?.premiumExpiresAt || null
        },
        settings: {
          delivery: {
            maxTime: data.settings?.delivery?.maxTime || '45',
            minTime: data.settings?.delivery?.minTime || '30',
            minimumOrderAmount: data.settings?.delivery?.minimumOrderAmount || 0
          },
          pickup: {
            enabled: data.settings?.pickup?.enabled || false,
            estimatedTime: data.settings?.pickup?.estimatedTime || '15'
          },
          schedule: data.settings?.schedule || {},
          paymentOptions: {
            cardFlags: data.settings?.paymentOptions?.cardFlags || []
          }
        },
        premiumFeatures: {
          advancedReports: data.premiumFeatures?.advancedReports || false,
          analytics: data.premiumFeatures?.analytics || false,
          prioritySupport: data.premiumFeatures?.prioritySupport || false
        },
        isActive: data.isActive || false,
        isOpen: data.isOpen || false,
        status: data.status || 'pending',
        role: data.role || 'partner',
        createdAt: data.createdAt,
        lastUpdated: data.lastUpdated || ''
      };
    });
  } catch (error) {
    console.error('Erro ao buscar estabelecimentos:', error);
    throw error;
  }
};

export const getSellerById = async (id: string): Promise<Seller | null> => {
  try {
    const sellerRef = doc(db, 'partners', id);
    const sellerDoc = await getDoc(sellerRef);

    if (!sellerDoc.exists()) {
      return null;
    }

    const data = sellerDoc.data();

    return {
      id: sellerDoc.id,
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      street: data.street || '',
      number: data.number || '',
      complement: data.complement || '',
      neighborhood: data.neighborhood || '',
      city: data.city || '',
      state: data.state || '',
      store: {
        name: data.store?.name || '',
        category: data.store?.category || '',
        subcategory: data.store?.subcategory || '',
        document: data.store?.document || '',
        isPremium: data.store?.isPremium || false,
        premiumExpiresAt: data.store?.premiumExpiresAt || null
      },
      settings: {
        delivery: {
          maxTime: data.settings?.delivery?.maxTime || '45',
          minTime: data.settings?.delivery?.minTime || '30',
          minimumOrderAmount: data.settings?.delivery?.minimumOrderAmount || 0
        },
        pickup: {
          enabled: data.settings?.pickup?.enabled || false,
          estimatedTime: data.settings?.pickup?.estimatedTime || '15'
        },
        schedule: data.settings?.schedule || {},
        paymentOptions: {
          cardFlags: data.settings?.paymentOptions?.cardFlags || []
        }
      },
      premiumFeatures: {
        advancedReports: data.premiumFeatures?.advancedReports || false,
        analytics: data.premiumFeatures?.analytics || false,
        prioritySupport: data.premiumFeatures?.prioritySupport || false
      },
      isActive: data.isActive || false,
      isOpen: data.isOpen || false,
      status: data.status || 'pending',
      role: data.role || 'partner',
      createdAt: data.createdAt,
      lastUpdated: data.lastUpdated || ''
    };
  } catch (error) {
    console.error('Erro ao buscar estabelecimento:', error);
    throw error;
  }
};

export const toggleSellerBlock = async (sellerId: string, currentStatus: boolean): Promise<void> => {
  try {
    // Verifica se o usuário está autenticado
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('Usuário não autenticado');
      throw new Error('Usuário não autenticado');
    }

    console.log('ID do usuário atual:', currentUser.uid);

    // Verifica se o usuário é admin
    const userDoc = await getUserById(currentUser.uid);
    console.log('Dados do usuário:', JSON.stringify(userDoc, null, 2));

    if (!userDoc) {
      console.error('Documento do usuário não encontrado');
      throw new Error('Permissão negada: usuário não encontrado');
    }

    if (userDoc.role !== 'ADMIN') {
      console.error('Usuário não é admin. Role atual:', userDoc.role);
      throw new Error('Permissão negada: apenas administradores podem realizar esta ação');
    }

    const sellerRef = doc(db, 'partners', sellerId);
    await updateDoc(sellerRef, {
      isActive: !currentStatus,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao alterar status do estabelecimento:', error);
    throw error;
  }
}; 