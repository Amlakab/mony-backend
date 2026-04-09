import { Server, Socket } from 'socket.io';
import Batch from '../models/Batch';
import Transaction from '../models/Transaction';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface CollectionSocket extends Socket {
  userId?: string;
  user?: any;
}

const noteImages: Record<number, string> = {
  5: '/notes/5birr.jpeg',
  10: '/notes/10birr.jpeg',
  50: '/notes/50birr.jpeg',
  100: '/notes/100birr.jpeg',
  200: '/notes/200birr.jpeg'
};

const getNoteBreakdown = (amount: number): Array<{ noteType: number; targetBox: string; image: string }> => {
  const breakdown = [];
  let remaining = amount;
  const noteValues = [200, 100, 50, 10, 5];
  
  for (const noteValue of noteValues) {
    while (remaining >= noteValue) {
      breakdown.push({
        noteType: noteValue,
        targetBox: `box_${noteValue}`,
        image: noteImages[noteValue]
      });
      remaining -= noteValue;
    }
  }
  
  return breakdown;
};

let globalSequence = 0;

export function setupCollectionSocket(io: Server) {
  // Authentication middleware for socket.io
  io.use(async (socket: CollectionSocket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user || !user.isActive) {
        return next(new Error('Invalid or inactive user'));
      }
      
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: CollectionSocket) => {
    console.log('Client connected:', socket.id, 'User:', socket.userId);

    // Get all active batches
    socket.on('get-batches', async () => {
      try {
        const batches = await Batch.find({ isActive: true }).sort({ createdAt: -1 });
        socket.emit('batches-list', batches);
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    // Get batch details
    socket.on('get-batch-details', async (batchId: string) => {
      try {
        const batch = await Batch.findById(batchId);
        if (!batch) {
          socket.emit('error', { message: 'Batch not found' });
          return;
        }
        
        socket.emit('batch-details', {
          id: batch._id,
          name: batch.name,
          boxes: batch.boxes,
          totalCollected: batch.totalCollected
        });
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    // Get all batch totals for leaderboard
    socket.on('get-all-batch-totals', async () => {
      try {
        const batches = await Batch.find({ isActive: true }).select('name totalCollected boxes');
        socket.emit('all-batch-totals', batches);
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    // Get recent transactions
    socket.on('get-recent-transactions', async ({ limit = 50 }) => {
      try {
        const transactions = await Transaction.find()
          .sort({ timestamp: -1 })
          .limit(limit);
        socket.emit('recent-transactions', transactions);
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    // Collect money
    socket.on('collect-money', async (data: {
      batchId: string;
      batchName: string;
      amount: number;
      donorName?: string;
      donorPhone?: string;
    }) => {
      try {
        const { batchId, batchName, amount, donorName, donorPhone } = data;
        
        // Validate amount
        const validAmounts = [5, 10, 20, 30, 50, 60, 100, 150, 200, 250, 300, 350, 400, 450, 500];
        if (!validAmounts.includes(amount)) {
          socket.emit('error', { message: 'Invalid amount' });
          return;
        }
        
        // Get note breakdown
        const breakdown = getNoteBreakdown(amount);
        
        // Find and update batch
        const batch = await Batch.findById(batchId);
        if (!batch) {
          socket.emit('error', { message: 'Batch not found' });
          return;
        }
        
        // Update each box total
        for (const note of breakdown) {
          const boxKey = note.targetBox as keyof typeof batch.boxes;
          if (batch.boxes[boxKey]) {
            batch.boxes[boxKey].total += note.noteType;
            batch.boxes[boxKey].noteCount += 1;
            batch.boxes[boxKey].lastUpdated = new Date();
          }
        }
        
        // Update total collected
        batch.totalCollected += amount;
        await batch.save();
        
        // Save transaction
        globalSequence++;
        const transaction = await Transaction.create({
          batchId,
          batchName,
          totalAmount: amount,
          breakdown,
          donorName: donorName || 'Anonymous',
          donorPhone: donorPhone || '',
          timestamp: new Date(),
          sequenceId: globalSequence
        });
        
        // Get all batch totals for leaderboard
        const allBatchTotals = await Batch.find({ isActive: true }).select('name totalCollected boxes');
        
        // Broadcast to ALL connected clients
        io.emit('money-collected', {
          transaction: {
            id: transaction._id,
            batchId: transaction.batchId,
            batchName: transaction.batchName,
            totalAmount: transaction.totalAmount,
            breakdown: transaction.breakdown,
            donorName: transaction.donorName,
            timestamp: transaction.timestamp,
            sequenceId: transaction.sequenceId
          },
          batchUpdates: {
            batchId: batch._id,
            boxes: batch.boxes,
            totalCollected: batch.totalCollected
          },
          allBatchTotals
        });
        
        // Send success to the sender
        socket.emit('collection-success', {
          amount,
          batchName,
          breakdown
        });
        
      } catch (error: any) {
        console.error('Error collecting money:', error);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}