import { Router, type Request, type Response } from 'express';
import { roomQueries, profileQueries, participantQueries } from '../db.js';
import { generatePassphrase } from '../words.js';
import { formatParticipant, validateUrl } from '../utils.js';
import type { ParticipantRow, RoomParams, ParticipantParams } from '../types/index.js';

const router = Router();

// Submit to queue
router.post('/:roomId/participants', (req: Request<RoomParams>, res: Response) => {
  try {
    const room = roomQueries.getById.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const {
      passphrase,
      name,
      tagline,
      project_name,
      project_url,
      project_description,
      current_need,
      profile_image_path,
      presentation_media_path,
      media_type,
    } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Validate URL if provided
    if (project_url && !validateUrl(project_url)) {
      return res.status(400).json({ error: 'Invalid project URL' });
    }

    let profile;
    let isNewProfile = false;

    let existingWithdrawn: ParticipantRow | null = null;

    // Check if using existing passphrase
    if (passphrase) {
      profile = profileQueries.getByPassphrase.get(passphrase);
      if (!profile) {
        return res.status(400).json({ error: 'Invalid passphrase' });
      }

      // Check if already has submission in this room
      const existingSubmission = participantQueries.getByRoomAndProfile.get(room.id, profile.id);
      if (existingSubmission) {
        if (existingSubmission.status !== 'withdrawn') {
          return res.status(400).json({ error: 'Already submitted to this room' });
        }
        // Track the withdrawn submission so we can reactivate it
        existingWithdrawn = existingSubmission;
      }
    } else {
      // Create new profile
      const newPassphrase = generatePassphrase();
      profileQueries.create.run(
        newPassphrase,
        name.trim(),
        tagline?.trim() || null,
        profile_image_path || null,
        project_name?.trim() || '',
        project_url || null,
        project_description?.trim() || '',
        presentation_media_path || null,
        media_type || null,
        current_need?.trim() || null
      );
      profile = profileQueries.getByPassphrase.get(newPassphrase);
      isNewProfile = true;
    }

    if (!profile) {
      return res.status(500).json({ error: 'Failed to create profile' });
    }

    // Get next queue position
    const nextPositionResult = participantQueries.getNextQueuePosition.get(room.id);
    const next_position = nextPositionResult?.next_position ?? 1;

    let participant;

    if (existingWithdrawn) {
      // Reactivate withdrawn submission with new data
      participantQueries.reactivate.run(
        name.trim(),
        tagline?.trim() || null,
        profile_image_path || null,
        project_name?.trim() || '',
        project_url || null,
        project_description?.trim() || '',
        presentation_media_path || null,
        media_type || null,
        current_need?.trim() || null,
        next_position,
        existingWithdrawn.id
      );
      participant = participantQueries.getById.get(existingWithdrawn.id);
    } else {
      // Create new participant
      participantQueries.create.run(
        room.id,
        profile.id,
        name.trim(),
        tagline?.trim() || null,
        profile_image_path || null,
        project_name?.trim() || '',
        project_url || null,
        project_description?.trim() || '',
        presentation_media_path || null,
        media_type || null,
        current_need?.trim() || null,
        next_position
      );
      participant = participantQueries.getByRoomAndProfile.get(room.id, profile.id);
    }

    // Also update profile with latest data
    if (!isNewProfile) {
      profileQueries.update.run(
        name.trim(),
        tagline?.trim() ?? profile.tagline,
        profile_image_path ?? profile.profile_image_path,
        project_name?.trim() ?? profile.project_name,
        project_url ?? profile.project_url,
        project_description?.trim() ?? profile.project_description,
        presentation_media_path ?? profile.presentation_media_path,
        media_type ?? profile.media_type,
        current_need?.trim() ?? profile.current_need,
        profile.id
      );
    }

    // Broadcast via WebSocket
    const wsManager = req.app.get('wsManager');
    if (wsManager && participant) {
      wsManager.broadcastToRoom(room.id, {
        type: 'participant_joined',
        participant: formatParticipant(participant),
        queue_count: participantQueries.getQueueCount.get(room.id)?.count ?? 0,
      });
    }

    res.status(201).json({
      id: participant?.id,
      passphrase: profile.passphrase,
      queue_position: next_position,
      is_new_profile: isNewProfile,
    });
  } catch (error) {
    console.error('Error submitting to queue:', error);
    res.status(500).json({ error: 'Failed to submit to queue' });
  }
});

// Get all participants (for presenter)
router.get('/:roomId/participants', (req: Request<RoomParams>, res: Response) => {
  try {
    const room = roomQueries.getById.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const participants = (participantQueries.getByRoom.all(room.id) as ParticipantRow[])
      .filter((p: ParticipantRow) => p.status !== 'withdrawn')
      .map(formatParticipant);

    res.json({
      participants,
      queue_count: participantQueries.getQueueCount.get(room.id)?.count ?? 0,
      current_index: room.current_index,
    });
  } catch (error) {
    console.error('Error getting participants:', error);
    res.status(500).json({ error: 'Failed to get participants' });
  }
});

