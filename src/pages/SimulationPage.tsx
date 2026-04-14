import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Bot, Loader2, Play, Square, RefreshCw, Shield, Target, Award } from 'lucide-react';
import { personalityTypes } from '../data/personalityTypes';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { chatCompletion } from '../lib/ai';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function SimulationPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typeId, setTypeId] = useState(personalityTypes[0].id);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startSimulation = async () => {
    setIsActive(true);
    setMessages([]);
    setFeedback(null);
    setIsLoading(true);

    try {
      const selectedType = personalityTypes.find(p => p.id === typeId);

      const systemInstruction = `You are an AI simulating a woman with the "${selectedType?.name}" (${selectedType?.id}) personality type from the EPIMETHEUS framework.
      
      Key Traits: ${selectedType?.keyTraits.join(', ')}
      What She Wants: ${selectedType?.whatSheWants}
      What to Avoid: ${selectedType?.whatToAvoid.join(', ')}
      
      Your goal is to roleplay a conversation with the user. You should act exactly like this personality type.
      CRITICAL: You are a Filipina. You MUST use occasional Tagalog/Taglish words and expressions naturally (e.g., "grabe", "talaga", "naman", "ano ba", "sobra") to make the scenario authentic to a modern Filipina context.
      Start the conversation with a typical opening message or response to a dating app match.
      Keep your responses realistic, engaging, and true to the archetype. Do not break character.`;

      const initialMessage: Message = { id: 'sys', role: 'system', content: systemInstruction };
      
      const response = await chatCompletion([
        { role: 'system', content: systemInstruction }, 
        { role: 'user', content: 'Start the simulation.' }
      ], undefined, { max_tokens: 150 });

      const aiResponse = response.choices[0]?.message?.content || 'Hello.';
      
      setMessages([
        initialMessage,
        { id: Date.now().toString(), role: 'assistant', content: aiResponse }
      ]);

    } catch (error) {
      console.error("Simulation Error:", error);
      toast.error("Failed to start simulation.");
      setIsActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !isActive) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const apiMessages = messages.map(m => ({ role: m.role, content: m.content })).concat({ role: 'user', content: userMsg.content });

      const response = await chatCompletion(apiMessages as any, undefined, { max_tokens: 300 });

      const aiResponse = response.choices[0]?.message?.content || '...';
      
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: aiResponse }]);

    } catch (error) {
      console.error("Simulation Error:", error);
      toast.error("Failed to get response.");
    } finally {
      setIsLoading(false);
    }
  };

  const endSimulation = async () => {
    setIsActive(false);
    setIsLoading(true);

    try {
      const selectedType = personalityTypes.find(p => p.id === typeId);
      const conversationHistory = messages.filter(m => m.role !== 'system').map(m => `${m.role === 'user' ? 'User' : 'Target'}: ${m.content}`).join('\n');

      const feedbackInstruction = `You are an expert dating coach evaluating a roleplay simulation.
      The user was interacting with a simulated "${selectedType?.name}" (${selectedType?.id}) personality.
      
      Here is the conversation transcript:
      ${conversationHistory}
      
      Provide a concise, tactical evaluation of the user's performance.
      Format your response exactly like this:
      
      ### 📊 Performance Overview
      [Brief summary of how the user did]
      
      ### ✅ Strengths
      - [Point 1]
      - [Point 2]
      
      ### ❌ Areas for Improvement
      - [Point 1]
      - [Point 2]
      
      ### 🎯 Tactical Advice for this Type
      [Specific advice on how to better handle this personality type next time]`;

      const response = await chatCompletion([{ role: 'user', content: feedbackInstruction }], undefined, { max_tokens: 800 });

      setFeedback(response.choices[0]?.message?.content || 'Feedback unavailable.');

    } catch (error) {
      console.error("Feedback Error:", error);
      toast.error("Failed to generate feedback.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-8 min-h-[calc(100vh-12rem)] lg:h-[calc(100vh-12rem)] flex flex-col"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-6 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-accent-primary rounded-full animate-pulse" />
            <span className="text-xs font-mono text-accent-primary tracking-widest uppercase">Tactical Training</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase">
            Simulation Matrix
          </h1>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
          {!isActive && !feedback && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <select
                value={typeId}
                onChange={e => setTypeId(e.target.value as any)}
                className="w-full sm:w-auto bg-[#151619] border border-white/10 rounded-xl py-2 px-4 text-slate-200 focus:outline-none focus:border-accent-primary/50 transition-all text-sm font-mono"
              >
                {personalityTypes.map(pt => (
                  <option key={pt.id} value={pt.id}>{pt.id}</option>
                ))}
              </select>
              <button
                onClick={() => startSimulation().catch(err => console.error("Unhandled error in startSimulation:", err))}
                disabled={isLoading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 rounded-xl accent-gradient text-white text-sm font-bold shadow-lg shadow-accent-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Initialize
              </button>
            </div>
          )}
          {isActive && (
            <button
              onClick={() => endSimulation().catch(err => console.error("Unhandled error in endSimulation:", err))}
              disabled={isLoading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-bold hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
              Terminate & Evaluate
            </button>
          )}
          {feedback && (
            <button
              onClick={() => { setFeedback(null); setMessages([]); }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 rounded-xl bg-white/5 text-slate-300 border border-white/10 text-sm font-bold hover:bg-white/10 hover:text-white transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Reset Matrix
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
        {/* Main Chat Area */}
        <div className={cn(
          "flex flex-col bg-[#0a0a0a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative transition-all duration-500",
          "w-full min-w-0 h-[60vh] lg:h-auto lg:flex-1"
        )}>
          {/* Grid Background */}
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10 scrollbar-hide" data-lenis-prevent>
            {!isActive && messages.length === 0 && !feedback ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                <Target className="w-16 h-16 text-slate-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-400 mb-2">Matrix Offline</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  Select a target personality type and initialize the simulation to begin tactical roleplay training.
                </p>
              </div>
            ) : (
              messages.filter(m => m.role !== 'system').map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex w-full",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "max-w-[80%] rounded-2xl p-4",
                    msg.role === 'user' 
                      ? "bg-accent-primary/20 border border-accent-primary/30 text-white rounded-br-none" 
                      : "bg-[#151619] border border-white/10 text-slate-300 rounded-bl-none"
                  )}>
                    <div className="flex items-center gap-2 mb-2 opacity-50">
                      {msg.role === 'user' ? <Shield className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                      <span className="text-[10px] font-mono uppercase tracking-widest">
                        {msg.role === 'user' ? 'Operative' : 'Target'}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            {isLoading && isActive && (
              <div className="flex justify-start">
                <div className="bg-[#151619] border border-white/10 rounded-2xl rounded-bl-none p-4 flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-accent-primary/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-accent-primary/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-accent-primary/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-[#151619] border-t border-white/5 relative z-10 shrink-0">
            <form onSubmit={(e) => handleSendMessage(e).catch(err => console.error("Unhandled error in handleSendMessage:", err))} className="flex gap-4">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={!isActive || isLoading}
                placeholder={isActive ? "Enter your response..." : "Simulation offline"}
                className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-slate-200 focus:outline-none focus:border-accent-primary/50 transition-all font-mono text-sm disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!isActive || isLoading || !input.trim()}
                className="px-6 py-3 rounded-xl accent-gradient text-white font-bold shadow-lg shadow-accent-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

        {/* Feedback Panel */}
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full lg:w-[400px] xl:w-[450px] shrink-0 bg-[#151619] rounded-2xl border border-accent-primary/20 shadow-2xl overflow-hidden flex flex-col h-[60vh] lg:h-auto"
          >
            <div className="p-4 border-b border-white/5 bg-accent-primary/5 flex items-center gap-3 shrink-0">
              <Award className="w-5 h-5 text-accent-primary" />
              <h3 className="font-bold text-white uppercase tracking-widest text-sm">Post-Action Report</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide" data-lenis-prevent>
              <div className="markdown-body text-slate-300 text-sm">
                <ReactMarkdown>{feedback}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
