import { db } from '../config/firebase';
import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';

const createDefaultPlans = async () => {
  try {
    // Check if plans already exist
    const plansRef = collection(db, 'plans');
    const existingPlansQuery = query(plansRef, where('isDefault', '==', true));
    const existingPlansSnapshot = await getDocs(existingPlansQuery);

    if (!existingPlansSnapshot.empty) {
      console.log('Planos padrão já existem. Pulando criação.');
      return;
    }

    const now = Timestamp.now();

    // Plano Padrão (Gratuito)
    const defaultPlan = {
      name: 'Plano Padrão',
      description: 'Plano inicial para começar a vender seus produtos',
      price: '0',
      platformFeeRate: '8',
      features: {
        maxProducts: 50,
        support: 'email',
        analytics: 'basic',
        showInPremiumSection: false,
        showPromotionsInHome: false,
        advantages: [
          'Até 50 produtos',
          'Suporte por email',
          'Análises básicas',
          'Taxa de 8% por venda'
        ]
      },
      isActive: true,
      isDefault: true,
      createdAt: now,
      updatedAt: now
    };

    // Plano Premium
    const premiumPlan = {
      name: 'Plano Premium',
      description: 'Plano completo para expandir seus negócios',
      price: '49.99',
      platformFeeRate: '5',
      features: {
        maxProducts: -1, // -1 indica ilimitado
        support: 'priority',
        analytics: 'advanced',
        showInPremiumSection: true,
        showPromotionsInHome: true,
        advantages: [
          'Produtos ilimitados',
          'Suporte prioritário',
          'Análises avançadas',
          'Taxa reduzida de 5% por venda',
          'Destaque na seção premium',
          'Promoções na página inicial',
          'Ferramentas avançadas de marketing'
        ]
      },
      isActive: true,
      isDefault: false,
      createdAt: now,
      updatedAt: now
    };

    // Adicionar planos ao Firestore
    await addDoc(plansRef, defaultPlan);
    await addDoc(plansRef, premiumPlan);

    console.log('Planos padrão criados com sucesso!');
  } catch (error) {
    console.error('Erro ao criar planos padrão:', error);
  }
};

export default createDefaultPlans;
