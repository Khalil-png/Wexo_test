
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

// Route pour enregistrer un token FCM
app.post("/api/notifications/register-token", async (req, res) => {
  const { userId, token } = req.body;
  if (!userId || !token) return res.status(400).json({ error: "Missing userId or token" });

  try {
    const tokenRef = db.collection("fcm_tokens").doc(userId);
    await tokenRef.set({
      tokens: admin.firestore.FieldValue.arrayUnion(token),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Route pour envoyer une notification
app.post("/api/notifications/send", async (req, res) => {
  const { receiverId, title, body, data } = req.body;
  if (!receiverId || !title || !body) return res.status(400).json({ error: "Missing parameters" });

  try {
    const tokenDoc = await db.collection("fcm_tokens").doc(receiverId).get();
    if (!tokenDoc.exists) {
      return res.json({ success: false, message: "No tokens found for user" });
    }

    const tokens = tokenDoc.data()?.tokens || [];
    if (tokens.length === 0) {
      return res.json({ success: false, message: "Empty tokens for user" });
    }

    const message = {
      notification: { title, body },
      data: data || {},
      tokens: tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    // Nettoyage des tokens invalides (optionnel mais recommandé)
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error?.code;
          if (error === 'messaging/invalid-registration-token' || error === 'messaging/registration-token-not-registered') {
            failedTokens.push(tokens[idx]);
          }
        }
      });
      if (failedTokens.length > 0) {
        await db.collection("fcm_tokens").doc(receiverId).update({
          tokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
        });
      }
    }

    res.json({ 
      success: true, 
      successCount: response.successCount, 
      failureCount: response.failureCount 
    });
  } catch (err: any) {
    console.error("Erreur envoi notification:", err);
    res.status(500).json({ error: err.message });
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

  // --- BRIDGE POCKETBASE -> FIREBASE (NOTIFICATIONS) ---
  const setupPbBridge = async () => {
    const PocketBase = (await import('pocketbase')).default;
    const pbUrl = process.env.VITE_POCKETBASE_URL || 'https://carnote.synology.me:9443';
    const pb = new PocketBase(pbUrl);

    console.log(`[BRIDGE] Connexion à PocketBase: ${pbUrl}`);

    const runBridge = async () => {
      try {
        // Authentification admin si possible ou utilisateur système
        // Pour ce prototype, on écoute sans auth si les permissions PocketBase le permettent (lecture publique ou admin)
        // Mais idéalement on utiliserait pb.admins.authWithPassword(...)
        
        pb.collection('messages').subscribe('*', async ({ action, record }) => {
          if (action === 'create') {
            console.log(`[BRIDGE] Nouveau message détecté: ${record.id}`);
            const { sender_id, receiver_id, text, file_url } = record;

            if (!receiver_id) return;

            try {
              // 1. Récupérer les infos de l'expéditeur
              const sender = await pb.collection('users').getOne(sender_id).catch(() => null);
              const senderName = sender?.username || sender?.name || 'Wexo';
              const senderAvatar = sender ? (sender.avatar ? `${pbUrl}/api/files/users/${sender.id}/${sender.avatar}` : sender.avatar_url) : '';

              const title = senderName;
              const content = text || (file_url ? "Pièce jointe reçue" : "Nouveau message");

              // 2. Créer la notification dans Firestore (pour le listener App.tsx)
              // On vérifie d'abord si elle n'existe pas déjà (évite les doublons si le client l'a fait)
              const existingNotifs = await db.collection('notifications')
                .where('user_id', '==', receiver_id)
                .where('sender_id', '==', sender_id)
                .where('type', '==', 'message')
                .orderBy('created_at', 'desc')
                .limit(1)
                .get();

              // Si la dernière notification identique date de moins de 2 secondes, on ignore
              let shouldCreate = true;
              if (!existingNotifs.empty) {
                const last = existingNotifs.docs[0].data();
                const lastTime = last.created_at?.toDate?.().getTime() || 0;
                if (Date.now() - lastTime < 2000) shouldCreate = false;
              }

              if (shouldCreate) {
                await db.collection('notifications').add({
                  user_id: receiver_id,
                  sender_id: sender_id,
                  sender_avatar: senderAvatar || '',
                  type: 'message',
                  title: title,
                  content: content,
                  status: 'unread',
                  created_at: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`[BRIDGE] Notification Firestore créée pour ${receiver_id}`);
              }

              // 3. Envoyer le Push FCM
              const tokenDoc = await db.collection("fcm_tokens").doc(receiver_id).get();
              if (tokenDoc.exists) {
                const tokens = tokenDoc.data()?.tokens || [];
                if (tokens.length > 0) {
                  const message = {
                    notification: { title, body: content },
                    data: { type: 'message', senderId: sender_id, chatId: record.chat || '' },
                    tokens: tokens,
                  };
                  await admin.messaging().sendEachForMulticast(message);
                  console.log(`[BRIDGE] Push FCM envoyé à ${tokens.length} tokens`);
                }
              }
            } catch (err) {
              console.error("[BRIDGE] Erreur traitement message:", err);
            }
          }
        });
      } catch (err) {
        console.error("[BRIDGE] Erreur initialisation:", err);
        // Retry after 5s
        setTimeout(runBridge, 5000);
      }
    };

    runBridge();
  };

  setupPbBridge().catch(err => console.error("[BRIDGE] Fatal error:", err));
}

process.on('uncaughtException', (err) => {
  console.error('FATAL_UNCAUGHT_EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('FATAL_UNHANDLED_REJECTION at:', promise, 'reason:', reason);
});

startServer().catch(err => {
  console.error("ERREUR_DEMARRAGE_SERVEUR:", err);
});
