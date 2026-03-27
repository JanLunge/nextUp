import type { ParticipantRow, ProfileRow, FormattedParticipant, FormattedProfile } from './types/index.js';

// Utility functions

export function validateUrl(url: string | null | undefined): boolean {
  if (!url) return true; // Optional field
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function getMediaType(mimetype: string): 'image' | 'video' | null {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  return null;
}

export function formatParticipant(participant: ParticipantRow | undefined | null): FormattedParticipant | null {
  if (!participant) return null;
  return {
    id: participant.id,
    room_id: participant.room_id,
    profile_id: participant.profile_id,
    name: participant.name,
    tagline: participant.tagline,
    profile_image_path: participant.profile_image_path,
    project_name: participant.project_name,
    project_url: participant.project_url,
    project_description: participant.project_description,
    presentation_media_path: participant.presentation_media_path,
    media_type: participant.media_type,
    current_need: participant.current_need,
    queue_position: participant.queue_position,
    status: participant.status,
    created_at: participant.created_at
  };
}

export function formatProfile(profile: ProfileRow | undefined | null): FormattedProfile | null {
  if (!profile) return null;
  return {
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
  };
}
