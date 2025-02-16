import { db } from '../config/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { createState, createCity, createNeighborhood } from '../services/locationServices';

export const migrateLocations = async () => {
  try {
    // Buscar estados antigos
    const oldStatesSnapshot = await getDocs(collection(db, 'states'));
    
    for (const stateDoc of oldStatesSnapshot.docs) {
      const stateData = stateDoc.data();
      
      // Criar novo estado
      const newState = await createState({
        name: stateData.name,
        uf: stateData.uf
      });

      // Buscar cidades antigas do estado
      const oldCitiesSnapshot = await getDocs(
        query(collection(db, 'cities'))
      );

      for (const cityDoc of oldCitiesSnapshot.docs) {
        const cityData = cityDoc.data();
        if (cityData.stateId === stateDoc.id) {
          // Criar nova cidade
          const newCity = await createCity(newState.id, {
            name: cityData.name
          });

          // Buscar bairros antigos da cidade
          const oldDistrictsSnapshot = await getDocs(
            query(collection(db, 'districts'))
          );

          for (const districtDoc of oldDistrictsSnapshot.docs) {
            const districtData = districtDoc.data();
            if (districtData.cityId === cityDoc.id) {
              // Criar novo bairro
              await createNeighborhood(newState.id, newCity.id, {
                name: districtData.name
              });
            }
          }
        }
      }
    }

    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a migração:', error);
    throw error;
  }
}; 