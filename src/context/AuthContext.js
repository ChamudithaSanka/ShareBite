import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setSignedOut(false);
        setUser(firebaseUser);
        try {
          const docSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          }
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    setSignedOut(true);
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      setSignedOut(false);
      console.error('Sign out error:', error);
    }
  };

  const updateUserProfile = async (updates) => {
    if (!user) return;

    await updateDoc(doc(db, 'users', user.uid), updates);
    setUserProfile((currentProfile) => ({ ...currentProfile, ...updates }));
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signedOut, signOut, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
