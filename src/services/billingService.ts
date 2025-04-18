import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { auth } from '../config/firebase';

// Interface para o controle de faturamento
interface BillingControl {
  lastBillingDate: Timestamp;
  nextBillingDate: Timestamp;
  totalLastInvoice: number;
}

// Interface para notificação
interface BillingNotification {
  type: 'INVOICE_CREATED';
  title: string;
  message: string;
  invoiceId: string;
  totalFee: number;
  createdAt: Timestamp;
  read: boolean;
  dueDate: Timestamp;
}

// Função para verificar se o usuário é admin
export const checkIsAdmin = async (): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('Usuário não autenticado');
      return false;
    }

    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (!userDoc.exists()) {
      console.error('Documento do usuário não encontrado');
      return false;
    }

    return userDoc.data().role === 'ADMIN';
  } catch (error) {
    console.error('Erro ao verificar se é admin:', error);
    return false;
  }
};

// Função para inicializar o controle de faturamento
export const initializeBillingControl = async (storeId: string): Promise<void> => {
  if (!storeId) {
    console.error('StoreId não fornecido');
    throw new Error('StoreId é obrigatório');
  }

  try {
    // Verificar se o usuário é admin
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
      throw new Error('Apenas administradores podem inicializar o controle de faturamento');
    }

    console.log('Iniciando processo de inicialização para loja:', storeId);
    
    // Primeiro verificar se o estabelecimento existe
    const partnerRef = doc(db, 'partners', storeId);
    console.log('Buscando estabelecimento em:', partnerRef.path);
    
    const partnerSnap = await getDoc(partnerRef);
    
    if (!partnerSnap.exists()) {
      console.error('Estabelecimento não encontrado:', storeId);
      throw new Error(`Estabelecimento ${storeId} não encontrado`);
    }
    
    console.log('Estabelecimento encontrado, dados:', partnerSnap.data());
    
    // Criar referência para o documento billing_control dentro da subcoleção do partner
    const billingControlCollection = collection(partnerRef, 'billing_control');
    console.log('Criando coleção billing_control em:', billingControlCollection.path);
    
    const billingControlRef = doc(billingControlCollection, 'current');
    console.log('Criando documento current em:', billingControlRef.path);
    
    // Verificar se já existe
    const existingBillingControl = await getDoc(billingControlRef);
    if (existingBillingControl.exists()) {
      console.log('Billing control já existe para esta loja');
      return;
    }
    
    const now = Timestamp.now();
    
    // Data do próximo faturamento (1 mês a partir de agora)
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    
    // Inicializar com a data atual
    const initialBillingControl: BillingControl = {
      lastBillingDate: now,
      nextBillingDate: Timestamp.fromDate(nextBillingDate),
      totalLastInvoice: 0
    };

    console.log('Tentando salvar billing control com dados:', initialBillingControl);

    try {
      await setDoc(billingControlRef, initialBillingControl);
      console.log('Controle de faturamento inicializado com sucesso para loja', storeId);
    } catch (saveError: any) {
      console.error('Erro ao salvar billing control:', saveError);
      throw new Error(`Erro ao salvar billing control: ${saveError.message}`);
    }
  } catch (error: any) {
    console.error('Erro ao inicializar controle de faturamento:', error);
    throw error;
  }
};

// Função para verificar se o controle de faturamento existe
export const checkBillingControl = async (storeId: string): Promise<boolean> => {
  try {
    console.log('Verificando billing control para:', storeId);
    const partnerRef = doc(db, 'partners', storeId);
    const billingControlRef = doc(collection(partnerRef, 'billing_control'), 'current');
    console.log('Buscando documento em:', billingControlRef.path);
    
    const docSnap = await getDoc(billingControlRef);
    const exists = docSnap.exists();
    console.log('Documento existe?', exists);
    
    return exists;
  } catch (error) {
    console.error('Erro ao verificar controle de faturamento:', error);
    throw error;
  }
};

