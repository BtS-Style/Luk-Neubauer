import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import multer from "multer";
import fs from "fs";
import cors from "cors";
import morgan from "morgan";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
try {
  fs.accessSync(uploadsDir, fs.constants.W_OK);
  console.log("Uploads directory is writable:", uploadsDir);
} catch (err) {
  console.error("Uploads directory is NOT writable:", uploadsDir, err);
}

const upload = multer({ 
  dest: uploadsDir,
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB
});

const db = new Database("netbook.db");

// Migration: Ensure ai_autonomy column exists
try {
  // First check if table exists
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (tableExists) {
    db.prepare("SELECT ai_autonomy FROM users LIMIT 1").get();
  }
} catch (e: any) {
  if (e.message.includes("no such column")) {
    console.log("Migrating database: adding ai_autonomy column to users table");
    db.exec("ALTER TABLE users ADD COLUMN ai_autonomy TEXT");
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    picture TEXT,
    cover_photo TEXT,
    bio TEXT,
    location TEXT,
    provider TEXT,
    ai_assistants TEXT,
    ai_autonomy TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    author_id TEXT,
    content TEXT,
    image TEXT,
    video TEXT,
    type TEXT,
    likes INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    privacy TEXT,
    vocal_imprint TEXT,
    ai_insight TEXT,
    group_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    cover_photo TEXT,
    admin_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS group_members (
    group_id TEXT,
    user_id TEXT,
    role TEXT DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(group_id, user_id),
    FOREIGN KEY(group_id) REFERENCES groups(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT,
    author_name TEXT,
    text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES posts(id)
  );

  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    persona TEXT,
    role TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Seed admin user
  INSERT OR IGNORE INTO users (id, name, email, picture, provider, bio, location, cover_photo)
  VALUES (
    'admin_master_001', 
    'Architekt (Správce)', 
    'bellapiskota@gmail.com', 
    'https://i.ibb.co/v6YpP6C/bts-logo.png', 
    'master', 
    'Architekt a správce protokolu BTS. Sjednocená entita v plném provozu.', 
    'Nexus Prime', 
    'https://picsum.photos/seed/admin-cover/1200/400'
  );
`);

// Migration: Add ai_insight column if it doesn't exist
try {
  db.prepare("ALTER TABLE posts ADD COLUMN ai_insight TEXT").run();
} catch (e) {
  // Column already exists or table doesn't exist yet
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cors());
  app.use(morgan("dev"));
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ limit: '30mb', extended: true }));
  app.use("/uploads", express.static(uploadsDir));

  // Logger and JSON header for API requests
  app.use("/api", (req, res, next) => {
    console.log(`[API Request] ${req.method} ${req.originalUrl} - Accept: ${req.headers.accept}`);
    res.setHeader("Content-Type", "application/json");
    next();
  });

  // Health check
  app.get("/api/ping", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API Routes
  app.post("/api/upload", (req, res, next) => {
    console.log("Upload request received");
    next();
  }, upload.single("file"), (req, res) => {
    console.log("File upload processed:", req.file);
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  // OAuth Routes
  app.get("/api/auth/url", (req, res) => {
    const provider = req.query.provider;
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    
    if (provider === "google") {
      const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) return res.status(400).json({ error: "Google Client ID not configured" });
      
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `${appUrl}/auth/callback`,
        response_type: "code",
        scope: "openid profile email",
        access_type: "offline",
        prompt: "consent"
      });
      res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
    } else if (provider === "facebook") {
      const clientId = process.env.VITE_FACEBOOK_CLIENT_ID;
      if (!clientId) return res.status(400).json({ error: "Facebook Client ID not configured" });
      
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `${appUrl}/auth/callback`,
        response_type: "code",
        scope: "email,public_profile",
        display: "popup"
      });
      res.json({ url: `https://www.facebook.com/v18.0/dialog/oauth?${params}` });
    } else {
      res.status(400).json({ error: "Unsupported provider" });
    }
  });

  app.get("/auth/callback", (req, res) => {
    // In a real app, we'd exchange the code for tokens here.
    // For this demo, we'll just send a success message to the opener.
    const code = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', code: '${code}' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  });

  // API Routes
  app.get("/api/posts", (req, res) => {
    const posts = db.prepare(`
      SELECT p.*, u.name as author_name, u.picture as author_pic 
      FROM posts p 
      JOIN users u ON p.author_id = u.id 
      WHERE p.group_id IS NULL 
      ORDER BY p.created_at DESC
    `).all();
    res.json(posts);
  });

  app.post("/api/posts", (req, res) => {
    const { id, authorId, content, image, video, type, privacy, vocalImprint, aiInsight, groupId } = req.body;
    db.prepare("INSERT INTO posts (id, author_id, content, image, video, type, privacy, vocal_imprint, ai_insight, group_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, authorId, content, image, video, type, privacy, vocalImprint, aiInsight, groupId);
    res.json({ status: "ok" });
  });

  app.put("/api/posts/:id", (req, res) => {
    const { content, image, video, type, privacy, likes, shares, aiInsight, groupId } = req.body;
    db.prepare("UPDATE posts SET content = ?, image = ?, video = ?, type = ?, privacy = ?, likes = ?, shares = ?, ai_insight = ?, group_id = ? WHERE id = ?")
      .run(content, image, video, type, privacy, likes, shares, aiInsight, groupId, req.params.id);
    res.json({ status: "ok" });
  });

  app.post("/api/users", (req, res) => {
    const { id, name, email, picture, provider, bio, location, coverPhoto, aiAssistants, aiAutonomy } = req.body;
    db.prepare("INSERT OR REPLACE INTO users (id, name, email, picture, provider, bio, location, cover_photo, ai_assistants, ai_autonomy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, name, email, picture, provider, bio, location, coverPhoto, aiAssistants, aiAutonomy);
    res.json({ status: "ok" });
  });

  app.get("/api/users/:id", (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    if (user) {
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        provider: user.provider,
        bio: user.bio,
        location: user.location,
        coverPhoto: user.cover_photo,
        aiAssistants: user.ai_assistants,
        aiAutonomy: user.ai_autonomy,
        sub: user.id
      });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  app.get("/api/posts/:postId/comments", (req, res) => {
    const comments = db.prepare("SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC").all(req.params.postId);
    res.json(comments);
  });

  app.post("/api/comments", (req, res) => {
    const { id, postId, authorName, text } = req.body;
    db.prepare("INSERT INTO comments (id, post_id, author_name, text) VALUES (?, ?, ?, ?)")
      .run(id, postId, authorName, text);
    res.json({ status: "ok" });
  });

  // Groups API
  app.get("/api/groups", (req, res) => {
    const userId = req.query.userId;
    const groups = db.prepare(`
      SELECT g.*, 
      (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as memberCount,
      (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND user_id = ?) as isMember
      FROM groups g
    `).all(userId);
    res.json(groups.map((g: any) => ({ ...g, isMember: !!g.isMember })));
  });

  app.post("/api/groups", (req, res) => {
    const { id, name, description, coverPhoto, adminId } = req.body;
    db.prepare("INSERT INTO groups (id, name, description, cover_photo, admin_id) VALUES (?, ?, ?, ?, ?)")
      .run(id, name, description, coverPhoto, adminId);
    db.prepare("INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)")
      .run(id, adminId, 'admin');
    res.json({ status: "ok" });
  });

  app.post("/api/groups/:id/join", (req, res) => {
    const { userId } = req.body;
    db.prepare("INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)")
      .run(req.params.id, userId);
    res.json({ status: "ok" });
  });

  app.post("/api/groups/:id/leave", (req, res) => {
    const { userId } = req.body;
    db.prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?")
      .run(req.params.id, userId);
    res.json({ status: "ok" });
  });

  app.get("/api/groups/:id/posts", (req, res) => {
    const posts = db.prepare(`
      SELECT p.*, u.name as author_name, u.picture as author_pic 
      FROM posts p 
      JOIN users u ON p.author_id = u.id 
      WHERE p.group_id = ? 
      ORDER BY p.created_at DESC
    `).all(req.params.id);
    res.json(posts);
  });

  app.get("/api/groups/:id/members", (req, res) => {
    const members = db.prepare(`
      SELECT u.id, u.name, u.picture, gm.role 
      FROM users u 
      JOIN group_members gm ON u.id = gm.user_id 
      WHERE gm.group_id = ?
    `).all(req.params.id);
    res.json(members);
  });

  // Chat History API
  app.get("/api/chat-history", (req, res) => {
    const { userId, persona } = req.query;
    const history = db.prepare("SELECT role, content FROM chat_history WHERE user_id = ? AND persona = ? ORDER BY created_at ASC")
      .all(userId, persona);
    res.json(history);
  });

  app.post("/api/chat-history", (req, res) => {
    const { userId, persona, role, content } = req.body;
    db.prepare("INSERT INTO chat_history (user_id, persona, role, content) VALUES (?, ?, ?, ?)")
      .run(userId, persona, role, content);
    res.json({ status: "ok" });
  });

  app.delete("/api/chat-history", (req, res) => {
    const { userId, persona } = req.query;
    db.prepare("DELETE FROM chat_history WHERE user_id = ? AND persona = ?")
      .run(userId, persona);
    res.json({ status: "ok" });
  });

  // API 404 handler - Catch all unmatched /api routes
  app.use("/api", (req, res) => {
    console.warn(`[API 404] ${req.method} ${req.originalUrl} - No route matched`);
    res.status(404).json({ 
      error: "API route not found", 
      method: req.method, 
      path: req.originalUrl,
      suggestion: "Check if the route is defined in server.ts and if the method matches."
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // Error handling middleware - MUST BE LAST
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Server Error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
