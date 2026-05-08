import React, { useEffect, useState, useRef } from 'react';
import { Shield, Award, MapPin, Target, Settings, HelpCircle, Bell, User as UserIcon, Camera, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { updateProfile } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { UserAvatar } from '../components/UserAvatar';

export default function Profile() {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();
  const [reportedCount, setReportedCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'complaints'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReportedCount(snapshot.size);
      let resolved = 0;
      snapshot.forEach(doc => {
        if (doc.data().status === 'Resolved') {
          resolved++;
        }
      });
      setResolvedCount(resolved);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'complaints');
    });

    return () => unsubscribe();
  }, [user]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const maxDim = 400; // Profile pics don't need to be massive
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
            setPhotoPreview(compressedBase64);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const updates: any = {};
      
      if (editName.trim() !== user.displayName) {
        updates.name = editName.trim();
      }
      if (photoPreview) {
         updates.photoURL = photoPreview;
      }

      if (Object.keys(updates).length > 0) {
        // Update user doc in Firestore
        await updateDoc(userDocRef, updates);
        
        // Update Firebase Auth profile
        if (updates.name) {
          await updateProfile(user, {
            displayName: updates.name
          });
        }
      }

      setIsEditing(false);
      window.location.reload();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="p-5 flex flex-col items-center justify-center min-h-full text-center animate-in fade-in zoom-in duration-300 pb-20">
        <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-6 ring-8 ring-gray-50/50">
          <UserIcon className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Your Profile</h2>
        <p className="text-gray-500 text-sm mt-2 max-w-[280px] mx-auto leading-relaxed mb-8">
          Sign in to view your trust score, track your reported issues, and manage your account settings.
        </p>
        <button 
          onClick={() => navigate('/auth')}
          className="bg-blue-600 text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3 w-full max-w-[280px] mx-auto"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="p-4 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between mb-4 mt-2">
          <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
          <button 
            onClick={() => { setIsEditing(false); setPhotoPreview(null); }}
            className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <UserAvatar 
              photoURL={photoPreview || userData?.photoURL || user?.photoURL}
              name={userData?.name || user?.displayName}
              email={user?.email}
              className="w-28 h-28 text-4xl border-4 border-white shadow-md"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-8 h-8 text-white" />
            </div>
            <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full ring-4 ring-white shadow-sm">
               <Camera className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Change Photo</span>
          
          <input 
            type="file" 
            accept="image/*" 
            capture="user"
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleImageChange} 
          />
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              Display Name
            </label>
            <input 
              type="text" 
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="What should we call you?"
              className="w-full bg-white border border-gray-200 text-gray-800 py-4 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="pt-8">
          <button 
            onClick={saveProfile}
            disabled={isSaving || !editName.trim()}
            className="w-full bg-blue-600 disabled:bg-blue-400 text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {isSaving ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Profile Header */}
      <div className="flex flex-col items-center justify-center text-center space-y-2 py-4">
        <div className="relative">
          <UserAvatar 
            photoURL={userData?.photoURL || user?.photoURL}
            name={userData?.name || user?.displayName}
            email={user?.email}
            className="w-20 h-20 text-3xl border-4 border-white shadow-md"
          />
          <div className="absolute -bottom-2 bg-green-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full ring-2 ring-white uppercase tracking-wider text-center flex justify-center items-center left-1/2 -translate-x-1/2">
            Verified
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 mt-2">{userData?.name || user?.displayName || "Citizen"}</h2>
          <p className="text-xs text-gray-500 font-medium flex items-center justify-center gap-1">
            {user?.email || "No email"}
          </p>
        </div>
      </div>

      {/* Trust Score Card */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 border border-blue-200 shadow-sm relative overflow-hidden">
        <div className="absolute -right-4 -top-4 text-blue-200/50">
          <Shield className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex justify-between items-end">
          <div>
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Trust Score</p>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black text-blue-600 tracking-tighter">{userData?.trustScore ?? 100}</span>
              <span className="text-sm font-bold text-blue-400">/100+</span>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white mb-1 shadow-md shadow-blue-500/30">
              <Shield className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-blue-800">
              {(userData?.trustScore ?? 100) >= 150 ? 'Elite Status' : 
               (userData?.trustScore ?? 100) >= 120 ? 'Trusted Citizen' : 'Active Citizen'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col justify-center">
          <Target className="w-5 h-5 text-purple-500 mb-2" />
          <div className="text-xs font-medium text-gray-500 mb-0.5">Issues Reported</div>
          <div className="text-2xl font-bold text-gray-900">{reportedCount}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col justify-center">
          <Award className="w-5 h-5 text-green-500 mb-2" />
          <div className="text-xs font-medium text-gray-500 mb-0.5">Resolved Issues</div>
          <div className="text-2xl font-bold text-gray-900">{resolvedCount}</div>
        </div>
      </div>

      {/* Settings Links */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <SettingsLink 
          onClick={() => {
            setEditName(userData?.name || user?.displayName || '');
            setPhotoPreview(null);
            setIsEditing(true);
          }} 
          icon={<UserIcon className="w-4 h-4" />} 
          label="Edit Profile" 
        />
        <SettingsLink icon={<Settings className="w-4 h-4" />} label="Account Settings" />
        <SettingsLink icon={<Bell className="w-4 h-4" />} label="Notification Preferences" />
        <SettingsLink icon={<HelpCircle className="w-4 h-4" />} label="Support & Help" />
        <SettingsLink onClick={() => { logout(); navigate('/'); }} icon={<svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>} label="Log Out" isLast className="text-red-600" />
      </div>

    </div>
  );
}

function SettingsLink({ icon, label, isLast = false, onClick, className }: { icon: React.ReactNode, label: string, isLast?: boolean, onClick?: () => void, className?: string }) {
  return (
    <button onClick={onClick} className={cn(
      "w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors",
      !isLast && "border-b border-gray-50"
    )}>
      <div className={cn("flex items-center gap-3 text-sm font-medium text-gray-700", className)}>
        <div className="text-gray-400">{icon}</div>
        {label}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </button>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>    
}

