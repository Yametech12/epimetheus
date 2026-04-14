import { useRef, useState, useEffect } from 'react';
import { X, Download, Share2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import Logo from './Logo';

interface ProfileCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessmentsCount: number;
  achievementsCount?: number;
  fieldReportsCount?: number;
}

export default function ProfileCardModal({ isOpen, onClose, assessmentsCount, achievementsCount = 0, fieldReportsCount = 0 }: ProfileCardModalProps) {
  const { user, userData } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    const loadPhoto = async () => {
      const sourceUrl = user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'O'}&background=random`;
      
      if (sourceUrl.startsWith('data:')) {
        setPhotoDataUrl(sourceUrl);
        return;
      }

      const fetchAsBase64 = async (url: string): Promise<string> => {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };

      try {
        const base64 = await fetchAsBase64(sourceUrl);
        setPhotoDataUrl(base64);
      } catch (error) {
        console.error("Failed to load photo as blob for export:", error);
        // Fallback to a guaranteed CORS-friendly URL if fetch fails
        try {
          const fallbackUrl = `https://ui-avatars.com/api/?name=${user?.displayName || 'O'}&background=random`;
          const fallbackBase64 = await fetchAsBase64(fallbackUrl);
          setPhotoDataUrl(fallbackBase64);
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError);
          // Ultimate fallback: a transparent pixel or simple SVG data URL
          setPhotoDataUrl('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
        }
      }
    };

    loadPhoto().catch(err => {
      console.error("Unhandled error in ProfileCardModal loadPhoto:", err);
    });
  }, [isOpen, user?.photoURL, user?.displayName]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        backgroundColor: '#0a0a0a',
        pixelRatio: 2,
        cacheBust: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        }
      });
      const link = document.createElement('a');
      link.download = `epimetheus-profile-${user?.displayName || 'operative'}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Profile card downloaded!');
    } catch (error: any) {
      console.error('Error generating card:', error);
      toast.error(`Failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyLink = () => {
    // In a real app, this would be a unique public profile link
    const profileLink = `${window.location.origin}/profiles`;
    navigator.clipboard.writeText(profileLink);
    setCopied(true);
    toast.success('Profile link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-4">
        <div className="flex justify-end">
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* The Card to Export */}
        <div 
          ref={cardRef}
          className="relative overflow-hidden rounded-3xl bg-mystic-900 border border-white/10 p-6 sm:p-8 shadow-2xl"
        >
          <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-accent-primary/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-accent-secondary/10 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 space-y-8">
            <div className="flex justify-between items-start gap-4">
              <Logo size="sm" className="glow-accent shrink-0" />
              <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center shrink-0">
                Operative Profile
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-6">
              <img 
                src={photoDataUrl || user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'O'}&background=random`} 
                alt="Profile" 
                className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl border-2 border-white/10 object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-2xl font-bold text-white truncate">{userData?.displayName || user?.displayName || 'Operative'}</h2>
                <p className="text-[11px] sm:text-sm text-accent-primary font-mono truncate mt-0.5">{user?.email}</p>
              </div>
            </div>

            {userData?.bio && (
              <p className="text-sm text-slate-300 italic border-l-2 border-accent-primary/50 pl-4">
                "{userData.bio}"
              </p>
            )}

            <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 border-t border-white/10">
              <div className="p-2 sm:p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                <div className="text-xl sm:text-2xl font-black text-white">{assessmentsCount}</div>
                <div className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Calibrations</div>
              </div>
              <div className="p-2 sm:p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                <div className="text-xl sm:text-2xl font-black text-accent-primary">{fieldReportsCount}</div>
                <div className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Reports</div>
              </div>
              <div className="p-2 sm:p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                <div className="text-xl sm:text-2xl font-black text-accent-secondary">{achievementsCount}</div>
                <div className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Badges</div>
              </div>
            </div>

            <div className="text-center pt-4">
              <p className="text-[10px] text-slate-500 font-mono">EPIMETHEUS SYSTEM • {new Date().getFullYear()}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleDownload}
            disabled={isExporting || !photoDataUrl}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-accent-primary text-white font-bold shadow-lg shadow-accent-primary/20 hover:bg-accent-primary/90 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Generating...' : (!photoDataUrl ? 'Loading...' : 'Download Card')}
          </button>
          <button
            onClick={handleCopyLink}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Share Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
