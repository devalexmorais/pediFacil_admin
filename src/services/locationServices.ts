import { 
  collection, 
  doc, 
  getDoc, 
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
  createdAt?: any;
}

export interface City {
  id: string;
  name: string;
  stateId: string;
  createdAt?: any;
}

export interface Neighborhood {
  id: string;
  name: string;
  cityId: string;
  stateId: string;
  createdAt?: any;
}

// Estados
export const createState = async (stateData: Omit<State, 'id' | 'createdAt'>) => {
  try {
    const statesRef = collection(db, 'states');
    const docRef = await addDoc(statesRef, {
      ...stateData,
      createdAt: serverTimestamp()
    });
    return { id: docRef.id, ...stateData };
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
export const createCity = async (stateId: string, cityData: Omit<City, 'id' | 'stateId' | 'createdAt'>) => {
  try {
    const stateDocRef = doc(db, 'states', stateId);
    const citiesCollectionRef = collection(stateDocRef, 'cities');
    
    const newCity = {
      ...cityData,
      stateId,
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
  neighborhoodData: Omit<Neighborhood, 'id' | 'stateId' | 'cityId' | 'createdAt'>
) => {
  try {
    const stateDocRef = doc(db, 'states', stateId);
    const cityDocRef = doc(stateDocRef, 'cities', cityId);
    const neighborhoodsCollectionRef = collection(cityDocRef, 'neighborhoods');
    
    const newNeighborhood = {
      ...neighborhoodData,
      stateId,
      cityId,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(neighborhoodsCollectionRef, newNeighborhood);
    return { id: docRef.id, ...newNeighborhood };
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