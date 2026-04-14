import { useState, useEffect } from "react";
import { Save, Eye, EyeOff, Shield, CheckCircle, AlertCircle } from "lucide-react";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../utils/errorHandling";
import { toast } from "sonner";

export function ApiKeysManager() {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"valid" | "invalid" | null>(null);

  useEffect(() => {
    fetchApiKey().catch(err => {
      console.error("Unhandled error in ApiKeysManager fetchApiKey:", err);
    });
  }, []);

  const fetchApiKey = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, "private_config", "api_keys");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().regoloApiKey) {
        setApiKey(docSnap.data().regoloApiKey);
      }
    } catch (error) {
      console.error("Error fetching API key:", error);
      handleFirestoreError(error, OperationType.GET, "private_config/api_keys");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, "private_config", "api_keys"),
        { regoloApiKey: apiKey },
        { merge: true },
      );
      toast.success("API key saved successfully.");
    } catch (error) {
      console.error("Error saving API key:", error);
      toast.error("Failed to save API key.");
      handleFirestoreError(error, OperationType.WRITE, "private_config/api_keys");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!apiKey) {
      toast.error("Please enter an API key first.");
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("https://api.regolo.ai/v1/models", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        setTestResult("valid");
        toast.success("API key is valid!");
      } else {
        setTestResult("invalid");
        toast.error("API key is invalid.");
      }
    } catch (error) {
      setTestResult("invalid");
      toast.error("Failed to verify API key.");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent-primary"></div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-accent-primary" />
        <h3 className="text-lg font-bold text-white">
          Regolo API Key
        </h3>
      </div>
      
      <p className="text-sm text-slate-400">
        Enter your Regolo.ai API key. Get it from{' '}
        <a 
          href="https://dashboard.regolo.ai" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-accent-primary hover:underline"
        >
          dashboard.regolo.ai
        </a>
      </p>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <input
            type={showApiKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="rl-..."
            className="w-full bg-mystic-900 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-white focus:outline-none focus:border-accent-primary/50 transition-colors"
          />
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
          >
            {showApiKey ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
        <button
          onClick={() => handleSave().catch(err => console.error("Unhandled error:", err))}
          disabled={saving}
          className="px-6 py-3 bg-accent-primary/20 text-accent-primary border border-accent-primary/30 rounded-xl font-bold hover:bg-accent-primary/30 transition-colors flex items-center gap-2"
        >
          {saving ? (
            <div className="w-5 h-5 animate-spin border-t-2 border-b-2 border-accent-primary rounded-full" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Save
        </button>
        <button
          onClick={() => handleTest().catch(err => console.error("Unhandled error:", err))}
          disabled={testing || !apiKey}
          className="px-6 py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
        >
          {testing ? "Testing..." : "Test Key"}
        </button>
      </div>

      {testResult && (
        <div className={`flex items-center gap-2 text-sm ${testResult === "valid" ? "text-emerald-400" : "text-red-400"}`}>
          {testResult === "valid" ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {testResult === "valid" ? "API key is valid" : "API key is invalid"}
        </div>
      )}

      <div className="mt-4 p-4 bg-mystic-900/50 rounded-xl border border-white/5">
        <p className="text-xs text-slate-500">
          <strong className="text-slate-400">Note:</strong> For production deployments, set the{' '}
          <code className="bg-mystic-800 px-1 rounded">REGOLO_API_KEY</code> environment variable 
          in your hosting provider's settings instead of storing it here.
        </p>
      </div>
    </div>
  );
}