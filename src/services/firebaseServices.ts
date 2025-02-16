import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  query,
  where,
  DocumentData,
  QueryDocumentSnapshot,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Interfaces
interface State {
  id: string;
  name: string;
  abbreviation: string;
  isActive: boolean;
}

interface City {
  id: string;
  stateId: string;
  name: string;
  isActive: boolean;
  state?: State;
}

interface District {
  id?: string;
  cityId: string;
  name: string;
  isActive: boolean;
  city?: City;
}

// Collections
const statesCollection = collection(db, 'states');
const citiesCollection = collection(db, 'cities');
const districtsCollection = collection(db, 'districts');
const usersCollection = collection(db, 'users');

// States
export const getStates = async (): Promise<State[]> => {
  const snapshot = await getDocs(statesCollection);
  return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ 
    id: doc.id, 
    ...doc.data() 
  } as State));
};

export const createState = async (state: Omit<State, 'id' | 'isActive'>): Promise<string> => {
  try {
    console.log('Tentando criar estado com dados:', state);
    
    const docRef = await addDoc(statesCollection, {
      ...state,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('Estado criado com sucesso. DocRef:', docRef);
    return docRef.id;
  } catch (error: any) {
    console.error('Erro detalhado ao criar estado:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    throw new Error(`Erro ao criar estado: ${error.message}`);
  }
};

export const deleteState = async (stateId: string): Promise<void> => {
  const citiesQuery = query(citiesCollection, where('stateId', '==', stateId));
  const citiesSnapshot = await getDocs(citiesQuery);
  
  if (!citiesSnapshot.empty) {
    throw new Error(`Não é possível excluir o estado pois existem ${citiesSnapshot.size} cidades vinculadas`);
  }
  
  await deleteDoc(doc(db, 'states', stateId));
};

// Cities
export const getCities = async (): Promise<City[]> => {
  try {
    const snapshot = await getDocs(citiesCollection);
    const cities = await Promise.all(
      snapshot.docs.map(async (cityDoc) => {
        const cityData = cityDoc.data();
        const stateDoc = await getDoc(doc(db, 'states', cityData.stateId));
        const stateData = stateDoc.data();
        
        return {
          id: cityDoc.id,
          ...cityData,
          state: stateData ? {
            id: stateDoc.id,
            ...stateData
          } as State : undefined
        } as City;
      })
    );
    return cities;
  } catch (error: any) {
    console.error('Erro ao buscar cidades:', error);
    throw new Error(`Erro ao buscar cidades: ${error.message}`);
  }
};

export const getCitiesByState = async (stateId: string): Promise<City[]> => {
  try {
    const q = query(citiesCollection, where('stateId', '==', stateId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as City));
  } catch (error: any) {
    console.error('Erro ao buscar cidades do estado:', error);
    throw new Error(`Erro ao buscar cidades do estado: ${error.message}`);
  }
};

export const createCity = async (city: Omit<City, 'id' | 'isActive' | 'state'>): Promise<string> => {
  try {
    const docRef = await addDoc(citiesCollection, {
      ...city,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  } catch (error: any) {
    console.error('Erro ao criar cidade:', error);
    throw new Error(`Erro ao criar cidade: ${error.message}`);
  }
};

export const deleteCity = async (cityId: string): Promise<void> => {
  try {
    // Verifica se existem bairros vinculados
    const districtsQuery = query(districtsCollection, where('cityId', '==', cityId));
    const districtsSnapshot = await getDocs(districtsQuery);
    
    if (!districtsSnapshot.empty) {
      throw new Error(`Não é possível excluir a cidade pois existem ${districtsSnapshot.size} bairros vinculados`);
    }
    
    await deleteDoc(doc(db, 'cities', cityId));
  } catch (error: any) {
    console.error('Erro ao deletar cidade:', error);
    throw new Error(`Erro ao deletar cidade: ${error.message}`);
  }
};

export const toggleCityStatus = async (cityId: string, currentStatus: boolean): Promise<void> => {
  await updateDoc(doc(db, 'cities', cityId), {
    isActive: !currentStatus
  });
};

// Districts
export const getDistricts = async (): Promise<District[]> => {
  try {
    console.log('Iniciando busca de bairros...');
    const snapshot = await getDocs(districtsCollection);
    
    if (snapshot.empty) {
      console.log('Nenhum bairro encontrado');
      return [];
    }

    const districts = await Promise.all(
      snapshot.docs.map(async (districtDoc) => {
        try {
          const districtData = districtDoc.data();
          const districtId = districtDoc.id;
          console.log(`Processando bairro ${districtId}:`, districtData);

          // Validação básica dos dados do bairro
          if (!districtData || !districtData.name) {
            console.log(`Bairro ${districtId} com dados inválidos:`, districtData);
            return null;
          }

          // Criamos o objeto do bairro com dados básicos
          const district: District = {
            id: districtId,
            name: districtData.name,
            cityId: districtData.cityId || '',
            isActive: districtData.isActive ?? true
          };

          // Se tiver cityId válido, tentamos buscar os dados da cidade
          if (districtData.cityId && typeof districtData.cityId === 'string') {
            try {
              const cityRef = doc(db, 'cities', districtData.cityId);
              const cityDoc = await getDoc(cityRef);
              
              if (cityDoc.exists()) {
                const cityData = cityDoc.data();
                district.city = {
                  id: cityDoc.id,
                  name: cityData.name,
                  stateId: cityData.stateId,
                  isActive: cityData.isActive ?? true
                };
                console.log(`Dados da cidade encontrados para o bairro ${districtId}:`, district.city);
              } else {
                console.log(`Cidade ${districtData.cityId} não encontrada para o bairro ${districtId}`);
              }
            } catch (error) {
              console.error(`Erro ao buscar cidade ${districtData.cityId} do bairro ${districtId}:`, error);
            }
          } else {
            console.log(`Bairro ${districtId} sem cityId válido:`, districtData.cityId);
          }

          return district;
        } catch (error) {
          console.error(`Erro ao processar bairro:`, error);
          return null;
        }
      })
    );

    // Filtra os bairros nulos (que deram erro no processamento)
    const validDistricts = districts.filter((d): d is District => d !== null);
    console.log(`Total de bairros válidos encontrados: ${validDistricts.length}`);
    return validDistricts;

  } catch (error: any) {
    console.error('Erro ao buscar bairros:', error);
    throw new Error(`Erro ao buscar bairros: ${error.message}`);
  }
};

export const getDistrictsByCity = async (cityId: string): Promise<District[]> => {
  try {
    console.log(`[getDistrictsByCity] Iniciando busca de bairros para cidade ${cityId}`);
    
    if (!cityId) {
      console.log('[getDistrictsByCity] cityId está vazio');
      return [];
    }

    // Primeiro verifica se a cidade existe
    const cityRef = doc(db, 'cities', cityId);
    console.log('[getDistrictsByCity] Buscando documento da cidade...');
    
    const cityDoc = await getDoc(cityRef);
    if (!cityDoc.exists()) {
      console.log(`[getDistrictsByCity] Cidade ${cityId} não encontrada no Firestore`);
      return [];
    }

    const cityData = cityDoc.data();
    console.log('[getDistrictsByCity] Dados da cidade encontrados:', cityData);

    // Busca os bairros da cidade
    console.log('[getDistrictsByCity] Iniciando query de bairros...');
    const q = query(districtsCollection, where('cityId', '==', cityId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('[getDistrictsByCity] Nenhum bairro encontrado para esta cidade');
      return [];
    }

    console.log(`[getDistrictsByCity] Encontrados ${snapshot.size} bairros`);
    
    const districts = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log(`[getDistrictsByCity] Processando bairro ${doc.id}:`, data);
      
      return {
        id: doc.id,
        name: data.name || 'Nome não definido',
        cityId: cityId,
        isActive: data.isActive ?? true,
        city: {
          id: cityId,
          name: cityData.name || 'Cidade sem nome',
          stateId: cityData.stateId,
          isActive: cityData.isActive ?? true
        }
      } as District;
    });

    console.log('[getDistrictsByCity] Bairros processados com sucesso:', districts);
    return districts;
    
  } catch (error: any) {
    console.error('[getDistrictsByCity] Erro detalhado:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    throw new Error(`Erro ao buscar bairros da cidade: ${error.message}`);
  }
};

export const createDistrict = async (district: Omit<District, 'id' | 'isActive' | 'city'>): Promise<string> => {
  try {
    console.log('Criando novo bairro:', district);
    
    // Verifica se a cidade existe
    const cityDoc = await getDoc(doc(db, 'cities', district.cityId));
    if (!cityDoc.exists()) {
      throw new Error(`Cidade ${district.cityId} não encontrada`);
    }

    const docRef = await addDoc(districtsCollection, {
      ...district,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('Bairro criado com sucesso. ID:', docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error('Erro ao criar bairro:', error);
    throw new Error(`Erro ao criar bairro: ${error.message}`);
  }
};

export const deleteDistrict = async (districtId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'districts', districtId));
  } catch (error: any) {
    console.error('Erro ao deletar bairro:', error);
    throw new Error(`Erro ao deletar bairro: ${error.message}`);
  }
};

// Users
export const setUserAsAdmin = async (userId: string, email: string): Promise<void> => {
  try {
    console.log('Tentando definir usuário como admin:', userId);
    
    await setDoc(doc(db, 'users', userId), {
      email,
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('Usuário definido como admin com sucesso');
  } catch (error: any) {
    console.error('Erro ao definir usuário como admin:', error);
    throw new Error(`Erro ao definir usuário como admin: ${error.message}`);
  }
};

export const checkUserRole = async (userId: string): Promise<string | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data().role;
    }
    return null;
  } catch (error) {
    console.error('Erro ao verificar role do usuário:', error);
    return null;
  }
}; 