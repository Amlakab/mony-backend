import express from 'express';
import MoneyBox from '../models/MoneyBox';
import CollectionEvent from '../models/CollectionEvent';
import Batch from '../models/Batch';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Get money denominations
router.get('/denominations', authenticate, async (req, res) => {
  const denominations = [5, 10, 20, 30, 50, 100, 150, 200, 300, 500];
  res.json({
    success: true,
    data: denominations
  });
});

// Collect money
router.post('/collect', authenticate, async (req, res) => {
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
    const batch = await Batch.findById(batchId);
    if (!batch || !batch.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found or inactive'
      });
    }
    
    // Find the money box
    const moneyBox = await MoneyBox.findOne({ batchId, boxNumber });
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
    const event = await CollectionEvent.create({
      batchId,
      boxNumber,
      amount,
      donorName: donorName || 'Anonymous',
      donorPhone: donorPhone || '',
      timestamp: new Date()
    });
    
    // Get updated batch totals
    const allBoxes = await MoneyBox.find({ batchId });
    const totalCollected = allBoxes.reduce((sum, box) => sum + box.totalAmount, 0);
    
    res.json({
      success: true,
      data: {
        box: moneyBox,
        batchTotal: totalCollected,
        event
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get collection history for a batch
router.get('/history/:batchId', authenticate, async (req, res) => {
  try {
    const { batchId } = req.params;
    const { limit = 100, page = 1 } = req.query;
    
    const events = await CollectionEvent.find({ batchId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit as string))
      .skip((parseInt(page as string) - 1) * parseInt(limit as string));
    
    const total = await CollectionEvent.countDocuments({ batchId });
    
    res.json({
      success: true,
      data: events,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all collections (admin)
router.get('/all', authenticate, async (req, res) => {
  try {
    // if (req.user?.role !== 'admin') {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Admin access required'
    //   });
    // }
    
    const { limit = 100, batchId } = req.query;
    const filter: any = {};
    if (batchId) filter.batchId = batchId;
    
    const events = await CollectionEvent.find(filter)
      .populate('batchId', 'name')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit as string));
    
    res.json({
      success: true,
      data: events
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get box details
router.get('/box/:batchId/:boxNumber', authenticate, async (req, res) => {
  try {
    const { batchId, boxNumber } = req.params;
    
    const box = await MoneyBox.findOne({ 
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;