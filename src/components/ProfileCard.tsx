import React, { useState } from 'react';
import { Camera, Loader2, User as UserIcon } from 'lucide-react';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';

const ProfileCard = () => {
  const { user, userData, updateUserData, updateUserProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Safe Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // 1. Immediate Visual Feedback (Optimistic UI)
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploading(true);

    try {
      // 2. Upload to Firebase Storage
      const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // 3. Update Firestore Profile
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        photoURL: downloadURL
      });

      // Update Firebase Auth profile
      await updateUserProfile({ photoURL: downloadURL });

      // Update local context state
      if (updateUserData) {
        await updateUserData({ photoURL: downloadURL });
      }

      toast.success("Profile photo updated successfully!");
    } catch (error) {
      console.error("Upload failed:", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      toast.error("Failed to upload image. Please try again.");
      setPreviewUrl(null); // Revert preview on failure
    } finally {
      setUploading(false);
    }
  };

  // Determine which image to show (Preview -> Firestore -> Default)
  const displayImage = previewUrl || userData?.photoURL;

  return (
    <div className="max-w-sm mx-auto bg-mystic-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      
      {/* Banner / Cover Area */}
      <div className="h-32 bg-gradient-to-r from-accent-primary to-accent-secondary relative">
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Profile Content */}
      <div className="px-6 pb-6 relative">
        
        {/* Avatar Container (Negative Margin to overlap banner) */}
        <div className="relative -mt-16 mb-4 flex justify-center">
          <div className="relative group w-32 h-32 rounded-full p-1 bg-mystic-900">
            
            {/* The Image */}
            <div className="relative w-full h-full rounded-full overflow-hidden bg-mystic-800 border-4 border-mystic-900">
              {displayImage ? (
                <img 
                  src={displayImage} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-mystic-500">
                  <UserIcon size={48} />
                </div>
              )}
              
              {/* Loading Overlay */}
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                  <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
                </div>
              )}

              {/* Hover Overlay (Camera Icon) */}
              {!uploading && (
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center backdrop-blur-[2px] z-10">
                  <Camera className="w-8 h-8 text-white mb-1 drop-shadow-lg" />
                  <span className="text-[10px] font-bold text-white tracking-wider uppercase drop-shadow-md">
                    Update
                  </span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* User Details */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-white">
            {userData?.displayName || user?.email?.split('@')[0] || 'Anonymous'}
          </h2>
          <p className="text-mystic-400 text-sm">
            {user?.email}
          </p>
          {userData?.role === 'admin' && (
            <div className="mt-2">
              <span className="px-2 py-0.5 rounded-full bg-accent-primary/20 text-accent-primary text-[10px] font-bold uppercase tracking-wider border border-accent-primary/30">
                Administrator
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <button className="flex-1 bg-white text-black font-semibold py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
            Edit Profile
          </button>
          <button className="flex-1 bg-mystic-800 text-white font-semibold py-2 border border-white/10 rounded-lg hover:bg-mystic-700 transition-colors text-sm">
            Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
