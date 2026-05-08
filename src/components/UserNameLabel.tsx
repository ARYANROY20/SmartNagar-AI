import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function UserNameLabel({ userId }: { userId?: string }) {
  const [userName, setUserName] = useState<string>('Unknown User');

  useEffect(() => {
    if (!userId) return;
    
    let isMounted = true;
    const fetchUser = async () => {
      try {
        const userSnap = await getDoc(doc(db, 'users', userId));
        if (userSnap.exists() && isMounted) {
          setUserName(userSnap.data().name || 'Anonymous');
        }
      } catch (error) {
        // Suppress errors for non-existent users or perm issues during render
        console.error("Could not fetch user name for", userId);
      }
    };
    fetchUser();
    
    return () => { isMounted = false; };
  }, [userId]);

  return <p className="text-xs text-gray-500 mt-0.5 truncate">Reported by: <span className="font-medium text-gray-700">{userName}</span></p>;
}
