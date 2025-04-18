import * as functions from 'firebase-functions';
import { verificarCobrancasPendentes } from '../services/monthlyInvoiceService';

// Executa a função todos os dias à meia-noite
export const verificarCobrancas = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    console.log('Iniciando verificação de cobranças...');
    
    try {
      const resultado = await verificarCobrancasPendentes();
      console.log('Resultado da verificação:', resultado);
      return null;
    } catch (error) {
      console.error('Erro ao executar verificação:', error);
      throw error;
    }
  }); 