import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';

interface AuthContextType {
  user: FirebaseUser | null;
  role: 'citizen' | 'admin' | null;
  userData: any | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [role, setRole] = useState<'citizen' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          let userDoc;
          
          try {
             userDoc = await getDoc(userDocRef);
          } catch (e) {
             handleFirestoreError(e, OperationType.GET, `users/${firebaseUser.uid}`);
          }
          
          if (userDoc && userDoc.exists()) {
            setRole(userDoc.data().role as 'citizen' | 'admin');
            setUserData(userDoc.data());
          } else if (userDoc && !userDoc.exists()) {
            // New user registration
            const newUser = {
              email: firebaseUser.email || '',
              role: 'citizen', // Enforced by rules
              name: firebaseUser.displayName || 'Anonymous',
              trustScore: 100,
              createdAt: serverTimestamp()
            };
            
            try {
               await setDoc(userDocRef, newUser);
            } catch (e) {
               handleFirestoreError(e, OperationType.CREATE, `users/${firebaseUser.uid}`);
            }
            
            setRole('citizen');
            setUserData(newUser);
          }
          
          // Temporary Admin override for bootstrapped email
          if (firebaseUser.email === 'asadhasan1709@gmail.com') {
             setRole('admin');
          }
          
        } catch (e) {
          console.error(e);
          setRole('citizen'); // Fallback
        }
      } else {
        setRole(null);
        setUserData(null);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(res.user, { displayName: name });
    setTimeout(async () => {
      try {
        await updateDoc(doc(db, 'users', res.user.uid), { name: name });
      } catch (e) {
        console.error("Could not update name after registration", e);
      }
    }, 2000);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, userData, loading, loginWithGoogle, signInWithEmail, signUpWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
