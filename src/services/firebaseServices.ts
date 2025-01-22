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
  QueryDocumentSnapshot
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
  state: State;
}

interface District {
  id?: string;
  cityId: string;
  name: string;
  city?: City;
}

// Collections
const statesCollection = collection(db, 'states');
const citiesCollection = collection(db, 'cities');
const districtsCollection = collection(db, 'districts');

// States
export const getStates = async (): Promise<State[]> => {
  const snapshot = await getDocs(statesCollection);
  return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ 
    id: doc.id, 
    ...doc.data() 
  } as State));
};

export const createState = async (state: Omit<State, 'id' | 'isActive'>): Promise<void> => {
  await addDoc(statesCollection, {
    ...state,
    isActive: true
  });
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
  const snapshot = await getDocs(citiesCollection);
  const cities = await Promise.all(
    snapshot.docs.map(async (cityDoc: QueryDocumentSnapshot<DocumentData>) => {
      const cityData = cityDoc.data();
      const stateDoc = await getDocs(doc(db, 'states', cityData.stateId));
      return {
        id: cityDoc.id,
        ...cityData,
        state: { id: stateDoc.id, ...stateDoc.data() }
      } as City;
    })
  );
  return cities;
};

export const createCity = async (city: Omit<City, 'id' | 'isActive' | 'state'>): Promise<void> => {
  await addDoc(citiesCollection, {
    ...city,
    isActive: true
  });
};

export const deleteCity = async (cityId: string): Promise<void> => {
  const districtsQuery = query(districtsCollection, where('cityId', '==', cityId));
  const districtsSnapshot = await getDocs(districtsQuery);
  
  if (!districtsSnapshot.empty) {
    throw new Error(`Não é possível excluir a cidade pois existem ${districtsSnapshot.size} bairros vinculados`);
  }
  
  await deleteDoc(doc(db, 'cities', cityId));
};

export const toggleCityStatus = async (cityId: string, currentStatus: boolean): Promise<void> => {
  await updateDoc(doc(db, 'cities', cityId), {
    isActive: !currentStatus
  });
};

// Districts
export const getDistricts = async (): Promise<District[]> => {
  const snapshot = await getDocs(districtsCollection);
  const districts = await Promise.all(
    snapshot.docs.map(async (districtDoc: QueryDocumentSnapshot<DocumentData>) => {
      const districtData = districtDoc.data();
      const cityDoc = await getDocs(doc(db, 'cities', districtData.cityId));
      return {
        id: districtDoc.id,
        ...districtData,
        city: { id: cityDoc.id, ...cityDoc.data() }
      } as District;
    })
  );
  return districts;
};

export const createDistrict = async (district: Omit<District, 'id' | 'city'>): Promise<void> => {
  await addDoc(districtsCollection, district);
};

export const deleteDistrict = async (districtId: string): Promise<void> => {
  await deleteDoc(doc(db, 'districts', districtId));
}; 