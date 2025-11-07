import { db } from '../config/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

export interface PlatformFees {
  standardFee: number; // Taxa para usuário padrão (%)
  premiumFee: number;  // Taxa para usuário premium (%)
  updatedAt: Timestamp;
  updatedBy?: string;
}

const COLLECTION_NAME = 'platformFees';
const DOCUMENT_ID = 'fees';

/**
 * Busca as taxas da plataforma
 */
export const getPlatformFees = async (): Promise<PlatformFees | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, DOCUMENT_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as PlatformFees;
    }
    
    // Se não existe, retorna valores padrão
    return {
      standardFee: 5,
      premiumFee: 3,
      updatedAt: Timestamp.now()
    };
  } catch (error) {
    console.error('Erro ao buscar taxas da plataforma:', error);
    throw error;
  }
};

/**
 * Atualiza as taxas da plataforma
 */
export const updatePlatformFees = async (
  standardFee: number,
  premiumFee: number,
  userId?: string
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, DOCUMENT_ID);
    
    const feesData: PlatformFees = {
      standardFee,
      premiumFee,
      updatedAt: Timestamp.now(),
      updatedBy: userId
    };

    await setDoc(docRef, feesData, { merge: true });
  } catch (error) {
    console.error('Erro ao atualizar taxas da plataforma:', error);
    throw error;
  }
};

