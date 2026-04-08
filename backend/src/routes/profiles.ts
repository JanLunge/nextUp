import { Router, type Request, type Response } from 'express';
import { profileQueries } from '../db.js';
import { generatePassphrase } from '../words.js';
import { formatProfile } from '../utils.js';
import type { PassphraseParams } from '../types/index.js';

const router = Router();

// Create profile (join room)
router.post('/', (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const passphrase = generatePassphrase();

    profileQueries.create.run(
      passphrase,
      name.trim(),
      null, // tagline
      null, // profile_image_path
      null, // project_name
      null, // project_url
      null, // project_description
      null, // presentation_media_path
      null, // media_type
      null // current_need
    );

    const profile = profileQueries.getByPassphrase.get(passphrase);

    if (!profile) {
      return res.status(500).json({ error: 'Failed to create profile' });
    }

    res.status(201).json({
      id: profile.id,
      passphrase,
      name: profile.name,
    });
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

// Validate passphrase / Get profile
router.get('/:passphrase', (req: Request<PassphraseParams>, res: Response) => {
  try {
    const profile = profileQueries.getByPassphrase.get(req.params.passphrase);

    if (!profile) {
      return res.json({ exists: false });
    }

    res.json({
      exists: true,
      profile: formatProfile(profile),
    });
  } catch (error) {
    console.error('Error validating passphrase:', error);
    res.status(500).json({ error: 'Failed to validate passphrase' });
  }
});

// Update profile
router.patch('/:passphrase', (req: Request<PassphraseParams>, res: Response) => {
  try {
    const profile = profileQueries.getByPassphrase.get(req.params.passphrase);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const {
      name,
      tagline,
      profile_image_path,
      project_name,
      project_url,
      project_description,
      presentation_media_path,
      media_type,
      current_need,
    } = req.body;

    profileQueries.update.run(
      name?.trim() || profile.name,
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

    const updatedProfile = profileQueries.getById.get(profile.id);

    res.json({
      profile: formatProfile(updatedProfile),
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
