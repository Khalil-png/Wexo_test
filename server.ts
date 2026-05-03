
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialisation de Firebase Admin
// Dans cet environnement, il utilise les identifiants par défaut du projet
if (!admin.apps.length) {
  try {
    admin.initializeApp();
    console.log("✅ Firebase Admin initialisé");
  } catch (error) {
    console.error("❌ Erreur initialisation Firebase Admin:", error);
  }
}

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Route pour initier un appel (Le serveur communique avec Firebase)
  app.post("/api/calls/initiate", async (req, res) => {
    const { callerId, receiverId, type } = req.body;

    if (!callerId || !receiverId) {
      return res.status(400).json({ error: "Missing callerId or receiverId" });
    }

    try {
      // Le serveur crée le document dans Firebase
      // L'utilisateur destinataire recevra immédiatement l'alerte car il écoute cette collection
      const callRef = await db.collection("calls").add({
        callerId,
        receiverId,
        type: type || "video",
        status: "outgoing",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdate: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`[CALL] Appel initié: ${callRef.id} de ${callerId} vers ${receiverId}`);

      // Créer aussi une notification pour le destinataire afin qu'elle apparaisse dans la cloche
      await db.collection("notifications").add({
        user_id: receiverId,
        sender_id: callerId,
        type: "call",
        title: "Appel entrant",
        content: "Vous avez un nouvel appel.",
        status: "unread",
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({ 
        success: true, 
        callId: callRef.id,
        message: "Firebase a été notifié de l'appel" 
      });
    } catch (error: any) {
      console.error("Erreur initiation appel:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Route pour recevoir les logs du navigateur dans le terminal
  app.post("/api/log", (req, res) => {
    const { message, level, details } = req.body;
    const timestamp = new Date().toISOString();
    
    console.log(`\n--- BROWSER_LOG [${level || 'INFO'}] [${timestamp}] ---`);
    console.log(`Message: ${message}`);
    if (details) {
      console.log(`Details: ${typeof details === 'object' ? JSON.stringify(details, null, 2) : details}`);
    }
    console.log('---------------------------------------------------\n');
    
    res.json({ status: "logged" });
  });

  // Vite middleware pour le développement
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Mode Production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.error(`\n***************************************************`);
    console.error(`🚀 SERVEUR WEXO DÉMARRÉ sur http://0.0.0.0:${PORT}`);
    console.error(`Attente des logs du navigateur...`);
    console.error(`***************************************************\n`);
  });
}

startServer().catch(err => {
  console.error("ERREUR_DEMARRAGE_SERVEUR:", err);
});
