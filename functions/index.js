const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

exports.validateCoupon = functions.https.onCall(async (data, context) => {
  const { code, orderTotal, items } = data;
  
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Autenticação necessária');
  }

  const couponRef = db.collection('coupons').doc(code);
  const couponDoc = await couponRef.get();

  if (!couponDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Cupom inválido');
  }

  const coupon = couponDoc.data();

  // Validações básicas
  if (!coupon.isActive) throw new functions.https.HttpsError('failed-precondition', 'Cupom inativo');
  if (coupon.expiryDate.toDate() < new Date()) throw new functions.https.HttpsError('failed-precondition', 'Cupom expirado');
  if (coupon.uses >= coupon.maxUses) throw new functions.https.HttpsError('resource-exhausted', 'Cupom esgotado');
  if (orderTotal < coupon.minOrderValue) throw new functions.https.HttpsError('failed-precondition', `Valor mínimo não atingido (R$ ${coupon.minOrderValue})`);

  // Validação de produtos/categorias
  if (coupon.applicableCategories || coupon.applicableProducts) {
    const isValid = items.some(item => {
      const productMatch = coupon.applicableProducts?.includes(item.productId);
      const categoryMatch = item.categories?.some(cat => 
        coupon.applicableCategories?.includes(cat)
      );
      return productMatch || categoryMatch;
    });
    
    if (!isValid) {
      throw new functions.https.HttpsError(
        'failed-precondition', 
        'Cupom não aplicável aos produtos selecionados'
      );
    }
  }

  // Calcula desconto
  let discount = coupon.discountType === 'percentage' 
    ? (orderTotal * coupon.value) / 100
    : coupon.value;

  discount = Math.min(discount, orderTotal);

  return {
    code,
    discount,
    finalAmount: orderTotal - discount,
    details: {
      type: coupon.discountType,
      value: coupon.value,
      minOrderValue: coupon.minOrderValue
    }
  };
});

exports.registerCouponUse = functions.https.onCall(async (data, context) => {
  const { code } = data;
  
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Autenticação necessária');
  }

  const couponRef = db.collection('coupons').doc(code);
  await db.runTransaction(async (transaction) => {
    const couponDoc = await transaction.get(couponRef);
    
    if (!couponDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Cupom inválido');
    }
    
    const newUses = (couponDoc.data().uses || 0) + 1;
    transaction.update(couponRef, { uses: newUses });
  });

  return { success: true };
}); 