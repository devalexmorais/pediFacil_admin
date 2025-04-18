import * as functions from 'firebase-functions';
import { collection, getDocs, query, where, Timestamp, doc, setDoc } from 'firebase/firestore';
import { db } from './config/firebase';
import { generateMonthlyBilling } from './services/billingService';

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

const createInvoiceNotification = async (
  storeId: string,
  invoiceId: string,
  totalFee: number,
  dueDate: Timestamp
): Promise<void> => {
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
  
  console.log(`Notificação de fatura criada para loja ${storeId}`);
};

export const processDailyBilling = functions.pubsub
  .schedule('0 0 * * *') // Executa todos os dias à meia-noite
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    try {
      const now = Timestamp.now();
      
      // Buscar todas as lojas que precisam ser faturadas hoje
      const billingControlRef = collection(db, 'billing_control');
      const billingQuery = query(
        billingControlRef,
        where('nextBillingDate', '<=', now)
      );

      const billingDocs = await getDocs(billingQuery);

      // Processar o faturamento de cada loja
      for (const doc of billingDocs.docs) {
        const storeId = doc.id;
        try {
          const result = await generateMonthlyBilling(storeId);
          
          // Se a fatura foi gerada com sucesso, criar notificação
          if (result && result.invoiceId) {
            await createInvoiceNotification(
              storeId,
              result.invoiceId,
              result.totalFee,
              result.dueDate
            );
          }
        } catch (error) {
          console.error(`Erro ao processar fatura para loja ${storeId}:`, error);
          // Continuar com as próximas lojas mesmo se houver erro em uma
          continue;
        }
      }

      console.log(`Processamento de faturamento concluído para ${billingDocs.size} lojas`);
      return null;
    } catch (error) {
      console.error('Erro no processamento do faturamento diário:', error);
      throw error;
    }
  }); 