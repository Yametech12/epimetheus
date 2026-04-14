import express from "express";
console.log("Server starting up...");
import path from "path";
import nodemailer from "nodemailer";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import fs from "fs";

// Load Firebase config for server-side use
let firebaseConfig: any = null;

function getFirebaseConfig() {
  if (firebaseConfig) return firebaseConfig;
  
  firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCIVOidyoXfGAbmGx0CBCDqjk6KdMPDO6Q",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "project-0072b519-b9bc-4a17-885.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "project-0072b519-b9bc-4a17-885",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "project-0072b519-b9bc-4a17-885.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "489845233202",
    appId: process.env.FIREBASE_APP_ID || "1:489845233202:web:3113c28693613ca2774e2b",
    firestoreDatabaseId: process.env.FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-8dfb031a-842c-43f3-a9a0-de3d25111682"
  };

  return firebaseConfig;
}

let firebaseApp: any = null;
let db: any = null;

function getDb() {
  if (db) return db;
  const config = getFirebaseConfig();
  if (!config.apiKey && !process.env.FIREBASE_API_KEY) {
    throw new Error("Firebase configuration is missing. Please set up Firebase or provide environment variables.");
  }
  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);
  db = getFirestore(firebaseApp, config.firestoreDatabaseId || "(default)");
  return db;
}

// Configure AI provider dynamically
const AI_PROVIDER = process.env.AI_PROVIDER || "regolo"; // "regolo", "groq", or "openai"
const API_URL = AI_PROVIDER === "regolo"
  ? "https://api.regolo.ai/v1/chat/completions"
  : AI_PROVIDER === "groq"
  ? "https://api.groq.com/openai/v1/chat/completions"
  : "https://api.openai.com/v1/chat/completions";

// Get API key from env or fallback to Firestore
let apiKey: string | undefined = AI_PROVIDER === "regolo" 
  ? process.env.REGOLO_API_KEY 
  : AI_PROVIDER === "groq" 
  ? process.env.GROQ_API_KEY 
  : process.env.OPENAI_API_KEY;

async function getApiKey(): Promise<string | undefined> {
  if (apiKey) return apiKey;
  
  if (AI_PROVIDER === "regolo") {
    try {
      const firestore = getDb();
      const docSnap = await getDoc(doc(firestore, "private_config", "api_keys"));
      if (docSnap.exists() && docSnap.data().regoloApiKey) {
        apiKey = docSnap.data().regoloApiKey;
        return apiKey;
      }
    } catch (e) {
      console.warn("Could not fetch API key from Firestore:", e);
    }
  }
  
  return undefined;
}

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check route
app.get("/api/health", (_req, res) => {
  const config = getFirebaseConfig();
  const gmailUser = (process.env.GMAIL_USER || '').trim();
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || '').trim();
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV,
    firebase: !!config.apiKey,
    smtp: !!gmailUser && !!gmailPass,
    openai: !!process.env.OPENAI_API_KEY
  });
});

let transporter: any = null;

