import React from 'react';
import { cn } from '../lib/utils';

export function UserAvatar({ photoURL, name, email, className, onClick, title }) {
  const getInitials = () => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length > 1) {
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
      }
      return parts[0].charAt(0).toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return '?';
  };

  if (photoURL && !photoURL.includes('unsplash')) {
    return (
      <img
        src={photoURL}
        onClick={onClick}
        alt={name || "User Avatar"}
        title={title}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }

  const getBgColor = () => {
    const letters = getInitials();
    const colors = [
      'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500', 'bg-emerald-500', 
      'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 
      'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
    ];
    let sum = 0;
    for (let i = 0; i < letters.length; i++) {
        sum += letters.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  return (
    <div
      onClick={onClick}
      title={title}
      className={cn(
        "flex items-center justify-center rounded-full text-white font-bold select-none",
        getBgColor(),
        className
      )}
    >
      <span className="opacity-90">{getInitials()}</span>
    </div>
  );
}
