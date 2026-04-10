import express from 'express';
import Transaction from '../models/Transaction';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Get all transactions (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { limit = 100, batchId } = req.query;
    const filter: any = {};
    if (batchId) filter.batchId = batchId;
    
    const transactions = await Transaction.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit as string));
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get transactions by batch
router.get('/batch/:batchId', authenticate, async (req, res) => {
  try {
    const transactions = await Transaction.find({ batchId: req.params.batchId })
      .sort({ timestamp: -1 })
      .limit(100);
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete transaction by ID (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    await transaction.deleteOne();
    
    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});



export default router;