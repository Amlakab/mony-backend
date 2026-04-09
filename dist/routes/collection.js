"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const MoneyBox_1 = __importDefault(require("../models/MoneyBox"));
const CollectionEvent_1 = __importDefault(require("../models/CollectionEvent"));
const Batch_1 = __importDefault(require("../models/Batch"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get money denominations
router.get('/denominations', auth_1.authenticate, async (req, res) => {
    const denominations = [5, 10, 20, 30, 50, 100, 150, 200, 300, 500];
    res.json({
        success: true,
        data: denominations
    });
});
// Collect money
router.post('/collect', auth_1.authenticate, async (req, res) => {
    try {
        const { batchId, boxNumber, amount, donorName, donorPhone } = req.body;
        // Validate amount
        const validDenominations = [5, 10, 20, 30, 50, 100, 150, 200, 300, 500];
        if (!validDenominations.includes(amount)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid money denomination'
            });
        }
        // Check if batch exists and is active
        const batch = await Batch_1.default.findById(batchId);
        if (!batch || !batch.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Batch not found or inactive'
            });
        }
        // Find the money box
        const moneyBox = await MoneyBox_1.default.findOne({ batchId, boxNumber });
        if (!moneyBox) {
            return res.status(404).json({
                success: false,
                message: 'Money box not found'
            });
        }
        // Update total amount
        moneyBox.totalAmount += amount;
        moneyBox.transactions.push({
            amount,
            donorName: donorName || 'Anonymous',
            donorPhone: donorPhone || '',
            createdAt: new Date()
        });
        await moneyBox.save();
        // Create collection event
        const event = await CollectionEvent_1.default.create({
            batchId,
            boxNumber,
            amount,
            donorName: donorName || 'Anonymous',
            donorPhone: donorPhone || '',
            timestamp: new Date()
        });
        // Get updated batch totals
        const allBoxes = await MoneyBox_1.default.find({ batchId });
        const totalCollected = allBoxes.reduce((sum, box) => sum + box.totalAmount, 0);
        res.json({
            success: true,
            data: {
                box: moneyBox,
                batchTotal: totalCollected,
                event
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
// Get collection history for a batch
router.get('/history/:batchId', auth_1.authenticate, async (req, res) => {
    try {
        const { batchId } = req.params;
        const { limit = 100, page = 1 } = req.query;
        const events = await CollectionEvent_1.default.find({ batchId })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));
        const total = await CollectionEvent_1.default.countDocuments({ batchId });
        res.json({
            success: true,
            data: events,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
// Get all collections (admin)
router.get('/all', auth_1.authenticate, async (req, res) => {
    try {
        // if (req.user?.role !== 'admin') {
        //   return res.status(403).json({
        //     success: false,
        //     message: 'Admin access required'
        //   });
        // }
        const { limit = 100, batchId } = req.query;
        const filter = {};
        if (batchId)
            filter.batchId = batchId;
        const events = await CollectionEvent_1.default.find(filter)
            .populate('batchId', 'name')
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));
        res.json({
            success: true,
            data: events
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
// Get box details
router.get('/box/:batchId/:boxNumber', auth_1.authenticate, async (req, res) => {
    try {
        const { batchId, boxNumber } = req.params;
        const box = await MoneyBox_1.default.findOne({
            batchId,
            boxNumber: parseInt(boxNumber)
        });
        if (!box) {
            return res.status(404).json({
                success: false,
                message: 'Box not found'
            });
        }
        res.json({
            success: true,
            data: box
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
