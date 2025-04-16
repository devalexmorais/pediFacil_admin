import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from './config/firebase';

export const setCurrentUserAsAdmin = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Nenhum usuário autenticado');
    }

    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(userRef, {
      email: currentUser.email,
      role: 'ADMIN',
      name: currentUser.displayName || 'Admin',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isActive: true
    });

    console.log('Usuário definido como admin com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao definir usuário como admin:', error);
    return false;
  }
}; 