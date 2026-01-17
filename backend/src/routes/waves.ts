import { Router, type Request, type Response } from 'express';
import { roomQueries, profileQueries, participantQueries, waveQueries } from '../db.js';
import type { WaveWithParticipantInfo, WaveWithProfileInfo, RoomParams, ParticipantParams } from '../types/index.js';

const router = Router();

// Send wave
router.post('/:roomId/waves', (req: Request<RoomParams>, res: Response) => {
  try {
    const room = roomQueries.getById.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const { passphrase, to_participant_id } = req.body;

    if (!passphrase) {
      return res.status(400).json({ error: 'Passphrase required' });
    }
    if (!to_participant_id) {
      return res.status(400).json({ error: 'Target participant ID required' });
    }

    const profile = profileQueries.getByPassphrase.get(passphrase);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const targetParticipant = participantQueries.getById.get(to_participant_id);
    if (!targetParticipant || targetParticipant.room_id !== room.id) {
      return res.status(404).json({ error: 'Target participant not found' });
    }

    // Check if already waved
    const existingWave = waveQueries.getByRoomAndFromTo.get(room.id, profile.id, to_participant_id);
    if (existingWave) {
      return res.status(400).json({ error: 'Already waved at this participant' });
    }

    // Check if target is currently presenting
    const isCurrentlyPresenting = targetParticipant.status === 'presenting';

    // Create wave
    waveQueries.create.run(room.id, profile.id, to_participant_id, isCurrentlyPresenting ? 1 : 0);

    // Check for mutual wave
    const myParticipant = participantQueries.getByRoomAndProfile.get(room.id, profile.id);

    let isMutual = false;
    if (myParticipant) {
      const reverseWave = waveQueries.getByRoomAndFromTo.get(room.id, targetParticipant.profile_id, myParticipant.id);
      isMutual = !!reverseWave;
    }

    // Trigger animation if waving at current presenter
    const wsManager = req.app.get('wsManager');
    if (wsManager && isCurrentlyPresenting) {
      wsManager.broadcastToRoles(room.id, ['presenter', 'timer', 'admin'], {
        type: 'wave_animation',
        participant_id: to_participant_id
      });
    }

    // Notify the target participant
    if (wsManager) {
      wsManager.notifyParticipant(room.id, targetParticipant.profile_id, {
        type: 'wave_received',
        from: {
          id: profile.id,
          name: profile.name,
          profile_image_path: profile.profile_image_path
        }
      });

      // If mutual, notify both parties
      if (isMutual) {
        wsManager.notifyParticipant(room.id, profile.id, {
          type: 'wave_mutual',
          with: {
            id: targetParticipant.profile_id,
            name: targetParticipant.name,
            tagline: targetParticipant.tagline,
            profile_image_path: targetParticipant.profile_image_path,
            project_name: targetParticipant.project_name,
            project_url: targetParticipant.project_url
          }
        });

        wsManager.notifyParticipant(room.id, targetParticipant.profile_id, {
          type: 'wave_mutual',
          with: {
            id: profile.id,
            name: profile.name,
            profile_image_path: profile.profile_image_path
          }
        });
      }
    }

    res.json({
      success: true,
      is_mutual: isMutual,
      triggered_animation: isCurrentlyPresenting
    });
  } catch (error) {
    console.error('Error sending wave:', error);
    res.status(500).json({ error: 'Failed to send wave' });
  }
});

// Get my waves
router.get('/:roomId/waves', (req: Request<RoomParams>, res: Response) => {
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

    // Get waves I sent
    const sent = waveQueries.getSentByProfile.all(room.id, profile.id);

    // Get waves received (if I'm a participant)
    const myParticipant = participantQueries.getByRoomAndProfile.get(room.id, profile.id);
    let received: typeof sent = [];
    if (myParticipant) {
      received = waveQueries.getReceivedByParticipant.all(myParticipant.id) as typeof sent;
    }

    // Determine mutual waves
    const mutual: object[] = [];
    const sentOnly: object[] = [];
    const receivedOnly: object[] = [];

    for (const wave of sent) {
      const targetParticipant = participantQueries.getById.get(wave.to_participant_id);
      if (!targetParticipant) continue;

      // Check if they waved back
      const reverseWave = myParticipant
        ? waveQueries.getByRoomAndFromTo.get(room.id, targetParticipant.profile_id, myParticipant.id)
        : null;

      const waveData = {
        participant_id: wave.to_participant_id,
        profile_id: targetParticipant.profile_id,
        name: wave.name,
        tagline: wave.tagline,
        profile_image_path: wave.profile_image_path,
        project_name: wave.project_name,
        project_url: wave.project_url
      };

      if (reverseWave) {
        mutual.push(waveData);
      } else {
        sentOnly.push(waveData);
      }
    }

    // Find received waves that aren't mutual
    for (const wave of received) {
      const isMutual = sent.some((s: WaveWithParticipantInfo) => {
        const targetParticipant = participantQueries.getById.get(s.to_participant_id);
        return targetParticipant && targetParticipant.profile_id === wave.from_profile_id;
      });

      if (!isMutual) {
        receivedOnly.push({
          profile_id: wave.from_profile_id,
          name: wave.name,
          tagline: wave.tagline,
          profile_image_path: wave.profile_image_path
        });
      }
    }

    res.json({
      mutual,
      sent: sentOnly,
      received: receivedOnly
    });
  } catch (error) {
    console.error('Error getting waves:', error);
    res.status(500).json({ error: 'Failed to get waves' });
  }
});

// Get waves for a specific participant
router.get('/:roomId/participants/:participantId/waves', (req: Request<ParticipantParams>, res: Response) => {
  try {
    const roomId = req.params.roomId;
    const participantId = parseInt(req.params.participantId, 10);
    const participant = participantQueries.getById.get(participantId);
    if (!participant || participant.room_id !== roomId) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    const waves = waveQueries.getWavesForParticipant.all(participant.id) as (WaveWithProfileInfo & { profile_id: number })[];

    res.json({
      count: waves.length,
      wavers: waves.map((w: WaveWithProfileInfo & { profile_id: number }) => ({
        id: w.profile_id,
        name: w.name,
        profile_image_path: w.profile_image_path
      }))
    });
  } catch (error) {
    console.error('Error getting waves for participant:', error);
    res.status(500).json({ error: 'Failed to get waves' });
  }
});

// Check if user has waved at participants
router.get('/:roomId/waves/status', (req: Request<RoomParams>, res: Response) => {
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

    const sent = waveQueries.getSentByProfile.all(room.id, profile.id) as WaveWithParticipantInfo[];
    const wavedAt = sent.map((w: WaveWithParticipantInfo) => w.to_participant_id);

    res.json({
      waved_at: wavedAt
    });
  } catch (error) {
    console.error('Error getting wave status:', error);
    res.status(500).json({ error: 'Failed to get wave status' });
  }
});

export default router;
