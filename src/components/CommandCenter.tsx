import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Command, ArrowRight, User, 
  Target, Map, Shield, BookA, 
  Zap, Sparkles, Users, Star, PieChart,
  Crosshair, MessageSquare, Activity,
  GitCompare, Brain, Compass, BookOpen
} from 'lucide-react';
import { personalityTypes } from '../data/personalityTypes';
import { useAuth } from '../context/AuthContext';
import { LogoIcon } from './Logo';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'profile' | 'page' | 'report' | 'term';
  path: string;
  icon: any;
}

const PAGES = [
  { title: 'Home', path: '/', icon: LogoIcon, desc: 'Dashboard and Profiler' },
  { title: 'Profiles', path: '/profiles', icon: User, desc: 'Browse all archetypes' },
  { title: 'Dossiers', path: '/dossiers', icon: Users, desc: 'Saved profiles' },
  { title: 'Favorites', path: '/favorites', icon: Star, desc: 'Saved favorites' },
  { title: 'Insights', path: '/insights', icon: PieChart, desc: 'User insights' },
  { title: 'Profiler', path: '/profiler', icon: Crosshair, desc: 'Assessment tool' },
  { title: 'Decryptor', path: '/decryptor', icon: MessageSquare, desc: 'Text message decryptor' },
  { title: 'Simulation', path: '/simulation', icon: Activity, desc: 'Chat simulation' },
  { title: 'Calibration', path: '/calibration', icon: Target, desc: 'The Oracle & Practice' },
  { title: 'Advisor', path: '/advisor', icon: Shield, desc: 'Strategic AI intelligence' },
  { title: 'Compare', path: '/compare', icon: GitCompare, desc: 'Compare profiles' },
  { title: 'Quiz', path: '/quiz', icon: Brain, desc: 'Knowledge quiz' },
  { title: 'Guide', path: '/guide', icon: Compass, desc: 'The Pandora\'s Box System' },
  { title: 'Field Guide', path: '/field-guide', icon: Map, desc: 'Scenarios & Reports' },
  { title: 'Encyclopedia', path: '/encyclopedia', icon: BookOpen, desc: 'Deep-dive into types' },
  { title: 'Glossary', path: '/glossary', icon: BookA, desc: 'System terminology' },
  { title: 'Quick Reference', path: '/quick-reference', icon: Zap, desc: 'Cheat sheets' },
];

export default function CommandCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { user: _user } = useAuth();

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  const results: SearchResult[] = React.useMemo(() => [
    ...PAGES.map(p => ({
      id: p.path,
      title: p.title,
      description: p.desc,
      type: 'page' as const,
      path: p.path,
      icon: p.icon
    })),
    ...personalityTypes.map(p => ({
      id: p.id,
      title: `${p.id}: ${p.name}`,
      description: p.tagline,
      type: 'profile' as const,
      path: `/encyclopedia?type=${p.id}`,
      icon: User
    }))
  ].filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.description.toLowerCase().includes(query.toLowerCase())
  ), [query]);

  const handleSelect = (path: string) => {
    navigate(path);
    setIsOpen(false);
    setQuery('');
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex].path);
      }
    }
  };

  return (
    <>
      <button 
        onClick={toggle}
        className="fixed bottom-8 right-8 z-[100] w-14 h-14 rounded-full accent-gradient text-white shadow-2xl shadow-accent-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
        title="Command Center (Cmd+K)"
      >
        <Command className="w-6 h-6 group-hover:rotate-12 transition-transform" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4">
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-mystic-950/80 backdrop-blur-md"
          />

          <div
            className="w-full max-w-2xl bg-mystic-900 border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative z-10"
          >
            <div className="p-4 border-b border-white/10 flex items-center gap-4">
              <Search className="w-5 h-5 text-slate-500" />
              <input
                autoFocus
                type="text"
                placeholder="Search types, tools, or navigation..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-none text-white placeholder:text-slate-600 focus:outline-none text-lg"
              />
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-slate-500">
                <span className="text-xs">ESC</span>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-hide" data-lenis-prevent>
              {results.length > 0 ? (
                <div className="space-y-1">
                  {results.map((result, index) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result.path)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        "w-full flex items-center gap-4 p-3 rounded-xl transition-all text-left group",
                        selectedIndex === index ? "bg-accent-primary/10 border-accent-primary/20" : "bg-transparent border-transparent"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        selectedIndex === index ? "bg-accent-primary text-white" : "bg-white/5 text-slate-500"
                      )}>
                        <result.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-bold transition-colors",
                            selectedIndex === index ? "text-white" : "text-slate-300"
                          )}>
                            {result.title}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 bg-white/5 px-1.5 py-0.5 rounded">
                            {result.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{result.description}</p>
                      </div>
                      {selectedIndex === index && (
                        <ArrowRight className="w-4 h-4 text-accent-primary animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                    <Search className="w-8 h-8 text-slate-700" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-white font-bold">No results found</p>
                    <p className="text-sm text-slate-500">Try searching for "TDI", "Advisor", or "ETS"</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <div className="flex gap-4">
                <span className="flex items-center gap-1"><span className="bg-white/10 px-1 rounded text-white">↑↓</span> to navigate</span>
                <span className="flex items-center gap-1"><span className="bg-white/10 px-1 rounded text-white">ENTER</span> to select</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-accent-primary" />
                Epimetheus Command
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
