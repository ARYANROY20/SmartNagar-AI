import React, { useEffect, useState } from 'react';
import { getUserProfile } from '../services/api.js';

export default function UserNameLabel({ userId }) {
  const [userName, setUserName] = useState('Unknown User');

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    const fetchUser = async () => {
      try {
        const user = await getUserProfile(userId);
        if (isMounted) {
          setUserName(user.name || user.email || user.firebaseUid);
        }
      } catch (error) {
        console.error('Could not fetch user name for', userId);
      }
    };
    fetchUser();

    return () => { isMounted = false; };
  }, [userId]);

  return <p className="text-xs text-gray-500 mt-0.5 truncate">Reported by: <span className="font-medium text-gray-700">{userName}</span></p>;
}