// Get presented list (public)
router.get('/:roomId/participants/presented', (req: Request<RoomParams>, res: Response) => {
  try {
    const room = roomQueries.getById.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const participants = participantQueries.getPresentedByRoom.all(room.id).map(formatParticipant);

    res.json({
      participants,
      count: participants.length,
    });
  } catch (error) {
    console.error('Error getting presented participants:', error);
    res.status(500).json({ error: 'Failed to get presented participants' });
  }
});

// Get own submission
router.get('/:roomId/participants/me', (req: Request<RoomParams>, res: Response) => {
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
      return res.status(404).json({ error: 'Profile not found' });
    }

    const participant = participantQueries.getByRoomAndProfile.get(room.id, profile.id);
    if (!participant || participant.status === 'withdrawn') {
      return res.status(404).json({ error: 'No submission found' });
    }

    const queuedParticipants = participantQueries.getQueuedByRoom.all(room.id) as ParticipantRow[];
    const position =
      queuedParticipants.findIndex((p: ParticipantRow) => p.id === participant.id) + 1;

    res.json({
      participant: formatParticipant(participant),
      queue_position: position > 0 ? position : null,
      status: participant.status,
    });
  } catch (error) {
    console.error('Error getting own submission:', error);
    res.status(500).json({ error: 'Failed to get submission' });
  }
});

// Update own submission
router.patch('/:roomId/participants/me', (req: Request<RoomParams>, res: Response) => {
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
      return res.status(404).json({ error: 'Profile not found' });
    }

    const participant = participantQueries.getByRoomAndProfile.get(room.id, profile.id);
    if (!participant || participant.status === 'withdrawn') {
      return res.status(404).json({ error: 'No submission found' });
    }

    const {
      name,
      tagline,
      project_name,
      project_url,
      project_description,
      current_need,
      profile_image_path,
      presentation_media_path,
      media_type,
    } = req.body;

    // Validate URL if provided
    if (project_url && !validateUrl(project_url)) {
      return res.status(400).json({ error: 'Invalid project URL' });
    }

    participantQueries.update.run(
      name?.trim() || participant.name,
      tagline?.trim() ?? participant.tagline,
      profile_image_path ?? participant.profile_image_path,
      project_name?.trim() ?? participant.project_name,
      project_url ?? participant.project_url,
      project_description?.trim() ?? participant.project_description,
      presentation_media_path ?? participant.presentation_media_path,
      media_type ?? participant.media_type,
      current_need?.trim() ?? participant.current_need,
      participant.id
    );

    const updatedParticipant = participantQueries.getById.get(participant.id);

    // Broadcast via WebSocket
    const wsManager = req.app.get('wsManager');
    if (wsManager && updatedParticipant) {
      wsManager.broadcastToRoom(room.id, {
        type: 'participant_updated',
        participant: formatParticipant(updatedParticipant),
      });
    }

    res.json({
      participant: formatParticipant(updatedParticipant),
    });
  } catch (error) {
    console.error('Error updating submission:', error);
    res.status(500).json({ error: 'Failed to update submission' });
  }
});

// Withdraw
router.delete('/:roomId/participants/me', (req: Request<RoomParams>, res: Response) => {
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
      return res.status(404).json({ error: 'Profile not found' });
    }

    const participant = participantQueries.getByRoomAndProfile.get(room.id, profile.id);
    if (!participant || participant.status === 'withdrawn') {
      return res.status(404).json({ error: 'No submission found' });
    }

    participantQueries.withdraw.run(participant.id);

    // Broadcast via WebSocket
    const wsManager = req.app.get('wsManager');
    if (wsManager) {
      wsManager.broadcastToRoom(room.id, {
        type: 'participant_withdrawn',
        participantId: participant.id,
        queue_count: participantQueries.getQueueCount.get(room.id)?.count ?? 0,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error withdrawing:', error);
    res.status(500).json({ error: 'Failed to withdraw' });
  }
});

// Get single participant (for detail view)
router.get(
  '/:roomId/participants/:participantId',
  (req: Request<ParticipantParams>, res: Response) => {
    try {
      const roomId = req.params.roomId;
      const participantId = parseInt(req.params.participantId, 10);
      const participant = participantQueries.getById.get(participantId);

      if (!participant || participant.room_id !== roomId) {
        return res.status(404).json({ error: 'Participant not found' });
      }

      res.json({
        participant: formatParticipant(participant),
      });
    } catch (error) {
      console.error('Error getting participant:', error);
      res.status(500).json({ error: 'Failed to get participant' });
    }
  }
);

export default router;
