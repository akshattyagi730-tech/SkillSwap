require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const http       = require("http");
const { Server } = require("socket.io");
const jwt        = require("jsonwebtoken");

const connectDB    = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const User         = require("./models/User");
const Message      = require("./models/Message");

const authRoutes         = require("./routes/authRoutes");
const userRoutes         = require("./routes/userRoutes");
const chatRoutes         = require("./routes/chatRoutes");
const reviewRoutes       = require("./routes/reviewRoutes");
const creditRoutes       = require("./routes/creditRoutes");
const safetyRoutes       = require("./routes/safetyRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const notifyRoutes       = require("./routes/notifyRoutes");
const skillTestRoutes    = require("./routes/skillTestRoutes");

const app    = express();
const server = http.createServer(app);

// ── Socket.IO ─────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL, 'http://localhost:3001'] : '*',
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const onlineUsers = new Map();

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id);
    if (!user) return next(new Error("User not found"));
    socket.userId   = user._id.toString();
    socket.userName = user.name;
    next();
  } catch (err) {
    next(new Error("Auth failed"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.userId;
  console.log(`🟢 ${socket.userName} connected`);
  onlineUsers.set(userId, socket.id);
  io.emit("user_online", { userId });

  socket.on("send_message", async (data) => {
    try {
      const { receiverId, content } = data;
      if (!receiverId || !content?.trim()) return;
      const message = await Message.create({ sender: userId, receiver: receiverId, content: content.trim() });
      await message.populate("sender",   "name email");
      await message.populate("receiver", "name email");
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) io.to(receiverSocketId).emit("receive_message", message);
      socket.emit("message_sent", message);
    } catch (err) {
      socket.emit("message_error", { error: "Failed to send message." });
    }
  });

  socket.on("typing", ({ receiverId, isTyping }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) io.to(receiverSocketId).emit("user_typing", { senderId: userId, isTyping });
  });

  socket.on("mark_read", async ({ senderId }) => {
    await Message.updateMany({ sender: senderId, receiver: userId, read: false }, { read: true });
    const senderSocketId = onlineUsers.get(senderId);
    if (senderSocketId) io.to(senderSocketId).emit("messages_read", { byUserId: userId });
  });

  // ── Call end — notify other user + update message ──
  socket.on("call_end", async ({ receiverId, roomName, callMsgId, duration }) => {
    // Update call message in DB
    if (callMsgId) {
      try {
        await Message.findByIdAndUpdate(callMsgId, {
          callStatus: 'ended',
          callDuration: duration || 0,
          content: `📹 Video call ended${duration ? ` · ${Math.floor(duration/60)}:${String(duration%60).padStart(2,'0')}` : ''}`,
        });
      } catch (_) {}
    }
    // Notify receiver
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call_ended", { byUserId: userId, roomName, callMsgId, duration });
    }
    // Also notify sender so both UIs update
    io.to(socket.id).emit("call_msg_updated", { callMsgId, duration });
    console.log(`📵 Call ended by ${socket.userName} in room ${roomName}`);
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    io.emit("user_offline", { userId });
    console.log(`🔴 ${socket.userName} disconnected`);
  });
});

app.set("io", io);
app.set("onlineUsers", onlineUsers);

connectDB();

// ── CORS ──────────────────────────────────────────────
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:3001', 'http://localhost:3000']
  : ['*'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ success: true, message: "⚡ SkillSwap API running!", version: "3.0.0", onlineUsers: onlineUsers.size });
});

app.use("/", authRoutes);
app.use("/", userRoutes);
app.use("/", chatRoutes);
app.use("/", reviewRoutes);
app.use("/", creditRoutes);
app.use("/", safetyRoutes);
app.use("/", verificationRoutes);
app.use("/", notifyRoutes);
app.use("/", skillTestRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found.` });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO ready`);

  // Keep Render free tier awake — ping every 14 minutes
  if (process.env.RENDER_EXTERNAL_URL) {
    setInterval(() => {
      const url = process.env.RENDER_EXTERNAL_URL;
      require('https').get(url, (res) => {
        console.log(`🏓 Keep-alive ping: ${res.statusCode}`);
      }).on('error', () => {});
    }, 14 * 60 * 1000);
  }
});

module.exports = { app, io };