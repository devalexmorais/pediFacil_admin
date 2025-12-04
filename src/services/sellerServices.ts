import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { auth } from '../config/firebase';

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

export const getAllSellers = async (): Promise<Seller[]> => {
  try {
    const partnersRef = collection(db, 'partners');
    const snapshot = await getDocs(partnersRef);
    
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      
      // Usando a abordagem manual para garantir que temos um booleano correto
      const finalIsOpen = data.isOpen ? true : false;
      
      return {
        id: doc.id,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        // Verificar se os dados estão em address.* ou diretamente nos campos
        street: data.address?.street || data.street || '',
        number: data.address?.number || data.number || '',
        complement: data.address?.complement || data.complement || '',
        neighborhood: data.address?.neighborhoodName || data.neighborhoodName || data.neighborhood || '',
        city: data.address?.cityName || data.cityName || data.city || '',
        state: data.address?.stateName || data.stateName || data.state || '',
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
        isOpen: finalIsOpen,
        status: data.status || 'pending',
        role: data.role || 'partner',
        createdAt: data.createdAt || Timestamp.now(),
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
    
    // Usando a mesma abordagem manual
    const finalIsOpen = data.isOpen ? true : false;

    return {
      id: sellerDoc.id,
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      // Verificar se os dados estão em address.* ou diretamente nos campos
      street: data.address?.street || data.street || '',
      number: data.address?.number || data.number || '',
      complement: data.address?.complement || data.complement || '',
      neighborhood: data.address?.neighborhoodName || data.neighborhoodName || data.neighborhood || '',
      city: data.address?.cityName || data.cityName || data.city || '',
      state: data.address?.stateName || data.stateName || data.state || '',
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
        isOpen: finalIsOpen,
        status: data.status || 'pending',
        role: data.role || 'partner',
        createdAt: data.createdAt || Timestamp.now(),
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

    // Verifica se o usuário é admin na coleção admin
    const adminDoc = await getDoc(doc(db, 'admin', currentUser.uid));
    console.log('Dados do admin:', JSON.stringify(adminDoc.data(), null, 2));

    if (!adminDoc.exists()) {
      console.error('Documento do admin não encontrado');
      throw new Error('Permissão negada: admin não encontrado');
    }

    const adminData = adminDoc.data();
    if (adminData.role !== 'ADMIN') {
      console.error('Usuário não é admin. Role atual:', adminData.role);
      throw new Error('Permissão negada: apenas administradores podem realizar esta ação');
    }

    const sellerRef = doc(db, 'partners', sellerId);
    const newIsActive = !currentStatus;
    
    const updateData: any = {
      isActive: newIsActive,
      lastUpdated: new Date().toISOString()
    };

    // Se estiver bloqueando o estabelecimento (newIsActive = false), também fecha o estabelecimento
    if (!newIsActive) {
      updateData.isOpen = false;
      console.log('Bloqueando estabelecimento - definindo isOpen como false');
    }

    console.log('Dados que serão atualizados:', updateData);
    console.log('Status atual:', currentStatus, '-> Novo isActive:', newIsActive);

    await updateDoc(sellerRef, updateData);
  } catch (error) {
    console.error('Erro ao alterar status do estabelecimento:', error);
    throw error;
  }
}; 