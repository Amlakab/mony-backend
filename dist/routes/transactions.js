"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get all transactions (admin only)
router.get('/', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res) => {
    try {
        const { limit = 100, batchId } = req.query;
        const filter = {};
        if (batchId)
            filter.batchId = batchId;
        const transactions = await Transaction_1.default.find(filter)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));
        res.json({
            success: true,
            data: transactions
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
// Get transactions by batch
router.get('/batch/:batchId', auth_1.authenticate, async (req, res) => {
    try {
        const transactions = await Transaction_1.default.find({ batchId: req.params.batchId })
            .sort({ timestamp: -1 })
            .limit(100);
        res.json({
            success: true,
            data: transactions
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
exports.default = router;
