import { collection, query, where, getDocs, writeBatch, Timestamp, addDoc, doc, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

interface AppFee {
  id: string;
  storeId: string;
  amount: number;
  settled: boolean;
  createdAt: Timestamp;
}

interface MonthlyInvoice {
  storeId: string;
  totalFee: number;
  status: 'pendente' | 'pago';
  cycleStart: Timestamp;
  cycleEnd: Timestamp;
  createdAt: Timestamp;
  appFeeIds: string[];
}

const getStoreCycle = async (storeId: string): Promise<{ start: Timestamp | null; end: Timestamp | null }> => {
  // Buscar última fatura da loja
  const invoicesRef = collection(db, 'monthlyInvoices');
  const lastInvoiceQuery = query(
    invoicesRef,
    where('storeId', '==', storeId),
    orderBy('cycleEnd', 'desc'),
    limit(1)
  );
  const lastInvoiceSnap = await getDocs(lastInvoiceQuery);

  if (!lastInvoiceSnap.empty) {
    // Se existe fatura anterior, próximo ciclo começa após o fim do último
    const lastInvoice = lastInvoiceSnap.docs[0].data() as MonthlyInvoice;
    const cycleStart = lastInvoice.cycleEnd;
    const cycleEnd = Timestamp.fromDate(new Date(cycleStart.toDate().getTime() + 30 * 24 * 60 * 60 * 1000));
    return { start: cycleStart, end: cycleEnd };
  }

  // Se não existe fatura, buscar primeira venda não liquidada
  const appFeeRef = collection(db, 'appFee');
  const firstFeeQuery = query(
    appFeeRef,
    where('storeId', '==', storeId),
    where('settled', '==', false),
    orderBy('createdAt', 'asc'),
    limit(1)
  );
  const firstFeeSnap = await getDocs(firstFeeQuery);

  if (!firstFeeSnap.empty) {
    const firstFee = firstFeeSnap.docs[0].data() as AppFee;
    const cycleStart = firstFee.createdAt;
    const cycleEnd = Timestamp.fromDate(new Date(cycleStart.toDate().getTime() + 30 * 24 * 60 * 60 * 1000));
    return { start: cycleStart, end: cycleEnd };
  }

  return { start: null, end: null };
};

export const verificarCobrancasPendentes = async () => {
  try {
    // 1. Buscar todas as taxas não liquidadas agrupadas por loja
    const appFeeRef = collection(db, 'appFee');
    const q = query(appFeeRef, where('settled', '==', false));
    const querySnapshot = await getDocs(q);

    // Agrupar taxas por loja
    const taxasPorLoja: { [key: string]: AppFee[] } = {};
    querySnapshot.forEach((doc) => {
      const fee = { id: doc.id, ...doc.data() } as AppFee;
      if (!taxasPorLoja[fee.storeId]) {
        taxasPorLoja[fee.storeId] = [];
      }
      taxasPorLoja[fee.storeId].push(fee);
    });

    const batch = writeBatch(db);
    const monthlyInvoicesRef = collection(db, 'monthlyInvoices');
    const now = Timestamp.now();

    // Processar cada loja
    for (const [storeId, fees] of Object.entries(taxasPorLoja)) {
      const cycle = await getStoreCycle(storeId);
      
      if (!cycle.start || !cycle.end) continue;

      // Se ainda não chegou ao fim do ciclo, pula
      if (now.seconds < cycle.end.seconds) continue;

      // Filtrar taxas dentro do ciclo
      const taxasDoCiclo = fees.filter(fee => 
        fee.createdAt.seconds >= cycle.start!.seconds && 
        fee.createdAt.seconds <= cycle.end!.seconds
      );

      if (taxasDoCiclo.length === 0) continue;

      // Calcular total do ciclo
      const totalCiclo = taxasDoCiclo.reduce((sum, fee) => sum + fee.amount, 0);

      // Criar nova fatura
      const novaFatura: MonthlyInvoice = {
        storeId,
        totalFee: totalCiclo,
        status: 'pendente',
        cycleStart: cycle.start,
        cycleEnd: cycle.end,
        createdAt: now,
        appFeeIds: taxasDoCiclo.map(fee => fee.id)
      };

      // Adicionar fatura
      await addDoc(monthlyInvoicesRef, novaFatura);

      // Marcar taxas como liquidadas
      taxasDoCiclo.forEach(fee => {
        const feeRef = doc(appFeeRef, fee.id);
        batch.update(feeRef, { settled: true });
      });
    }

    // Executar todas as atualizações em batch
    await batch.commit();

    return {
      success: true,
      message: `Verificação de cobranças concluída com sucesso`
    };
  } catch (error) {
    console.error('Erro ao verificar cobranças:', error);
    return {
      success: false,
      message: 'Erro ao verificar cobranças',
      error
    };
  }
}; 