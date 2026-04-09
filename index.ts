// server/index.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import transactionRoutes from './routes/transactions';
import authRoutes from './routes/auth';
import gameRoutes from './routes/game';
import gamesRoutes from './routes/games';
import accountantRoutes from './routes/accountant';
// import walletRoutes from './routes/wallet';
import adminRoutes from './routes/admin';
import agentRoutes from './routes/agent';
import userRoutes from './routes/user';
import spinnerRoutes from './routes/spinner';
import feedbackRoutes from './routes/feedback';
import batchRoutes from './routes/batches';
import collectionRoutes from './routes/collection';
import { connectDB } from './config/database';
import { setupSocket } from './sockets/gameSocket';
import { setupCollectionSocket } from './sockets/collectionSocket';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const server = createServer(app);

// Get client URL from environment variables
const CLIENT_URL = process.env.CLIENT_URL || 'https://localhost:3000';

// Socket.io setup with specific origin
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["*"]
  },
  path: '/socket.io/',
  transports: ['websocket', 'polling']
});

// Middleware - Use CLIENT_URL from environment 
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers", "*"]
}));

// Handle preflight requests for ALL routes
app.options('*', cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["*"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
// app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/accountants', accountantRoutes);
app.use('/api/spinner', spinnerRoutes);

// Collection Game Routes
app.use('/api/batches', batchRoutes);
app.use('/api/collection', collectionRoutes);

// Enhanced health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    cors: `Restricted to: ${CLIENT_URL}`,
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || 'Unknown',
    features: {
      bingoGame: true,
      collectionGame: true,
      spinner: true
    }
  });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  const origin = req.headers.origin;
  const isAllowed = origin === CLIENT_URL;
  
  res.status(200).json({ 
    message: isAllowed ? 'CORS is working! Origin allowed.' : 'CORS: Origin not allowed',
    yourOrigin: origin,
    allowedOrigin: CLIENT_URL,
    allowed: isAllowed,
    timestamp: new Date().toISOString()
  });
});

// WebSocket endpoint for clients that need raw WebSocket
app.get('/ws', (req, res) => {
  res.status(400).json({ error: 'Use Socket.io client instead' });
});

// Socket.io setups
setupSocket(io);           // Existing Bingo Game Socket
setupCollectionSocket(io); // New Collection Game Socket

// Error handling middleware
app.use(errorHandler);

// Connect to database
connectDB();

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 CORS: Restricted to ${CLIENT_URL}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`✅ CORS test: http://localhost:${PORT}/api/cors-test`);
  console.log(`📱 Mobile apps must connect from: ${CLIENT_URL}`);
  console.log(`🎮 Bingo Game Socket: Ready`);
  console.log(`💰 Collection Game Socket: Ready`);
  console.log(`📦 Collection API: /api/batches, /api/collection`);
});