import { collection, query, where, getDocs, orderBy, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Invoice {
  id: string;
  storeId: string;
  totalFee: number;
  status: 'pendente' | 'pago' | 'atrasado';
  cycleStart: any;
  cycleEnd: any;
  createdAt: any;
  dueDate: any;
}

export const getStoreInvoices = async (storeId: string): Promise<Invoice[]> => {
  try {
    console.log('Buscando faturas para a loja:', storeId);
    
    const partnerRef = doc(db, 'partners', storeId);
    const invoicesRef = collection(partnerRef, 'invoices');
    console.log('Caminho da coleção de faturas:', invoicesRef.path);
    
    const querySnapshot = await getDocs(invoicesRef);
    console.log(`Encontradas ${querySnapshot.size} faturas`);
    
    const invoices = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];
    
    console.log('Faturas encontradas:', invoices);
    
    return invoices;
  } catch (error) {
    console.error('Erro ao buscar faturas:', error);
    throw error;
  }
}; 