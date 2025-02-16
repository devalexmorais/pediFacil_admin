import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebaseConfig';

export const useCoupons = () => {
  const functions = getFunctions(app);

  const validateCoupon = async (code: string, orderTotal: number, items: CartItem[]) => {
    const validate = httpsCallable(functions, 'validateCoupon');
    try {
      const result = await validate({ 
        code, 
        orderTotal,
        items: items.map(item => ({
          productId: item.id,
          categories: item.categories
        }))
      });
      return result.data;
    } catch (error) {
      console.error('Erro na validação:', error);
      throw error;
    }
  };

  const registerCouponUse = async (code: string) => {
    const register = httpsCallable(functions, 'registerCouponUse');
    try {
      await register({ code });
    } catch (error) {
      console.error('Erro ao registrar uso:', error);
      throw error;
    }
  };

  return { validateCoupon, registerCouponUse };
}; 