// Função para buscar o controle de faturamento
export const getBillingControl = async (storeId: string): Promise<BillingControl | null> => {
  try {
    const partnerRef = doc(db, 'partners', storeId);
    const billingControlRef = doc(collection(partnerRef, 'billing_control'), 'current');
    const docSnap = await getDoc(billingControlRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    return docSnap.data() as BillingControl;
  } catch (error) {
    console.error('Erro ao buscar controle de faturamento:', error);
    throw error;
  }
};

// Função para criar notificação de fatura
const createInvoiceNotification = async (
  storeId: string,
  invoiceId: string,
  totalFee: number,
  dueDate: Timestamp
): Promise<void> => {
  try {
    const notification: BillingNotification = {
      type: 'INVOICE_CREATED',
      title: 'Nova Fatura Disponível',
      message: `Uma nova fatura no valor de R$ ${totalFee.toFixed(2)} foi gerada. Vencimento em ${dueDate.toDate().toLocaleDateString('pt-BR')}.`,
      invoiceId,
      totalFee,
      createdAt: Timestamp.now(),
      read: false,
      dueDate
    };

    const partnerRef = doc(db, 'partners', storeId);
    const notificationsRef = collection(partnerRef, 'notifications');
    await setDoc(doc(notificationsRef), notification);
    
    console.log('Notificação de fatura criada com sucesso:', notification);
  } catch (error) {
    console.error('Erro ao criar notificação de fatura:', error);
    throw error;
  }
};

export const generateMonthlyBilling = async (storeId: string): Promise<void> => {
  try {
    console.log('==========================================');
    console.log('INICIANDO GERAÇÃO DE FATURA');
    console.log('==========================================');
    
    // Verificar se o usuário é admin
    const isAdmin = await checkIsAdmin();
    console.log('Usuário é admin?', isAdmin);
    
    if (!isAdmin) {
      console.error('Usuário não é admin!');
      throw new Error('Apenas administradores podem gerar faturas');
    }

    console.log('Buscando controle de faturamento para loja:', storeId);
    
    // Buscar o documento de controle de faturamento
    const partnerRef = doc(db, 'partners', storeId);
    const billingControlRef = doc(collection(partnerRef, 'billing_control'), 'current');
    const billingControlDoc = await getDoc(billingControlRef);
    
    if (!billingControlDoc.exists()) {
      console.error('Controle de faturamento não encontrado!');
      throw new Error('Controle de faturamento não encontrado');
    }

    const billingControl = billingControlDoc.data();
    const lastBillingDate = billingControl.lastBillingDate;
    
    // Calcular próxima data de faturamento (1 mês após o último faturamento)
    const nextBillingDate = new Date(lastBillingDate.toDate());
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    
    // Buscar todas as taxas não liquidadas desde o último faturamento
    const appFeesRef = collection(partnerRef, 'app_fees');
    const appFeesQuery = query(
      appFeesRef,
      where('settled', '==', false),
      where('orderDate', '>', lastBillingDate),
      where('orderDate', '<=', Timestamp.fromDate(nextBillingDate))
    );

    console.log('Buscando taxas não liquidadas na subcoleção app_fees...');
    console.log('Período:', {
      inicio: lastBillingDate.toDate(),
      fim: nextBillingDate
    });
    
    const appFeesSnapshot = await getDocs(appFeesQuery);
    console.log(`Encontradas ${appFeesSnapshot.size} taxas não liquidadas`);
    
    // Se não houver taxas, não gera fatura
    if (appFeesSnapshot.empty) {
      console.log('Nenhuma taxa para faturar neste período!');
      return;
    }

    // Calcular o total das taxas
    let total = 0;
    const feesToUpdate: string[] = [];
    const feesDetails: any[] = [];
    
    appFeesSnapshot.forEach((doc) => {
      const fee = doc.data();
      const appFee = fee.appFee || {};
      
      // Garantir que o valor seja tratado como número
      const feeValue = appFee.value || 0;

      console.log('Taxa encontrada:', {
        id: doc.id,
        valor: feeValue,
        percentual: appFee.percentage,
        isPremium: appFee.isPremiumRate
      });

      if (!isNaN(feeValue)) {
        total += feeValue;
        feesToUpdate.push(doc.id);
        feesDetails.push({
          id: doc.id,
          value: feeValue,
          orderDate: fee.orderDate?.toDate?.(),
          settled: fee.settled,
          orderTotalPrice: parseFloat(fee.orderTotalPrice) || 0,
          percentage: appFee.percentage || 0,
          paymentMethod: fee.paymentMethod || 'unknown'
        });
      } else {
        console.error('Valor inválido encontrado para taxa:', doc.id);
      }
    });

    console.log('==========================================');
    console.log('DETALHES DAS TAXAS A FATURAR:');
    console.log('==========================================');
    feesDetails.forEach(fee => {
      console.log('------------------------------------------');
      console.log('ID:', fee.id);
      console.log('Valor:', fee.value.toFixed(2));
      console.log('Valor do Pedido:', fee.orderTotalPrice.toFixed(2));
      console.log('Percentual:', (fee.percentage * 100).toFixed(2) + '%');
      console.log('Método de Pagamento:', fee.paymentMethod);
      console.log('Data:', fee.orderDate);
      console.log('------------------------------------------');
    });
    console.log('Total a faturar:', total.toFixed(2));

    // Criar nova fatura
    const now = Timestamp.now();
    
    // Formatar os detalhes das taxas para garantir que são serializáveis
    const formattedFeesDetails = feesDetails.map(fee => ({
      id: fee.id || '',
      value: fee.value,
      orderDate: fee.orderDate || now,
      orderTotalPrice: fee.orderTotalPrice,
      percentage: fee.percentage,
      paymentMethod: fee.paymentMethod
    }));

    const invoice = {
      storeId: storeId,
      totalFee: total,
      status: 'pendente',
      createdAt: now,
      cycleStart: now,
      cycleEnd: now,
      dueDate: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      appFeeIds: feesToUpdate,
      details: formattedFeesDetails,
      paymentStatus: 'pending',
      paidAt: null,
      updatedAt: now
    };

    console.log('==========================================');
    console.log('DADOS DA NOVA FATURA:');
    console.log('==========================================');
    console.log(JSON.stringify(invoice, null, 2));

    // Usar batch para garantir que todas as operações sejam atômicas
    const batch = writeBatch(db);

    // 1. Salvar a fatura
    const newInvoiceRef = doc(collection(partnerRef, 'invoices'));
    batch.set(newInvoiceRef, invoice);
    console.log('Fatura será criada com ID:', newInvoiceRef.id);

    // 2. Atualizar o status das taxas para settled = true
    feesToUpdate.forEach(feeId => {
      const feeRef = doc(appFeesRef, feeId);
      batch.update(feeRef, { 
        settled: true,
        lastBillingDate: now
      });
    });

    // 3. Atualizar o controle de faturamento com a próxima data
    batch.update(billingControlRef, {
      lastBillingDate: now,
      nextBillingDate: Timestamp.fromDate(nextBillingDate),
      totalLastInvoice: total
    });

    // Executar todas as operações
    console.log('Executando batch com todas as operações...');
    await batch.commit();

    // Criar notificação após a fatura ser gerada com sucesso
    await createInvoiceNotification(
      storeId,
      newInvoiceRef.id,
      total,
      invoice.dueDate
    );

    console.log('Fatura e notificação geradas com sucesso');
  } catch (error: any) {
    console.error('==========================================');
    console.error('ERRO AO GERAR FATURAMENTO:', error);
    console.error('==========================================');
    throw error;
  }
};

// Função para verificar taxas existentes
export const checkExistingFees = async (storeId: string): Promise<void> => {
  try {
    console.log('==========================================');
    console.log('VERIFICAÇÃO DE TAXAS');
    console.log('==========================================');
    console.log('Estabelecimento ID:', storeId);
    
    // Buscar na subcoleção do estabelecimento
    console.log('Buscando taxas na subcoleção app_fees do estabelecimento...');
    const partnerRef = doc(db, 'partners', storeId);
    const partnerAppFeesRef = collection(partnerRef, 'app_fees');
    const partnerAppFeesSnapshot = await getDocs(partnerAppFeesRef);
    
    console.log('Total de taxas encontradas:', partnerAppFeesSnapshot.size);

    if (partnerAppFeesSnapshot.empty) {
      console.log('NENHUMA TAXA ENCONTRADA!');
      alert('Nenhuma taxa encontrada para este estabelecimento!');
      return;
    }

    // Separar taxas liquidadas e não liquidadas
    const taxasLiquidadas: Array<{id: string; data: any}> = [];
    const taxasNaoLiquidadas: Array<{id: string; data: any}> = [];

    partnerAppFeesSnapshot.forEach((doc) => {
      const data = doc.data();
      const appFee = data.appFee || {};
      
      // Debug: mostrar dados brutos
      console.log('==========================================');
      console.log('DADOS BRUTOS DA TAXA:', doc.id);
      console.log('Valor da Taxa:', appFee.value);
      console.log('Percentual:', appFee.percentage);
      console.log('É Premium:', appFee.isPremiumRate);
      console.log('==========================================');

      if (data.settled) {
        taxasLiquidadas.push({ id: doc.id, data });
      } else {
        taxasNaoLiquidadas.push({ id: doc.id, data });
      }
    });

    console.log('==========================================');
    console.log(`RESUMO DAS TAXAS:`);
    console.log(`Total de taxas: ${partnerAppFeesSnapshot.size}`);
    console.log(`Taxas liquidadas: ${taxasLiquidadas.length}`);
    console.log(`Taxas não liquidadas: ${taxasNaoLiquidadas.length}`);
    console.log('==========================================');

    if (taxasNaoLiquidadas.length > 0) {
      console.log('TAXAS NÃO LIQUIDADAS (disponíveis para fatura):');
      taxasNaoLiquidadas.forEach((fee) => {
        const appFee = fee.data.appFee || {};
        console.log('------------------------------------------');
        console.log('ID da Taxa:', fee.id);
        console.log('Valor da Taxa:', appFee.value);
        console.log('Valor do Pedido:', fee.data.orderTotalPrice);
        console.log('Percentual:', (appFee.percentage * 100).toFixed(2) + '%');
        console.log('Data do Pedido:', fee.data.orderDate?.toDate?.());
        console.log('ID do Pedido:', fee.data.orderId);
        console.log('Método de Pagamento:', fee.data.paymentMethod);
        console.log('------------------------------------------');
      });
    }

    if (taxasLiquidadas.length > 0) {
      console.log('TAXAS JÁ LIQUIDADAS (incluídas em faturas):');
      taxasLiquidadas.forEach((fee) => {
        const appFee = fee.data.appFee || {};
        console.log('------------------------------------------');
        console.log('ID da Taxa:', fee.id);
        console.log('Valor da Taxa:', appFee.value);
        console.log('Valor do Pedido:', fee.data.orderTotalPrice);
        console.log('Percentual:', (appFee.percentage * 100).toFixed(2) + '%');
        console.log('Data do Pedido:', fee.data.orderDate?.toDate?.());
        console.log('Data de Liquidação:', fee.data.lastBillingDate?.toDate?.());
        console.log('ID do Pedido:', fee.data.orderId);
        console.log('Método de Pagamento:', fee.data.paymentMethod);
        console.log('------------------------------------------');
      });
    }

    // Calcular total das taxas não liquidadas usando o valor do appFee
    const totalNaoLiquidado = taxasNaoLiquidadas.reduce((total, fee) => {
      const valor = fee.data.appFee?.value || 0;
      console.log('Somando valor:', valor);
      return total + valor;
    }, 0);

    console.log('==========================================');
    console.log('TOTAL FINAL NÃO LIQUIDADO:', totalNaoLiquidado.toFixed(2));
    console.log('==========================================');

    alert(
      `Encontradas ${partnerAppFeesSnapshot.size} taxas:\n` +
      `- ${taxasLiquidadas.length} já liquidadas\n` +
      `- ${taxasNaoLiquidadas.length} não liquidadas\n\n` +
      `Total disponível para faturamento: R$ ${totalNaoLiquidado.toFixed(2)}\n\n` +
      `Verifique o console para mais detalhes.`
    );
    
  } catch (error: any) {
    console.error('==========================================');
    console.error('ERRO AO VERIFICAR TAXAS:', error);
    console.error('Stack:', error.stack);
    console.error('==========================================');
    alert('Erro ao verificar taxas. Verifique o console.');
  }
}; 