function getTransporter() {
  if (transporter) return transporter;
  
  const gmailUser = (process.env.GMAIL_USER || '').trim();
  const gmailPassRaw = (process.env.GMAIL_APP_PASSWORD || '').trim();
  const gmailPass = gmailPassRaw.replace(/\s/g, "");

  if (!gmailUser || !gmailPass) {
    console.warn("Email credentials missing. SMTP transporter not initialized.");
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });

  return transporter;
}


  // API Route: Send Verification Code
  app.post("/api/auth/send-code", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const gmailUser = (process.env.GMAIL_USER || '').trim();
    const gmailPassRaw = (process.env.GMAIL_APP_PASSWORD || '').trim();
    const gmailPass = gmailPassRaw.replace(/\s/g, "");
    const mailer = getTransporter();

    // Diagnostic check for environment variables
    if (!mailer || !gmailUser || !gmailPass) {
      console.error("Missing GMAIL_USER or GMAIL_APP_PASSWORD environment variables");
      return res.status(500).json({ 
        error: "Server configuration error: Email credentials not found. Please set GMAIL_USER and GMAIL_APP_PASSWORD in the Settings menu (Secrets)." 
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    try {
      console.log(`Attempting to send verification code to ${email}`);
      
      // Store code in Firestore
      try {
        const firestore = getDb();
        await setDoc(doc(firestore, "verification_codes", email), {
          code,
          expiresAt,
        });
        console.log("Code stored in Firestore successfully");
      } catch (fsError: any) {
        console.error("Firestore Error storing code:", fsError);
        return res.status(500).json({ 
          error: "Database error: Failed to store verification code.",
          diagnostic: "Firestore write failed. Check your security rules or quota.",
          details: fsError.message 
        });
      }

      // Send Email
      await mailer.sendMail({
        from: `"Epimetheus Security" <${gmailUser}>`,
        to: email,
        subject: "Your Verification Code",
        text: `Your verification code is: ${code}. It expires in 10 minutes.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; background: #0f172a; color: white; border-radius: 10px;">
            <h2 style="color: #38bdf8;">Epimetheus Verification</h2>
            <p>Use the following code to complete your registration:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; padding: 20px; background: rgba(255,255,255,0.05); text-align: center; border-radius: 8px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #94a3b8; font-size: 12px;">This code will expire in 10 minutes.</p>
          </div>
        `,
      });
      console.log("Verification email sent successfully");

      res.json({ success: true });
    } catch (error: any) {
      console.error("CRITICAL Error in send-code process:", error);
      
      let errorMessage = "Failed to send verification code.";
      let diagnostic = "";

      if (error.code === 'EAUTH') {
        const cleanPass = gmailPass.replace(/\s/g, "");
        if (error.message && (error.message.includes("534-5.7.9") || error.message.includes("Application-specific password required") || error.message.includes("535-5.7.8"))) {
          diagnostic = `Gmail Security Error: You MUST use a 16-character 'App Password'. Your current password is ${cleanPass.length} characters long. Regular passwords will NOT work. 1. Go to Google Account -> App Passwords to create one. 2. If still failing, visit https://accounts.google.com/DisplayUnlockCaptcha and click 'Continue'.`;
        } else {
          diagnostic = "Email authentication failed. Please ensure GMAIL_USER is your full email address and GMAIL_APP_PASSWORD is a 16-character App Password (NOT your regular account password). Check Settings -> Secrets.";
        }
      } else if (error.code === 'ESOCKET') {
        diagnostic = "Network error while connecting to Gmail SMTP server.";
      } else if (error.message && error.message.includes("quota")) {
        diagnostic = "Firestore quota exceeded. Could not store verification code.";
      }
      
      res.status(500).json({ 
        error: errorMessage,
        diagnostic,
        details: error.message || 'Unknown error',
        code: error.code
      });
    }
  });

  // API Route: Verify Code
  app.post("/api/auth/verify-code", async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: "Email and code are required" });

    try {
      const firestore = getDb();
      const docRef = doc(firestore, "verification_codes", email);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return res.status(400).json({ error: "No code found for this email" });
      }

      const data = docSnap.data();
      if (data.expiresAt < Date.now()) {
        await deleteDoc(docRef);
        return res.status(400).json({ error: "Code has expired" });
      }

      if (data.code !== code) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      // Success - delete the code so it can't be reused
      await deleteDoc(docRef);
      res.json({ success: true });
    } catch (error) {
      console.error("Error verifying code:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API Route: Test API Key
  app.get("/api/ai/test-key", async (_req, res) => {
    const key = await getApiKey();
    if (!key) {
      return res.json({ status: "error", message: "AI API key not configured" });
    }
    
    try {
      res.json({ status: "valid" });
    } catch (error: any) {
      res.json({ status: "invalid", error: error.message });
    }
  });

  // Helper for AI requests with retry
  async function chatWithRetry(body: any, apiKeyVal: string, retries = 3, delay = 1000): Promise<any> {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKeyVal}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        if (response.status === 429 && retries > 0) {
          console.warn(`Rate limit hit, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return chatWithRetry(body, apiKeyVal, retries - 1, delay * 2);
        }
        throw new Error(`AI API error: ${response.status} - ${await response.text()}`);
      }
      
      return response;
    } catch (error: any) {
      if (retries > 0 && error.message.includes("429")) {
        console.warn(`Rate limit hit, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return chatWithRetry(body, apiKeyVal, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  // API Route: AI Proxy (to keep keys off the client)
  app.post("/api/ai/chat", async (req, res) => {
    const key = await getApiKey();
    if (!key) {
      return res.status(500).json({ error: "AI API key not configured on server." });
    }
    
    try {
      // Map gpt-4o to Regolo-supported model if necessary
      const body = { ...req.body };
      if (AI_PROVIDER === "regolo" && body.model === "gpt-4o") {
        body.model = "Llama-3.3-70B-Instruct";
      } else if (AI_PROVIDER === "groq" && body.model === "gpt-4o") {
        body.model = "llama-3.3-70b-versatile";
      }

      // Handle streaming if requested
      if (body.stream) {
        const response = await chatWithRetry({ ...body, stream: true }, key);

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        const reader = response.body?.getReader();
        if (!reader) return res.end();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        return res.end();
      } else {
        const response = await chatWithRetry(body, key);
        const data = await response.json();
        return res.json(data);
      }
    } catch (error: any) {
        console.error("AI Proxy Error:", error);
        res.status(500).json({ error: "Failed to communicate with AI provider", details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Ensure SPA fallback in dev mode if vite middleware doesn't handle some cases
    app.get('*all', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) return next();
      try {
        let template = await vite.transformIndexHtml(url, '');
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const indexHtmlPath = path.join(distPath, "index.html");
    
    app.use(express.static(distPath));
    
    // Catch-all route for SPA fallback
    app.get('*all', (req, res) => {
      if (req.path.startsWith('/api')) return res.status(404).json({ error: "API route not found" });
      
      if (fs.existsSync(indexHtmlPath)) {
        res.sendFile(indexHtmlPath);
      } else {
        console.error("index.html not found at:", indexHtmlPath);
        res.status(500).send("Application build not found. Please ensure 'npm run build' has been executed.");
      }
    });
  }

  // Global Error Handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("Unhandled Server Error:", err);
    res.status(500).json({ 
      error: "Internal server error", 
      details: err.message || "Unknown error" 
    });
  });

  // Only listen if not running as a serverless function
  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }

export default app;
