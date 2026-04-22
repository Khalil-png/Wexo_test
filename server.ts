
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
