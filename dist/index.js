"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const transactions_1 = __importDefault(require("./routes/transactions"));
const auth_1 = __importDefault(require("./routes/auth"));
const game_1 = __importDefault(require("./routes/game"));
const games_1 = __importDefault(require("./routes/games"));
const accountant_1 = __importDefault(require("./routes/accountant"));
// import walletRoutes from './routes/wallet';
const admin_1 = __importDefault(require("./routes/admin"));
const agent_1 = __importDefault(require("./routes/agent"));
const user_1 = __importDefault(require("./routes/user"));
const spinner_1 = __importDefault(require("./routes/spinner"));
const feedback_1 = __importDefault(require("./routes/feedback"));
const batches_1 = __importDefault(require("./routes/batches"));
const collection_1 = __importDefault(require("./routes/collection"));
const database_1 = require("./config/database");
const gameSocket_1 = require("./sockets/gameSocket");
const collectionSocket_1 = require("./sockets/collectionSocket");
const errorHandler_1 = require("./middleware/errorHandler");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
// Get client URL from environment variables
const CLIENT_URL = process.env.CLIENT_URL || 'https://localhost:3000';
// Socket.io setup with specific origin
const io = new socket_io_1.Server(server, {
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
app.use((0, cors_1.default)({
    origin: CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers", "*"]
}));
// Handle preflight requests for ALL routes
app.options('*', (0, cors_1.default)({
    origin: CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["*"]
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Routes
app.use('/api/user', user_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/game', game_1.default);
// app.use('/api/wallet', walletRoutes);
app.use('/api/admin', admin_1.default);
app.use('/api/agent', agent_1.default);
app.use('/api/games', games_1.default);
app.use('/api/transactions', transactions_1.default);
app.use('/api/feedback', feedback_1.default);
app.use('/api/accountants', accountant_1.default);
app.use('/api/spinner', spinner_1.default);
// Collection Game Routes
app.use('/api/batches', batches_1.default);
app.use('/api/collection', collection_1.default);
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
(0, gameSocket_1.setupSocket)(io); // Existing Bingo Game Socket
(0, collectionSocket_1.setupCollectionSocket)(io); // New Collection Game Socket
// Error handling middleware
app.use(errorHandler_1.errorHandler);
// Connect to database
(0, database_1.connectDB)();
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
