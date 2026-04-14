import { useState } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Bot, Loader2, Zap, Shield, Target } from 'lucide-react';
import { personalityTypes } from '../data/personalityTypes';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { chatCompletion } from '../lib/ai';

export default function DecryptorPage() {
  const [input, setInput] = useState('');
  const [typeId, setTypeId] = useState(personalityTypes[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setAnalysis('');

    try {
      const selectedType = personalityTypes.find(p => p.id === typeId);

      const systemInstruction = `You are the "Signal Decryptor", an expert in the EPIMETHEUS personality profiling system.
      Your goal is to analyze text messages sent by women and decode the underlying subtext, emotional state, and provide tactical responses.
      
      Target Profile: ${selectedType?.name} (${selectedType?.id})
      Key Traits: ${selectedType?.keyTraits.join(', ')}
      What She Wants: ${selectedType?.whatSheWants}
      What to Avoid: ${selectedType?.whatToAvoid.join(', ')}
      
      Format your response exactly like this:
      
      ### 🔍 Subtext Analysis
      [Explain what she actually means vs what she said]
      
      ### 🧠 Emotional State
      [Analyze her current mood and where she is in the Emotional Tension Sequence]
      
      ### 🎯 Tactical Responses
      **1. Playful / Push-Pull:** [Response option]
      **2. Direct / Dominant:** [Response option]
      **3. Intriguing / Mysterious:** [Response option]
      
      Keep it concise, professional, and highly strategic.`;

      const response = await chatCompletion([
        { role: "system", content: systemInstruction },
        { role: "user", content: `Analyze this message: "${input}"` }
      ], undefined, { stream: true });

      let fullContent = '';
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullContent += content;
        setAnalysis(fullContent);
      }

    } catch (error) {
      console.error("Decryptor Error:", error);
      toast.error("Failed to decrypt signal. Please try again.");
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-accent-primary rounded-full animate-pulse" />
            <span className="text-xs font-mono text-accent-primary tracking-widest uppercase">Signal Decryptor</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase">
            Text Analysis
          </h1>
        </div>
        <div className="text-left md:text-right mt-4 md:mt-0">
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
            Subtext Extraction Engine
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-[#151619] border border-white/5 shadow-2xl space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Target className="w-4 h-4 text-accent-primary" />
                Target Personality Type
              </label>
              <select
                value={typeId}
                onChange={e => setTypeId(e.target.value as any)}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-slate-200 focus:outline-none focus:border-accent-primary/50 transition-all appearance-none"
              >
                {personalityTypes.map(pt => (
                  <option key={pt.id} value={pt.id}>{pt.name} ({pt.id})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-accent-primary" />
                Intercepted Message
              </label>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                rows={6}
                placeholder="Paste her text message here..."
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-slate-200 focus:outline-none focus:border-accent-primary/50 transition-all resize-none font-mono text-sm"
              />
            </div>

            <button
              onClick={() => handleAnalyze().catch(err => console.error("Unhandled error in handleAnalyze:", err))}
              disabled={isLoading || !input.trim()}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl accent-gradient text-white font-bold shadow-lg shadow-accent-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Decrypting Signal...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Analyze Subtext
                </>
              )}
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-accent-primary/5 border border-accent-primary/10">
            <h3 className="text-sm font-bold text-accent-primary flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4" />
              Strategic Note
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The Decryptor analyzes text based on the EPIMETHEUS framework. Always consider the context of your previous interactions before sending a tactical response.
            </p>
          </div>
        </div>

        {/* Output Section */}
        <div className="lg:col-span-7">
          <div className="h-full min-h-[500px] p-6 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col">
            {/* Grid Background */}
            <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            
            <div className="relative z-10 flex-1 flex flex-col">
              {!analysis && !isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                  <Bot className="w-16 h-16 text-slate-600 mb-4" />
                  <h3 className="text-xl font-bold text-slate-400 mb-2">Awaiting Signal</h3>
                  <p className="text-sm text-slate-500 max-w-xs">
                    Input a message and select the target's personality type to begin decryption.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-4 scrollbar-hide space-y-6 animate-in fade-in" data-lenis-prevent>
                  {isLoading && !analysis && (
                    <div className="flex justify-center items-center h-full">
                      <Loader2 className="w-12 h-12 text-accent-primary animate-spin" />
                    </div>
                  )}
                  
                  {analysis && (
                    <div className="markdown-body text-slate-300">
                      <ReactMarkdown>{analysis}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
