import { Router, type Request, type Response } from 'express';
import { roomQueries, participantQueries, profileQueries } from '../db.js';
import { generateRoomId, generateAdminKey } from '../words.js';
import { formatParticipant } from '../utils.js';
import type { ParticipantRow, RoomParams } from '../types/index.js';

const router = Router();

// Create room
router.post('/', (req: Request, res: Response) => {
  try {
    const id = generateRoomId();
    const admin_key = generateAdminKey();
    const timer_duration = req.body.timer_duration || 60;

    roomQueries.create.run(id, admin_key, timer_duration);
    const room = roomQueries.getById.get(id);

    if (!room) {
      return res.status(500).json({ error: 'Failed to create room' });
    }

    res.status(201).json({
      id: room.id,
      admin_key,
      timer_duration: room.timer_duration,
      created_at: room.created_at
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Get room
router.get('/:roomId', (req: Request<RoomParams>, res: Response) => {
  try {
    const room = roomQueries.getById.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const participants = participantQueries.getQueuedByRoom.all(room.id) as ParticipantRow[];
    const currentParticipant = participants.find((p: ParticipantRow) => p.queue_position === room.current_index);
    const nextParticipant = participants.find((p: ParticipantRow) => p.queue_position === room.current_index + 1);
    const queueCount = participantQueries.getQueueCount.get(room.id)?.count ?? 0;
    const presentedCount = participantQueries.getPresentedCount.get(room.id)?.count ?? 0;

    res.json({
      id: room.id,
      timer_duration: room.timer_duration,
      current_index: room.current_index,
      status: room.status,
      current_participant: formatParticipant(currentParticipant),
      next_participant: formatParticipant(nextParticipant),
      queue_count: queueCount,
      presented_count: presentedCount
    });
  } catch (error) {
    console.error('Error getting room:', error);
    res.status(500).json({ error: 'Failed to get room' });
  }
});

// Update room settings
router.patch('/:roomId', (req: Request<RoomParams>, res: Response) => {
  try {
    const room = roomQueries.getById.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check admin key if provided
    const adminKey = (req.query.admin_key as string) || req.body.admin_key;
    if (adminKey && !roomQueries.validateAdminKey.get(room.id, adminKey)) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }

    if (req.body.timer_duration) {
      roomQueries.updateSettings.run(req.body.timer_duration, room.id);
    }

    const updatedRoom = roomQueries.getById.get(room.id);
    if (!updatedRoom) {
      return res.status(500).json({ error: 'Failed to update room' });
    }

    res.json({
      id: updatedRoom.id,
      timer_duration: updatedRoom.timer_duration,
      current_index: updatedRoom.current_index,
      status: updatedRoom.status
    });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// Validate admin key
router.get('/:roomId/admin', (req: Request<RoomParams>, res: Response) => {
  try {
    const room = roomQueries.getById.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const key = req.query.key as string;
    const isValid = roomQueries.validateAdminKey.get(room.id, key);

    if (!isValid) {
      return res.json({ valid: false });
    }

    const participants = participantQueries.getQueuedByRoom.all(room.id) as ParticipantRow[];
    const currentParticipant = participants.find((p: ParticipantRow) => p.queue_position === room.current_index);
    const nextParticipant = participants.find((p: ParticipantRow) => p.queue_position === room.current_index + 1);
    const queueCount = participantQueries.getQueueCount.get(room.id)?.count ?? 0;
    const presentedCount = participantQueries.getPresentedCount.get(room.id)?.count ?? 0;

    res.json({
      valid: true,
      room: {
        id: room.id,
        timer_duration: room.timer_duration,
        current_index: room.current_index,
        status: room.status,
        current_participant: formatParticipant(currentParticipant),
        next_participant: formatParticipant(nextParticipant),
        queue_count: queueCount,
        presented_count: presentedCount
      }
    });
  } catch (error) {
    console.error('Error validating admin key:', error);
    res.status(500).json({ error: 'Failed to validate admin key' });
  }
});

// Check passphrase status in room
router.get('/:roomId/check', (req: Request<RoomParams>, res: Response) => {
  try {
    const room = roomQueries.getById.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const passphrase = req.query.passphrase as string;
    if (!passphrase) {
      return res.status(400).json({ error: 'Passphrase required' });
    }

    const profile = profileQueries.getByPassphrase.get(passphrase);

    if (!profile) {
      return res.json({ profile_exists: false });
    }

    const participant = participantQueries.getByRoomAndProfile.get(room.id, profile.id);

    if (participant && participant.status !== 'withdrawn') {
      const queuedParticipants = participantQueries.getQueuedByRoom.all(room.id) as ParticipantRow[];
      const position = queuedParticipants.findIndex((p: ParticipantRow) => p.id === participant.id) + 1;

      return res.json({
        profile_exists: true,
        profile_id: profile.id,
        has_submission_in_room: true,
        submission_status: participant.status,
        queue_position: position > 0 ? position : null,
        participant: formatParticipant(participant)
      });
    }

    return res.json({
      profile_exists: true,
      profile_id: profile.id,
      has_submission_in_room: false,
      profile: {
        id: profile.id,
        name: profile.name,
        tagline: profile.tagline,
        profile_image_path: profile.profile_image_path,
        project_name: profile.project_name,
        project_url: profile.project_url,
        project_description: profile.project_description,
        presentation_media_path: profile.presentation_media_path,
        media_type: profile.media_type,
        current_need: profile.current_need
      }
    });
  } catch (error) {
    console.error('Error checking passphrase:', error);
    res.status(500).json({ error: 'Failed to check passphrase' });
  }
});

// Navigation: Next presenter
router.post('/:roomId/next', (req: Request<RoomParams>, res: Response) => {
  try {
    const room = roomQueries.getById.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Validate admin key
    const adminKey = req.query.admin_key as string;
    if (adminKey && !roomQueries.validateAdminKey.get(room.id, adminKey)) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }

    const participants = (participantQueries.getByRoom.all(room.id) as ParticipantRow[]).filter((p: ParticipantRow) => p.status !== 'withdrawn');

    // Mark current presenter as presented
    const currentParticipant = participants.find((p: ParticipantRow) => p.queue_position === room.current_index);
    if (currentParticipant) {
      participantQueries.updateStatus.run('presented', currentParticipant.id);
    }

    // Find next valid presenter
    let newIndex = room.current_index + 1;
    let nextParticipant = participants.find((p: ParticipantRow) => p.queue_position === newIndex && p.status === 'queued');

    const maxPosition = Math.max(...participants.map((p: ParticipantRow) => p.queue_position), 0);
    while (!nextParticipant && newIndex <= maxPosition) {
      newIndex++;
      nextParticipant = participants.find((p: ParticipantRow) => p.queue_position === newIndex && p.status === 'queued');
    }

    if (nextParticipant) {
      participantQueries.updateStatus.run('presenting', nextParticipant.id);
      roomQueries.updateCurrentIndex.run(newIndex, room.id);
    } else {
      roomQueries.updateCurrentIndex.run(newIndex, room.id);
    }

    const updatedRoom = roomQueries.getById.get(room.id);
    const updatedParticipants = participantQueries.getQueuedByRoom.all(room.id) as ParticipantRow[];
    const newCurrentParticipant = updatedParticipants.find((p: ParticipantRow) => p.queue_position === updatedRoom?.current_index);
    const newNextParticipant = updatedParticipants.find((p: ParticipantRow) => p.queue_position === (updatedRoom?.current_index ?? 0) + 1 && p.status === 'queued');

    // Broadcast via WebSocket
    const wsManager = req.app.get('wsManager');
    if (wsManager) {
      wsManager.broadcastToRoom(room.id, {
        type: 'presenter_changed',
        current_participant: formatParticipant(newCurrentParticipant),
        next_participant: formatParticipant(newNextParticipant),
        queue_count: participantQueries.getQueueCount.get(room.id)?.count ?? 0,
        direction: 'next'
      });

      // Notify next presenter they're up next
      if (newNextParticipant) {
        wsManager.notifyParticipant(room.id, newNextParticipant.profile_id, {
          type: 'you_are_next'
        });
      }
    }

    res.json({
      current_index: updatedRoom?.current_index,
      current_participant: formatParticipant(newCurrentParticipant),
      next_participant: formatParticipant(newNextParticipant)
    });
  } catch (error) {
    console.error('Error going to next presenter:', error);
    res.status(500).json({ error: 'Failed to go to next presenter' });
  }
});

// Navigation: Previous presenter
router.post('/:roomId/previous', (req: Request<RoomParams>, res: Response) => {
  try {
    const room = roomQueries.getById.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Validate admin key
    const adminKey = req.query.admin_key as string;
    if (adminKey && !roomQueries.validateAdminKey.get(room.id, adminKey)) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }

    if (room.current_index <= 0) {
      return res.status(400).json({ error: 'Already at start' });
    }

    const participants = (participantQueries.getByRoom.all(room.id) as ParticipantRow[]).filter((p: ParticipantRow) => p.status !== 'withdrawn');

    // Reset current presenter to queued
    const currentParticipant = participants.find((p: ParticipantRow) => p.queue_position === room.current_index);
    if (currentParticipant) {
      participantQueries.updateStatus.run('queued', currentParticipant.id);
    }

    // Find previous valid presenter
    let newIndex = room.current_index - 1;
    let prevParticipant = participants.find((p: ParticipantRow) => p.queue_position === newIndex);

    while (!prevParticipant && newIndex > 0) {
      newIndex--;
      prevParticipant = participants.find((p: ParticipantRow) => p.queue_position === newIndex);
    }

    if (prevParticipant) {
      participantQueries.updateStatus.run('presenting', prevParticipant.id);
    }

    roomQueries.updateCurrentIndex.run(newIndex, room.id);

    const updatedRoom = roomQueries.getById.get(room.id);
    const updatedParticipants = (participantQueries.getByRoom.all(room.id) as ParticipantRow[]).filter((p: ParticipantRow) => p.status !== 'withdrawn');
    const newCurrentParticipant = updatedParticipants.find((p: ParticipantRow) => p.queue_position === updatedRoom?.current_index);
    const newNextParticipant = updatedParticipants.find((p: ParticipantRow) => p.queue_position === (updatedRoom?.current_index ?? 0) + 1);

    // Broadcast via WebSocket
    const wsManager = req.app.get('wsManager');
    if (wsManager) {
      wsManager.broadcastToRoom(room.id, {
        type: 'presenter_changed',
        current_participant: formatParticipant(newCurrentParticipant),
        next_participant: formatParticipant(newNextParticipant),
        queue_count: participantQueries.getQueueCount.get(room.id)?.count ?? 0,
        direction: 'previous'
      });
    }

    res.json({
      current_index: updatedRoom?.current_index,
      current_participant: formatParticipant(newCurrentParticipant),
      next_participant: formatParticipant(newNextParticipant)
    });
  } catch (error) {
    console.error('Error going to previous presenter:', error);
    res.status(500).json({ error: 'Failed to go to previous presenter' });
  }
});

// Timer controls
router.post('/:roomId/timer/start', (req: Request<RoomParams>, res: Response) => {
  try {
    const room = roomQueries.getById.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const adminKey = req.query.admin_key as string;
    if (adminKey && !roomQueries.validateAdminKey.get(room.id, adminKey)) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }

    const wsManager = req.app.get('wsManager');
    if (wsManager) {
      wsManager.startTimer(room.id, room.timer_duration);
    }

    res.json({ success: true, duration: room.timer_duration });
  } catch (error) {
    console.error('Error starting timer:', error);
    res.status(500).json({ error: 'Failed to start timer' });
  }
});

router.post('/:roomId/timer/stop', (req: Request<RoomParams>, res: Response) => {
  try {
    const room = roomQueries.getById.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const adminKey = req.query.admin_key as string;
    if (adminKey && !roomQueries.validateAdminKey.get(room.id, adminKey)) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }

    const wsManager = req.app.get('wsManager');
    if (wsManager) {
      wsManager.stopTimer(room.id);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error stopping timer:', error);
    res.status(500).json({ error: 'Failed to stop timer' });
  }
});

router.post('/:roomId/timer/restart', (req: Request<RoomParams>, res: Response) => {
  try {
    const room = roomQueries.getById.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const adminKey = req.query.admin_key as string;
    if (adminKey && !roomQueries.validateAdminKey.get(room.id, adminKey)) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }

    const wsManager = req.app.get('wsManager');
    if (wsManager) {
      wsManager.restartTimer(room.id, room.timer_duration);
    }

    res.json({ success: true, duration: room.timer_duration });
  } catch (error) {
    console.error('Error restarting timer:', error);
    res.status(500).json({ error: 'Failed to restart timer' });
  }
});

export default router;
