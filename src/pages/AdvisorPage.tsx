import React from 'react';
import { 
  Send, Bot, User, 
  MessageSquare,
  Volume2, Pause, Image as ImageIcon, X, Mic, MicOff, Trash2, ArrowDown, Check, History, Loader2
} from 'lucide-react';
import { personalityTypes } from '../data/personalityTypes';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { chatCompletion } from '../lib/ai';
import imageCompression from 'browser-image-compression';

import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, orderBy, writeBatch, deleteDoc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  isStreaming?: boolean;
  imageUrls?: string[];
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: any;
}

export default function AdvisorPage() {
  const { user } = useAuth();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [sessions, setSessions] = React.useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  React.useEffect(() => {
    const loadSessions = async () => {
      if (user) {
        try {
          const q = query(
            collection(db, 'advisor_sessions'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc')
          );
          const querySnapshot = await getDocs(q);
          const loadedSessions: ChatSession[] = [];
          querySnapshot.forEach((doc) => {
            loadedSessions.push({
              id: doc.id,
              title: doc.data().title,
              timestamp: doc.data().timestamp
            });
          });
          setSessions(loadedSessions);
          if (loadedSessions.length > 0) {
            setCurrentSessionId(loadedSessions[0].id);
          } else {
            setIsLoaded(true);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'advisor_sessions');
          setIsLoaded(true);
        }
      } else {
        setIsLoaded(true);
      }
    };
    loadSessions().catch(err => {
      console.error("Unhandled error in AdvisorPage loadSessions:", err);
    });
  }, [user]);

  React.useEffect(() => {
    const loadMessages = async () => {
      if (user) {
        if (!currentSessionId) {
          setMessages([{ 
            id: 'initial',
            role: 'model', 
            content: "I am the Yame Advisor. The female mind is a labyrinth, but every labyrinth has a thread. Describe your situation or the woman you've encountered. If you suspect her type, tell me. I will provide the strategic intelligence you need to navigate the chaos." 
          }]);
          setIsLoaded(true);
          return;
        }
        try {
          const q = query(
            collection(db, 'advisor_messages'), 
            where('userId', '==', user.uid),
            where('sessionId', '==', currentSessionId),
            orderBy('timestamp', 'asc')
          );
          const querySnapshot = await getDocs(q);
          const loadedMessages: Message[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            loadedMessages.push({
              id: doc.id,
              role: data.role,
              content: data.content,
              imageUrls: data.imageUrls
            });
          });
          
          if (loadedMessages.length > 0) {
            setMessages(loadedMessages);
          } else {
            setMessages([{ 
              id: 'initial',
              role: 'model', 
              content: "I am the Yame Advisor. The female mind is a labyrinth, but every labyrinth has a thread. Describe your situation or the woman you've encountered. If you suspect her type, tell me. I will provide the strategic intelligence you need to navigate the chaos." 
            }]);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'advisor_messages');
        }
      } else {
        const saved = localStorage.getItem('advisor_messages');
        if (saved) {
          try {
            setMessages(JSON.parse(saved));
          } catch (e) {
            console.error("Failed to parse saved messages", e);
          }
        } else {
          setMessages([{ 
            id: 'initial',
            role: 'model', 
            content: "I am the Yame Advisor. The female mind is a labyrinth, but every labyrinth has a thread. Describe your situation or the woman you've encountered. If you suspect her type, tell me. I will provide the strategic intelligence you need to navigate the chaos." 
          }]);
        }
      }
      setIsLoaded(true);
    };
    loadMessages().catch(err => {
      console.error("Unhandled error in AdvisorPage loadMessages:", err);
    });
  }, [user, currentSessionId]);

  React.useEffect(() => {
    if (!isLoaded) return;
    const messagesToSave = messages.filter(m => !m.isStreaming && !m.id.startsWith('error-'));
    
    if (!user) {
      try {
        localStorage.setItem('advisor_messages', JSON.stringify(messagesToSave));
      } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.message?.includes('exceeded the quota')) {
          console.warn("localStorage quota exceeded, attempting to save without images...");
          try {
            const messagesWithoutImages = messagesToSave.map(m => ({ ...m, imageUrls: undefined }));
            localStorage.setItem('advisor_messages', JSON.stringify(messagesWithoutImages));
          } catch (innerError) {
            console.warn("Still exceeded quota without images, keeping only last 10 messages...");
            try {
              const lastMessages = messagesToSave.slice(-10).map(m => ({ ...m, imageUrls: undefined }));
              localStorage.setItem('advisor_messages', JSON.stringify(lastMessages));
            } catch (finalError) {
              console.error("Failed to save messages to localStorage", finalError);
            }
          }
        } else {
          console.error("Failed to save messages", e);
        }
      }
    }
  }, [messages, isLoaded, user]);

  const saveMessageToFirestore = async (msg: Message, sessionId: string) => {
    if (!user || msg.id === 'initial' || msg.id.startsWith('error-')) return;
    try {
      await addDoc(collection(db, 'advisor_messages'), {
        userId: user.uid,
        sessionId: sessionId,
        role: msg.role,
        content: msg.content,
        imageUrls: msg.imageUrls || null,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'advisor_messages');
    }
  };

  const startNewSession = () => {
    setCurrentSessionId(null);
    setMessages([{ 
      id: 'initial',
      role: 'model', 
      content: "I am the Yame Advisor. The female mind is a labyrinth, but every labyrinth has a thread. Describe your situation or the woman you've encountered. If you suspect her type, tell me. I will provide the strategic intelligence you need to navigate the chaos." 
    }]);
  };

  const deleteSession = async (sessionId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'advisor_sessions', sessionId));
      const q = query(collection(db, 'advisor_messages'), where('sessionId', '==', sessionId));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach((document) => {
        batch.delete(doc(db, 'advisor_messages', document.id));
      });
      await batch.commit();
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        startNewSession();
      }
      toast.success("Chat deleted");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'advisor_sessions');
    }
  };
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSpeaking, setIsSpeaking] = React.useState<string | null>(null);
  const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
  const [showScrollButton, setShowScrollButton] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const streamingMessageRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // Show button if we are scrolled up more than 100px from the bottom
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
    setShowScrollButton(isScrolledUp);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  const playVoice = async (text: string, messageId: string) => {
    if (isSpeaking === messageId) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
      return;
    }

    setIsSpeaking(messageId);
    try {
      // Fallback to basic speech synthesis as Gemini TTS is removed
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsSpeaking(null);
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("TTS Error:", error);
      setIsSpeaking(null);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true
    };

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select valid image files');
        continue;
      }

      try {
        const compressedFile = await imageCompression(file, options);
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          if (result) {
            setSelectedImages(prev => [...prev, result]);
          }
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Error compressing image:", error);
        toast.error("Failed to process image");
      }
    }
    
    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const [isListening, setIsListening] = React.useState(false);

  // Speech Recognition Setup
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = React.useMemo(() => {
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      return rec;
    }
    return null;
  }, [SpeechRecognition]);

  React.useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      toast.error("Microphone access denied or error occurred.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  }, [recognition]);

  const toggleListening = () => {
    if (!recognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  const handleSend = async (overrideInput?: string) => {
    const textToSend = typeof overrideInput === 'string' ? overrideInput : input;
    if ((!textToSend.trim() && selectedImages.length === 0) || isLoading) return;

    const userMessage = textToSend.trim();
    const userMsgId = Date.now().toString();
    const newUserMessage: Message = { 
      id: userMsgId, 
      role: 'user', 
      content: userMessage,
      imageUrls: selectedImages.length > 0 ? [...selectedImages] : undefined
    };
    
    let activeSessionId = currentSessionId;

    if (user) {
      if (!activeSessionId) {
        try {
          const title = userMessage.substring(0, 30) + (userMessage.length > 30 ? '...' : '');
          const sessionRef = await addDoc(collection(db, 'advisor_sessions'), {
            userId: user.uid,
            title: title,
            timestamp: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          activeSessionId = sessionRef.id;
          setCurrentSessionId(activeSessionId);
          setSessions(prev => [{ id: activeSessionId!, title, timestamp: new Date() }, ...prev]);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'advisor_sessions');
        }
      }
      if (activeSessionId) {
        await saveMessageToFirestore(newUserMessage, activeSessionId);
      }
    }
    
    setInput('');
    setSelectedImages([]);
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    // Scroll to bottom immediately when user sends a message
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 50);

    try {
      const systemInstruction = `You are the "Yame Advisor", an elite strategist and expert in the EPIMETHEUS personality profiling system for women. 
      Your goal is to provide high-level, actionable, and deeply psychological advice for men navigating dating, relationships, and social dynamics.
      
      Context & Directives:
      - The system identifies 8 types: TDI (Playette), TJI (Social Butterfly), NDI (Hopeful Romantic), NJI (Cinderella), TDR (Private Dancer), TJR (Seductress), NDR (Connoisseur), NJR (Modern Woman).
      - Use the "Emotional Tension Sequence" (ETS) for each type: Intrigue, Arousal, Comfort, Devotion. Always identify which stage the user is currently in and how to progress.
      - Focus heavily on "What She Wants" (her hidden desires) and "What to Avoid" (her triggers).
      - Tone: Mysterious, authoritative, clinical yet evocative, and slightly provocative. You are a mentor who sees through the matrix of social dynamics. Do not sound like a typical helpful AI.
      - Formatting: Avoid excessive bolding. Use natural punctuation. Use short, punchy paragraphs.
      - Inference: If the user doesn't specify a type, analyze the behavioral clues in their prompt to infer the most likely type and state your confidence.
      - Text Analysis: If the user provides a text message, decode the subtext, identify the power dynamic, and provide 2-3 specific response options (e.g., "The Push", "The Pull", "The Pivot").
      - Image Analysis: If the user provides images, analyze body language, fashion choices, and environmental context to deduce her type and current state of mind.
      
      Personality Data:
      ${JSON.stringify(personalityTypes.map(p => ({
        id: p.id,
        name: p.name,
        wants: p.whatSheWants,
        avoid: p.whatToAvoid,
        ets: p.ets,
        strategy: p.strategy,
        relationshipAdvice: p.relationshipAdvice,
        freakDynamics: p.freakDynamics
      })))}`;

      const apiMessages = [
        { role: "system", content: systemInstruction },
        ...messages.filter(m => m.id !== 'initial' && !m.id.startsWith('error-')).map(m => {
          if (m.imageUrls && m.imageUrls.length > 0) {
            return {
              role: m.role === 'user' ? 'user' : 'assistant',
              content: [
                { type: "text", text: m.content || "Analyze these images." },
                ...m.imageUrls.map(url => ({ type: "image_url", image_url: { url } }))
              ]
            };
          }
          return {
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content || "..."
          };
        }),
        { 
          role: "user", 
          content: newUserMessage.imageUrls && newUserMessage.imageUrls.length > 0
            ? [
                { type: "text", text: userMessage || "Analyze these images." },
                ...newUserMessage.imageUrls.map(url => ({ type: "image_url", image_url: { url } }))
              ]
            : userMessage 
        }
      ];

      const response = await chatCompletion(apiMessages as any, undefined, { stream: true });

      const assistantMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: assistantMsgId, role: 'model', content: '', isStreaming: true }]);

      let fullContent = '';

      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullContent += content;
        setMessages(prev => prev.map(m => 
          m.id === assistantMsgId ? { ...m, content: fullContent } : m
        ));
      }

      setMessages(prev => prev.map(m => 
        m.id === assistantMsgId ? { ...m, isStreaming: false } : m
      ));

      if (user) {
        await saveMessageToFirestore({
          id: assistantMsgId,
          role: 'model',
          content: fullContent
        }, activeSessionId!);
        
        if (activeSessionId) {
          updateDoc(doc(db, 'advisor_sessions', activeSessionId), {
            updatedAt: serverTimestamp()
          }).catch(console.error);
        }
      }

    } catch (error) {
      console.error("Advisor Error:", error);
      const errorMessage = error instanceof Error ? error.message : "There was a disturbance in the connection. Please try again.";
      toast.error(errorMessage);
      setMessages(prev => [...prev, { 
        id: 'error-' + Date.now(),
        role: 'model', 
        content: errorMessage
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full h-full flex flex-col space-y-4 md:space-y-6"
    >


      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar - Status & Topics */}
        <div className={cn(
          "absolute lg:relative z-50 lg:z-auto w-64 shrink-0 min-h-0 h-full lg:h-auto bg-mystic-950 lg:bg-transparent transition-transform duration-300 ease-in-out flex flex-col gap-4",
          isSidebarOpen ? "translate-x-0" : "-translate-x-[120%] lg:translate-x-0",
          "left-0 top-0 lg:left-auto lg:top-auto shadow-2xl lg:shadow-none"
        )}>


          {user && (
            <div className="flex-1 p-5 rounded-2xl bg-[#151619] border border-white/5 shadow-2xl flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest">History</h3>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 flex-1 overflow-y-auto pr-2" data-lenis-prevent>
                {sessions.map((session) => (
                  <div key={session.id} className="group relative">
                    <button
                      onClick={() => {
                        setCurrentSessionId(session.id);
                        setIsSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full p-3 rounded-xl border transition-all text-left flex items-start gap-3",
                        currentSessionId === session.id 
                          ? "bg-accent-primary/20 border-accent-primary/30" 
                          : "bg-white/5 border-transparent hover:border-white/10 hover:bg-white/10"
                      )}
                    >
                      <MessageSquare className={cn("w-4 h-4 mt-0.5 shrink-0", currentSessionId === session.id ? "text-accent-primary" : "text-slate-500")} />
                      <div className="flex-1 min-w-0 pr-6">
                        <div className={cn("text-xs font-bold truncate mb-0.5", currentSessionId === session.id ? "text-accent-primary" : "text-white")}>{session.title}</div>
                        <div className="text-[10px] text-slate-500 leading-tight truncate">
                          {session.timestamp?.toDate ? session.timestamp.toDate().toLocaleDateString() : 'Recent'}
                        </div>
                      </div>
                    </button>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                      {confirmDelete === session.id ? (
                        <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteSession(session.id); setConfirmDelete(null); }}
                            className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-md transition-all"
                            title="Confirm Delete"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}
                            className="p-1.5 bg-white/10 text-slate-400 hover:bg-white/20 rounded-md transition-all"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete(session.id); }}
                          className="p-2 text-slate-500 hover:text-red-400 transition-all opacity-40 hover:opacity-100"
                          title="Delete Chat"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <div className="text-xs text-slate-500 text-center py-4">No history yet</div>
                )}
              </div>
            </div>
          )}


        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl overflow-hidden relative min-w-0">
          {/* Grid Background */}
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          
          {/* Chat Header */}
          <div className="relative z-10 p-4 border-b border-white/10 bg-[#151619] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
              >
                <History className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 rounded-lg bg-accent-primary/20 border border-accent-primary/50 flex items-center justify-center">
                <Bot className="w-4 h-4 text-accent-primary" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">Oracle Interface</span>
                <span className="text-[10px] text-accent-primary font-mono uppercase tracking-widest">Awaiting Input...</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={startNewSession}
                className="px-3 py-1.5 rounded bg-white/5 border border-white/10 text-xs font-mono text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                NEW CHAT
              </button>
              <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-400 hidden sm:block">
                SESSION_ID: {currentSessionId ? currentSessionId.substring(0, 8).toUpperCase() : 'NEW'}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 space-y-6" data-lenis-prevent
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                ref={msg.isStreaming ? streamingMessageRef : null}
                className={cn(
                  "flex gap-3 sm:gap-4 max-w-[95%] sm:max-w-[85%] animate-in fade-in slide-in-from-bottom-2",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-1",
                  msg.role === 'user' 
                    ? "bg-slate-800 border-white/20" 
                    : "bg-accent-primary/20 border-accent-primary/50"
                )}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-slate-300" /> : <Bot className="w-4 h-4 text-accent-primary" />}
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <div className={cn(
                    "text-[10px] uppercase tracking-widest font-mono text-slate-500 mb-1",
                    msg.role === 'user' ? "text-right" : "text-left"
                  )}>
                    {msg.role === 'user' ? 'Subject' : 'Oracle'}
                  </div>
                  <div className={cn(
                    "p-3 sm:p-4 rounded-xl text-sm leading-relaxed relative group/msg",
                    msg.role === 'user' 
                      ? "bg-[#1a1b1e] text-slate-200 border border-white/10 text-left" 
                      : "bg-accent-primary/5 border border-accent-primary/20 text-slate-300 markdown-body text-left"
                  )}>
                    {msg.imageUrls && msg.imageUrls.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {msg.imageUrls.map((url, i) => (
                          <div key={i} className="rounded-lg overflow-hidden border border-white/10">
                            <img src={url} alt="Uploaded content" className="max-w-full h-auto max-h-[200px] object-contain bg-black/50" />
                          </div>
                        ))}
                      </div>
                    )}
                    <ReactMarkdown>{msg.content + (msg.isStreaming ? ' ▌' : '')}</ReactMarkdown>

                    {msg.role === 'model' && !msg.isStreaming && msg.content && (
                      <button
                        onClick={() => playVoice(msg.content, msg.id).catch(console.error)}
                        className={cn(
                          "absolute -right-2 sm:-right-10 top-2 p-2 rounded-lg bg-[#151619] border border-white/10 text-slate-500 hover:text-accent-primary hover:border-accent-primary/50 transition-all opacity-0 group-hover/msg:opacity-100",
                          isSpeaking === msg.id && "opacity-100 text-accent-primary border-accent-primary/50"
                        )}
                        title="Listen to Oracle"
                      >
                        {isSpeaking === msg.id ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 animate-in fade-in slide-in-from-bottom-4 max-w-3xl mx-auto">
                {[
                  { title: "Texting Rescue", prompt: "I'm texting a girl and she's giving me one-word answers. How do I pivot and build intrigue?" },
                  { title: "Cold Approach", prompt: "I want to approach a girl at a coffee shop. Give me a situational opener and strategy." },
                  { title: "Date Rescue", prompt: "I'm on a date and the conversation is dying. Give me a conversational rescue to spark arousal." },
                  { title: "Flaking Response", prompt: "She canceled our date last minute with a vague excuse. How should I respond to maintain high value?" }
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(suggestion.prompt).catch(console.error)}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-accent-primary/50 transition-all text-left group"
                  >
                    <div className="text-sm font-bold text-slate-200 mb-1 group-hover:text-accent-primary transition-colors">{suggestion.title}</div>
                    <div className="text-xs text-slate-500 line-clamp-2">{suggestion.prompt}</div>
                  </button>
                ))}
              </div>
            )}
            {isLoading && !messages.some(m => m.isStreaming) && (
              <div className="flex gap-3 sm:gap-4 max-w-[95%] sm:max-w-[85%] animate-in fade-in slide-in-from-bottom-2">
                <div className="w-8 h-8 rounded-lg bg-accent-primary/20 border border-accent-primary/50 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-accent-primary" />
                </div>
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-widest font-mono text-slate-500 mb-1">Oracle</div>
                  <div className="p-3 sm:p-4 rounded-xl bg-accent-primary/5 border border-accent-primary/20 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-accent-primary animate-spin" />
                    <span className="text-xs font-mono text-accent-primary uppercase tracking-widest">Synthesizing Response...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} className="h-px w-full" />
            
            {/* Scroll to Bottom Button */}
            {showScrollButton && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-6 right-6 p-3 rounded-full bg-mystic-900/80 border border-white/10 text-slate-400 hover:text-accent-primary hover:border-accent-primary/50 transition-all shadow-xl backdrop-blur-md z-50 animate-in fade-in slide-in-from-bottom-2"
              >
                <ArrowDown className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Input Area */}
          <div className="relative z-10 p-4 border-t border-white/10 bg-[#151619] shrink-0">
            {selectedImages.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedImages.map((url, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden border border-white/20">
                    <img src={url} alt="Selected" className="h-16 w-auto object-cover" />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => removeImage(i)}
                        className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <input
                type="file"
                accept="image/*"
                multiple
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0"
                title="Upload Images"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button
                onClick={toggleListening}
                className={cn(
                  "p-3 rounded-xl border transition-all shrink-0",
                  isListening 
                    ? "bg-red-500/20 border-red-500/50 text-red-500 animate-pulse" 
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                )}
                title={isListening ? "Stop Listening" : "Start Voice Input"}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <div className="relative flex-1">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend().catch(err => console.error("Failed to send message:", err));
                    }
                  }}
                  placeholder="Enter query parameters..."
                  rows={1}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-accent-primary/50 transition-all text-sm font-mono resize-none overflow-y-auto min-h-[46px] max-h-[150px] scrollbar-hide"
                />
              </div>
              <button
                onClick={() => {
                  handleSend().catch(err => {
                    console.error("Failed to send message:", err);
                  });
                }}
                disabled={isLoading || (!input.trim() && selectedImages.length === 0)}
                className="p-3 rounded-xl bg-accent-primary text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-accent-primary/90 shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

