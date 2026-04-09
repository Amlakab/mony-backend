"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Batch_1 = __importDefault(require("../models/Batch"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get all active batches (any authenticated user)
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const batches = await Batch_1.default.find({ isActive: true })
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name phone');
        res.json({
            success: true,
            data: batches
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
// Get all batches including inactive (admin only)
router.get('/all', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res) => {
    try {
        const batches = await Batch_1.default.find()
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name phone');
        res.json({
            success: true,
            data: batches
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
// Get single batch
router.get('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const batch = await Batch_1.default.findById(req.params.id)
            .populate('createdBy', 'name phone');
        if (!batch) {
            return res.status(404).json({
                success: false,
                message: 'Batch not found'
            });
        }
        res.json({
            success: true,
            data: batch
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
// Create batch (admin only)
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Batch name is required'
            });
        }
        const existingBatch = await Batch_1.default.findOne({ name });
        if (existingBatch) {
            return res.status(400).json({
                success: false,
                message: 'Batch name already exists'
            });
        }
        const batch = await Batch_1.default.create({
            name: name.trim(),
            description: description || '',
            createdBy: req.user._id
        });
        res.status(201).json({
            success: true,
            data: batch,
            message: 'Batch created successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
// Update batch (admin only)
router.put('/:id', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res) => {
    try {
        const { name, description, isActive } = req.body;
        const batch = await Batch_1.default.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({
                success: false,
                message: 'Batch not found'
            });
        }
        if (name && name !== batch.name) {
            const existingBatch = await Batch_1.default.findOne({ name });
            if (existingBatch) {
                return res.status(400).json({
                    success: false,
                    message: 'Batch name already exists'
                });
            }
            batch.name = name;
        }
        if (description !== undefined)
            batch.description = description;
        if (isActive !== undefined)
            batch.isActive = isActive;
        await batch.save();
        res.json({
            success: true,
            data: batch,
            message: 'Batch updated successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
// Delete batch (admin only)
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res) => {
    try {
        const batch = await Batch_1.default.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({
                success: false,
                message: 'Batch not found'
            });
        }
        // Check if batch has transactions
        const transactions = await Transaction_1.default.findOne({ batchId: batch._id });
        if (transactions) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete batch with existing transactions. Archive it instead.'
            });
        }
        await batch.deleteOne();
        res.json({
            success: true,
            message: 'Batch deleted successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
// Get batch statistics
router.get('/:id/stats', auth_1.authenticate, async (req, res) => {
    try {
        const batch = await Batch_1.default.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({
                success: false,
                message: 'Batch not found'
            });
        }
        const transactions = await Transaction_1.default.find({ batchId: batch._id })
            .sort({ timestamp: -1 })
            .limit(50);
        const totalTransactions = await Transaction_1.default.countDocuments({ batchId: batch._id });
        // Calculate daily totals for last 7 days
        const dailyTotals = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            const dailyTotal = await Transaction_1.default.aggregate([
                {
                    $match: {
                        batchId: batch._id,
                        timestamp: { $gte: date, $lt: nextDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$totalAmount' }
                    }
                }
            ]);
            dailyTotals.push({
                date: date.toLocaleDateString(),
                total: dailyTotal[0]?.total || 0
            });
        }
        res.json({
            success: true,
            data: {
                batch: {
                    id: batch._id,
                    name: batch.name,
                    description: batch.description,
                    isActive: batch.isActive,
                    totalCollected: batch.totalCollected,
                    boxes: batch.boxes,
                    createdAt: batch.createdAt
                },
                stats: {
                    totalTransactions,
                    dailyTotals,
                    recentTransactions: transactions
                }
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
exports.default = router;
