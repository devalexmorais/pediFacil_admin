import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Interfaces
export interface State {
  id: string;
  name: string;
  uf: string;
}

export interface City {
  id: string;
  name: string;
  stateId: string;
  stateName?: string;
}

export interface Neighborhood {
  id: string;
  name: string;
  cityId: string;
  cityName?: string;
  stateId?: string;
  stateName?: string;
}

// Estados
export const createState = async (stateData: { name: string; uf: string }): Promise<State> => {
  try {
    // Garantindo que o nome seja uma string
    const name = String(stateData.name).trim();
    const uf = String(stateData.uf).trim().toUpperCase();
    
    if (!name || name.length < 2) {
      throw new Error('Nome do estado deve ter pelo menos 2 caracteres');
    }
    
    if (!uf || uf.length !== 2) {
      throw new Error('UF deve ter exatamente 2 caracteres');
    }
    
    const statesRef = collection(db, 'states');
    const docRef = await addDoc(statesRef, {
      name,
      uf,
      createdAt: serverTimestamp()
    });
    return { id: docRef.id, name, uf };
  } catch (error) {
    console.error('Erro ao criar estado:', error);
    throw error;
  }
};

export const getAllStates = async (): Promise<State[]> => {
  try {
    const statesRef = collection(db, 'states');
    const q = query(statesRef, orderBy('name'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as State[];
  } catch (error) {
    console.error('Erro ao buscar estados:', error);
    throw error;
  }
};

// Cidades
export const createCity = async (stateId: string, cityData: { name: string }): Promise<City> => {
  try {
    // Garantindo que o nome seja uma string
    const name = String(cityData.name).trim();
    
    if (!name || name.length < 2) {
      throw new Error('Nome da cidade deve ter pelo menos 2 caracteres');
    }
    
    // Obter o nome do estado para referência
    const state = await getStateById(stateId);
    
    const stateDocRef = doc(db, 'states', stateId);
    const citiesCollectionRef = collection(stateDocRef, 'cities');
    
    const newCity = {
      name,
      stateId,
      stateName: state.name,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(citiesCollectionRef, newCity);
    return { id: docRef.id, ...newCity };
  } catch (error) {
    console.error('Erro ao criar cidade:', error);
    throw error;
  }
};

export const getCitiesByState = async (stateId: string): Promise<City[]> => {
  try {
    const stateDocRef = doc(db, 'states', stateId);
    const citiesCollectionRef = collection(stateDocRef, 'cities');
    const q = query(citiesCollectionRef, orderBy('name'));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as City[];
  } catch (error) {
    console.error('Erro ao buscar cidades:', error);
    throw error;
  }
};

// Bairros
export const createNeighborhood = async (
  stateId: string, 
  cityId: string, 
  neighborhoodData: { name: string }
): Promise<Neighborhood> => {
  try {
    // Simplificando: apenas use o nome fornecido diretamente
    const name = String(neighborhoodData.name).trim();
    
    if (!name || name.length < 2) {
      throw new Error('Nome do bairro deve ter pelo menos 2 caracteres');
    }
    
    // Referências diretas ao Firestore
    const stateDocRef = doc(db, 'states', stateId);
    const cityDocRef = doc(stateDocRef, 'cities', cityId);
    const neighborhoodsCollectionRef = collection(cityDocRef, 'neighborhoods');
    
    // Verificar se já existe um documento com o mesmo nome
    const q = query(neighborhoodsCollectionRef);
    const querySnapshot = await getDocs(q);
    const existingNeighborhood = querySnapshot.docs.find(
      doc => doc.data().name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingNeighborhood) {
      throw new Error(`Já existe um bairro com o nome "${name}"`);
    }
    
    // Simplificando: obter os nomes apenas se necessário
    let stateName = '';
    let cityName = '';
    
    try {
      // Tentar obter informações do estado e cidade, mas continuar mesmo se falhar
      const state = await getStateById(stateId);
      stateName = state.name;
      
      const city = await getCityById(stateId, cityId);
      cityName = city.name;
    } catch (e) {
      console.warn('Não foi possível obter nomes completos de estado/cidade:', e);
      // Continuar mesmo com erro para criar o bairro de qualquer forma
    }
    
    const newNeighborhood = {
      name,
      cityId,
      cityName,
      stateId,
      stateName,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(neighborhoodsCollectionRef, newNeighborhood);
    
    // Retornar objeto simplificado para uso no front-end
    return { 
      id: docRef.id, 
      name,
      cityId,
      cityName, 
      stateId,
      stateName
    };
  } catch (error) {
    console.error('Erro ao criar bairro:', error);
    throw error;
  }
};

export const getNeighborhoodsByCity = async (stateId: string, cityId: string): Promise<Neighborhood[]> => {
  try {
    const stateDocRef = doc(db, 'states', stateId);
    const cityDocRef = doc(stateDocRef, 'cities', cityId);
    const neighborhoodsCollectionRef = collection(cityDocRef, 'neighborhoods');
    const q = query(neighborhoodsCollectionRef, orderBy('name'));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Neighborhood[];
  } catch (error) {
    console.error('Erro ao buscar bairros:', error);
    throw error;
  }
};

// Funções de exclusão
export const deleteState = async (stateId: string) => {
  try {
    const stateDocRef = doc(db, 'states', stateId);
    
    // Primeiro, excluir todos os bairros de todas as cidades
    const citiesCollectionRef = collection(stateDocRef, 'cities');
    const citiesSnapshot = await getDocs(citiesCollectionRef);
    
    for (const cityDoc of citiesSnapshot.docs) {
      const neighborhoodsCollectionRef = collection(cityDoc.ref, 'neighborhoods');
      const neighborhoodsSnapshot = await getDocs(neighborhoodsCollectionRef);
      
      // Excluir bairros
      for (const neighborhoodDoc of neighborhoodsSnapshot.docs) {
        await deleteDoc(neighborhoodDoc.ref);
      }
      
      // Excluir cidade
      await deleteDoc(cityDoc.ref);
    }
    
    // Por fim, excluir o estado
    await deleteDoc(stateDocRef);
  } catch (error) {
    console.error('Erro ao excluir estado:', error);
    throw error;
  }
};

export const deleteCity = async (stateId: string, cityId: string) => {
  try {
    const stateDocRef = doc(db, 'states', stateId);
    const cityDocRef = doc(stateDocRef, 'cities', cityId);
    
    // Primeiro, excluir todos os bairros
    const neighborhoodsCollectionRef = collection(cityDocRef, 'neighborhoods');
    const neighborhoodsSnapshot = await getDocs(neighborhoodsCollectionRef);
    
    for (const neighborhoodDoc of neighborhoodsSnapshot.docs) {
      await deleteDoc(neighborhoodDoc.ref);
    }
    
    // Depois, excluir a cidade
    await deleteDoc(cityDocRef);
  } catch (error) {
    console.error('Erro ao excluir cidade:', error);
    throw error;
  }
};

export const deleteNeighborhood = async (stateId: string, cityId: string, neighborhoodId: string) => {
  try {
    const stateDocRef = doc(db, 'states', stateId);
    const cityDocRef = doc(stateDocRef, 'cities', cityId);
    const neighborhoodDocRef = doc(cityDocRef, 'neighborhoods', neighborhoodId);
    
    await deleteDoc(neighborhoodDocRef);
  } catch (error) {
    console.error('Erro ao excluir bairro:', error);
    throw error;
  }
};

// Funções auxiliares (se não existirem, adicione-as)
const getStateById = async (stateId: string): Promise<State> => {
  // Implementação para buscar um estado pelo ID
  const states = await getAllStates();
  const state = states.find(state => state.id === stateId);
  if (!state) {
    throw new Error(`Estado com ID ${stateId} não encontrado`);
  }
  return state;
};

const getCityById = async (stateId: string, cityId: string): Promise<City> => {
  // Implementação para buscar uma cidade pelo ID
  const cities = await getCitiesByState(stateId);
  const city = cities.find(city => city.id === cityId);
  if (!city) {
    throw new Error(`Cidade com ID ${cityId} não encontrada`);
  }
  return city;
}; 