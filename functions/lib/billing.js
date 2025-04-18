"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processDailyBilling = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Inicializar o admin SDK
admin.initializeApp();
exports.processDailyBilling = functions.pubsub
    .schedule('0 0 * * *') // Executa todos os dias à meia-noite
    .timeZone('America/Sao_Paulo')
    .onRun(async (context) => {
    try {
        const now = admin.firestore.Timestamp.now();
        const db = admin.firestore();
        // Buscar todas as lojas que precisam ser faturadas hoje
        const billingControlRef = db.collection('billing_control');
        const billingQuery = await billingControlRef
            .where('nextBillingDate', '<=', now)
            .get();
        if (billingQuery.empty) {
            console.log('Nenhuma loja para faturar hoje');
            return null;
        }
        // Para cada loja que precisa ser faturada
        for (const doc of billingQuery.docs) {
            const storeId = doc.id;
            try {
                // Buscar o controle de faturamento
                const lastBillingDate = doc.data().lastBillingDate;
                // Buscar todas as taxas desde o último faturamento
                const appFeesRef = db.collection('app_fees');
                const feesQuery = await appFeesRef
                    .where('storeId', '==', storeId)
                    .where('orderDate', '>', lastBillingDate)
                    .get();
                // Calcular o total
                let total = 0;
                feesQuery.forEach(feeDoc => {
                    total += feeDoc.data().value;
                });
                // Se houver valor a cobrar
                if (total > 0) {
                    // Criar nova fatura
                    const invoice = {
                        storeId,
                        totalFee: total,
                        status: 'pendente',
                        createdAt: now,
                        cycleStart: lastBillingDate,
                        cycleEnd: now,
                        dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
                    };
                    // Salvar a fatura
                    await db.collection('invoices').add(invoice);
                    // Calcular próxima data de faturamento (30 dias a partir de hoje)
                    const nextBillingDate = new Date();
                    nextBillingDate.setDate(nextBillingDate.getDate() + 30);
                    // Atualizar o controle de faturamento
                    await doc.ref.update({
                        lastBillingDate: now,
                        nextBillingDate: admin.firestore.Timestamp.fromDate(nextBillingDate),
                        totalLastInvoice: total
                    });
                    console.log(`Fatura gerada com sucesso para loja ${storeId}. Valor: ${total}`);
                }
                else {
                    console.log(`Nenhuma taxa para faturar para loja ${storeId}`);
                }
            }
            catch (error) {
                console.error(`Erro ao processar faturamento da loja ${storeId}:`, error);
                // Continua para a próxima loja mesmo se houver erro
            }
        }
        console.log(`Processamento de faturamento concluído para ${billingQuery.size} lojas`);
        return null;
    }
    catch (error) {
        console.error('Erro no processamento do faturamento diário:', error);
        throw error;
    }
});
//# sourceMappingURL=billing.js.map