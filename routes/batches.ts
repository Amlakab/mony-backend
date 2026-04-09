import express from 'express';
import Batch from '../models/Batch';
import Transaction from '../models/Transaction';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Get all active batches (any authenticated user)
router.get('/', authenticate, async (req, res) => {
  try {
    const batches = await Batch.find({ isActive: true })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name phone');
    
    res.json({
      success: true,
      data: batches
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all batches including inactive (admin only)
router.get('/all', authenticate, authorize('admin'), async (req, res) => {
  try {
    const batches = await Batch.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name phone');
    
    res.json({
      success: true,
      data: batches
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single batch
router.get('/:id', authenticate, async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id)
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create batch (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Batch name is required'
      });
    }
    
    const existingBatch = await Batch.findOne({ name });
    if (existingBatch) {
      return res.status(400).json({
        success: false,
        message: 'Batch name already exists'
      });
    }
    
    const batch = await Batch.create({
      name: name.trim(),
      description: description || '',
      createdBy: req.user!._id
    });
    
    res.status(201).json({
      success: true,
      data: batch,
      message: 'Batch created successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update batch (admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }
    
    if (name && name !== batch.name) {
      const existingBatch = await Batch.findOne({ name });
      if (existingBatch) {
        return res.status(400).json({
          success: false,
          message: 'Batch name already exists'
        });
      }
      batch.name = name;
    }
    
    if (description !== undefined) batch.description = description;
    if (isActive !== undefined) batch.isActive = isActive;
    
    await batch.save();
    
    res.json({
      success: true,
      data: batch,
      message: 'Batch updated successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete batch (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }
    
    // Check if batch has transactions
    const transactions = await Transaction.findOne({ batchId: batch._id });
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get batch statistics
router.get('/:id/stats', authenticate, async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }
    
    const transactions = await Transaction.find({ batchId: batch._id })
      .sort({ timestamp: -1 })
      .limit(50);
    
    const totalTransactions = await Transaction.countDocuments({ batchId: batch._id });
    
    // Calculate daily totals for last 7 days
    const dailyTotals = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dailyTotal = await Transaction.aggregate([
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;