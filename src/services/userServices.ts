import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc,
  setDoc,
  query,
  where,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { auth } from '../config/firebase';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CUSTOMER' | 'SELLER';
  phone: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}

const usersCollection = collection(db, 'users');

export const createUser = async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(usersCollection, {
      ...userData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    throw new Error('Erro ao criar usuário');
  }
};

export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return null;
    }
    return { id: userDoc.id, ...userDoc.data() } as User;
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    throw new Error('Erro ao buscar usuário');
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const q = query(usersCollection, where('email', '==', email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    const userDoc = snapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() } as User;
  } catch (error) {
    console.error('Erro ao buscar usuário por email:', error);
    throw new Error('Erro ao buscar usuário');
  }
};

export const updateUser = async (userId: string, userData: Partial<User>): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...userData,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    throw new Error('Erro ao atualizar usuário');
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const snapshot = await getDocs(usersCollection);
    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data()
    } as User));
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    throw new Error('Erro ao carregar usuários');
  }
};

export const verifyAndFixUserRole = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }

    console.log('Verificando usuário:', currentUser.uid);

    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.log('Documento do usuário não existe, criando...');
      await setDoc(userRef, {
        email: currentUser.email,
        role: 'ADMIN',
        name: currentUser.displayName || 'Admin',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isActive: true
      });
      console.log('Documento do usuário criado com role ADMIN');
      return;
    }

    const userData = userDoc.data();
    console.log('Dados atuais do usuário:', userData);

    if (!userData.role || userData.role !== 'ADMIN') {
      console.log('Atualizando role para ADMIN...');
      await updateDoc(userRef, {
        role: 'ADMIN',
        updatedAt: Timestamp.now()
      });
      console.log('Role atualizada com sucesso');
    } else {
      console.log('Usuário já é ADMIN');
    }
  } catch (error) {
    console.error('Erro ao verificar/corrigir role:', error);
    throw error;
  }
}; 