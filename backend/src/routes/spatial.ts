import { Router, type Request, type Response } from 'express';
import { roomQueries, participantQueries, spatialQueries } from '../db.js';
import type { ParticipantRow, RoomParams } from '../types/index.js';

const router = Router();

// Get spatial positions for a room
router.get('/:roomId/spatial/positions', (req: Request<RoomParams>, res: Response) => {
  try {
    const room = roomQueries.getById.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const positions = spatialQueries.getPositionsByRoom.all(room.id);
    res.json({ positions });
  } catch (error) {
    console.error('Error getting spatial positions:', error);
    res.status(500).json({ error: 'Failed to get spatial positions' });
  }
});

// Save spatial positions (batch)
router.post('/:roomId/spatial/positions', (req: Request<RoomParams>, res: Response) => {
  try {
    const room = roomQueries.getById.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const adminKey = req.query.admin_key as string;
    if (!adminKey || !roomQueries.validateAdminKey.get(room.id, adminKey)) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }

    const { positions } = req.body as { positions: Array<{ participant_id: number; x: number; y: number }> };
    if (!positions || !Array.isArray(positions)) {
      return res.status(400).json({ error: 'positions array required' });
    }

    // Clear existing and insert new
    spatialQueries.clearPositions.run(room.id);
    for (const pos of positions) {
      spatialQueries.setPosition.run(room.id, pos.participant_id, pos.x, pos.y);
    }

    // Broadcast positions update
    const wsManager = req.app.get('wsManager');
    if (wsManager) {
      const updatedPositions = spatialQueries.getPositionsByRoom.all(room.id);
      wsManager.broadcastToRoom(room.id, {
        type: 'spatial_positions_updated',
        positions: updatedPositions
      });
    }

    res.json({ success: true, count: positions.length });
  } catch (error) {
    console.error('Error saving spatial positions:', error);
    res.status(500).json({ error: 'Failed to save spatial positions' });
  }
});

// Get spatial presentation order
router.get('/:roomId/spatial/order', (req: Request<RoomParams>, res: Response) => {
  try {
    const room = roomQueries.getById.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const order = spatialQueries.getOrderByRoom.all(room.id);
    res.json({ order });
  } catch (error) {
    console.error('Error getting spatial order:', error);
    res.status(500).json({ error: 'Failed to get spatial order' });
  }
});

// Save spatial presentation order
router.post('/:roomId/spatial/order', (req: Request<RoomParams>, res: Response) => {
  try {
    const room = roomQueries.getById.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const adminKey = req.query.admin_key as string;
    if (!adminKey || !roomQueries.validateAdminKey.get(room.id, adminKey)) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }

    const { order } = req.body as { order: number[] }; // Array of participant IDs in order
    if (!order || !Array.isArray(order)) {
      return res.status(400).json({ error: 'order array required' });
    }

    // Clear existing and insert new order
    spatialQueries.clearOrder.run(room.id);
    order.forEach((participantId, index) => {
      spatialQueries.setOrder.run(room.id, participantId, index);
    });

    // Also update queue_positions to match the spatial order
    order.forEach((participantId, index) => {
      const participant = participantQueries.getById.get(participantId);
      if (participant && participant.room_id === room.id) {
        // Update queue position to match spatial order
        participantQueries.updateStatus.run(participant.status, participant.id);
      }
    });

    // Broadcast order update
    const wsManager = req.app.get('wsManager');
    if (wsManager) {
      const updatedOrder = spatialQueries.getOrderByRoom.all(room.id);
      wsManager.broadcastToRoom(room.id, {
        type: 'spatial_order_updated',
        order: updatedOrder
      });
    }

    res.json({ success: true, count: order.length });
  } catch (error) {
    console.error('Error saving spatial order:', error);
    res.status(500).json({ error: 'Failed to save spatial order' });
  }
});

// Start mapping session - tells all phones to enter color display mode
router.post('/:roomId/spatial/mapping/start', (req: Request<RoomParams>, res: Response) => {
  try {
    const room = roomQueries.getById.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const adminKey = req.query.admin_key as string;
    if (!adminKey || !roomQueries.validateAdminKey.get(room.id, adminKey)) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }

    // Get all active participants
    const participants = (participantQueries.getQueuedByRoom.all(room.id) as ParticipantRow[])
      .filter(p => p.status !== 'withdrawn');

    // Assign each participant a unique binary ID for color detection
    const numParticipants = participants.length;
    const numPhases = Math.max(1, Math.ceil(Math.log2(numParticipants + 1)));

    // Create assignments: participantId -> bitmask
    const assignments: Record<number, number> = {};
    participants.forEach((p, i) => {
      assignments[p.id] = i + 1; // Start from 1 so 0 = no phone
    });

    const wsManager = req.app.get('wsManager');
    if (wsManager) {
      wsManager.broadcastToRoom(room.id, {
        type: 'mapping_start',
        numPhases,
        assignments,
        participants: participants.map(p => ({
          id: p.id,
          name: p.name,
          profile_id: p.profile_id
        }))
      });
    }

    res.json({
      success: true,
      numPhases,
      numParticipants,
      assignments,
      participants: participants.map(p => ({ id: p.id, name: p.name }))
    });
  } catch (error) {
    console.error('Error starting mapping:', error);
    res.status(500).json({ error: 'Failed to start mapping' });
  }
});

// Advance to next mapping phase
router.post('/:roomId/spatial/mapping/phase', (req: Request<RoomParams>, res: Response) => {
  try {
    const room = roomQueries.getById.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const adminKey = req.query.admin_key as string;
    if (!adminKey || !roomQueries.validateAdminKey.get(room.id, adminKey)) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }

    const { phase, totalPhases, assignments } = req.body;

    const wsManager = req.app.get('wsManager');
    if (wsManager) {
      wsManager.broadcastToRoom(room.id, {
        type: 'mapping_phase',
        phase,
        totalPhases,
        assignments
      });
    }

    res.json({ success: true, phase });
  } catch (error) {
    console.error('Error advancing mapping phase:', error);
    res.status(500).json({ error: 'Failed to advance mapping phase' });
  }
});

// End mapping session
router.post('/:roomId/spatial/mapping/end', (req: Request<RoomParams>, res: Response) => {
  try {
    const room = roomQueries.getById.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const adminKey = req.query.admin_key as string;
    if (!adminKey || !roomQueries.validateAdminKey.get(room.id, adminKey)) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }

    const wsManager = req.app.get('wsManager');
    if (wsManager) {
      wsManager.broadcastToRoom(room.id, {
        type: 'mapping_end'
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error ending mapping:', error);
    res.status(500).json({ error: 'Failed to end mapping' });
  }
});

export default router;
