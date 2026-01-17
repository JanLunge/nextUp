import Database, { type Statement, type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  RoomRow,
  ProfileRow,
  ParticipantRow,
  WaveRow,
  WaveWithParticipantInfo,
  WaveWithProfileInfo,
  CountResult,
  NextPositionResult
} from './types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/queue.db');

const db: DatabaseType = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize database schema
db.exec(`
  -- Rooms
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    admin_key TEXT NOT NULL,
    timer_duration INTEGER DEFAULT 60,
    current_index INTEGER DEFAULT -1,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Profiles (persistent identity across rooms)
  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    passphrase TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    tagline TEXT,
    profile_image_path TEXT,
    project_name TEXT,
    project_url TEXT,
    project_description TEXT,
    presentation_media_path TEXT,
    media_type TEXT,
    current_need TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Participants (room-specific queue entries)
  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    profile_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    tagline TEXT,
    profile_image_path TEXT,
    project_name TEXT NOT NULL,
    project_url TEXT,
    project_description TEXT NOT NULL,
    presentation_media_path TEXT,
    media_type TEXT,
    current_need TEXT,
    queue_position INTEGER NOT NULL,
    status TEXT DEFAULT 'queued',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (profile_id) REFERENCES profiles(id),
    UNIQUE(room_id, profile_id)
  );

  -- Waves (connection requests)
  CREATE TABLE IF NOT EXISTS waves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    from_profile_id INTEGER NOT NULL,
    to_participant_id INTEGER NOT NULL,
    waved_during_presentation BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (from_profile_id) REFERENCES profiles(id),
    FOREIGN KEY (to_participant_id) REFERENCES participants(id),
    UNIQUE(room_id, from_profile_id, to_participant_id)
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_participants_room ON participants(room_id);
  CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(room_id, status);
  CREATE INDEX IF NOT EXISTS idx_profiles_passphrase ON profiles(passphrase);
  CREATE INDEX IF NOT EXISTS idx_waves_room ON waves(room_id);
  CREATE INDEX IF NOT EXISTS idx_waves_to ON waves(to_participant_id);
  CREATE INDEX IF NOT EXISTS idx_waves_from ON waves(from_profile_id);
`);

// Room queries
export const roomQueries = {
  create: db.prepare(`
    INSERT INTO rooms (id, admin_key, timer_duration) VALUES (?, ?, ?)
  `) as Statement,

  getById: db.prepare(`
    SELECT * FROM rooms WHERE id = ?
  `) as Statement<[string], RoomRow>,

  updateSettings: db.prepare(`
    UPDATE rooms SET timer_duration = ? WHERE id = ?
  `) as Statement,

  updateCurrentIndex: db.prepare(`
    UPDATE rooms SET current_index = ? WHERE id = ?
  `) as Statement,

  updateStatus: db.prepare(`
    UPDATE rooms SET status = ? WHERE id = ?
  `) as Statement,

  validateAdminKey: db.prepare(`
    SELECT id FROM rooms WHERE id = ? AND admin_key = ?
  `) as Statement<[string, string], { id: string } | undefined>
};

// Profile queries
export const profileQueries = {
  create: db.prepare(`
    INSERT INTO profiles (passphrase, name, tagline, profile_image_path, project_name, project_url, project_description, presentation_media_path, media_type, current_need)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `) as Statement,

  getByPassphrase: db.prepare(`
    SELECT * FROM profiles WHERE passphrase = ?
  `) as Statement<[string], ProfileRow>,

  getById: db.prepare(`
    SELECT * FROM profiles WHERE id = ?
  `) as Statement<[number], ProfileRow>,

  update: db.prepare(`
    UPDATE profiles SET
      name = ?, tagline = ?, profile_image_path = ?,
      project_name = ?, project_url = ?, project_description = ?,
      presentation_media_path = ?, media_type = ?, current_need = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `) as Statement
};

// Participant queries
export const participantQueries = {
  create: db.prepare(`
    INSERT INTO participants (room_id, profile_id, name, tagline, profile_image_path, project_name, project_url, project_description, presentation_media_path, media_type, current_need, queue_position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `) as Statement,

  getByRoomAndProfile: db.prepare(`
    SELECT * FROM participants WHERE room_id = ? AND profile_id = ?
  `) as Statement<[string, number], ParticipantRow>,

  getById: db.prepare(`
    SELECT * FROM participants WHERE id = ?
  `) as Statement<[number], ParticipantRow>,

  getByRoom: db.prepare(`
    SELECT * FROM participants WHERE room_id = ? ORDER BY queue_position ASC
  `) as Statement<[string], ParticipantRow>,

  getQueuedByRoom: db.prepare(`
    SELECT * FROM participants WHERE room_id = ? AND status IN ('queued', 'presenting') ORDER BY queue_position ASC
  `) as Statement<[string], ParticipantRow>,

  getPresentedByRoom: db.prepare(`
    SELECT * FROM participants WHERE room_id = ? AND status = 'presented' ORDER BY queue_position ASC
  `) as Statement<[string], ParticipantRow>,

  getByRoomAndPosition: db.prepare(`
    SELECT * FROM participants WHERE room_id = ? AND queue_position = ? AND status != 'withdrawn'
  `) as Statement<[string, number], ParticipantRow>,

  getNextQueuePosition: db.prepare(`
    SELECT COALESCE(MAX(queue_position), 0) + 1 as next_position FROM participants WHERE room_id = ?
  `) as Statement<[string], NextPositionResult>,

  getQueueCount: db.prepare(`
    SELECT COUNT(*) as count FROM participants WHERE room_id = ? AND status = 'queued'
  `) as Statement<[string], CountResult>,

  getPresentedCount: db.prepare(`
    SELECT COUNT(*) as count FROM participants WHERE room_id = ? AND status = 'presented'
  `) as Statement<[string], CountResult>,

  update: db.prepare(`
    UPDATE participants SET
      name = ?, tagline = ?, profile_image_path = ?,
      project_name = ?, project_url = ?, project_description = ?,
      presentation_media_path = ?, media_type = ?, current_need = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `) as Statement,

  updateStatus: db.prepare(`
    UPDATE participants SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `) as Statement,

  withdraw: db.prepare(`
    UPDATE participants SET status = 'withdrawn', updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `) as Statement
};

// Wave queries
export const waveQueries = {
  create: db.prepare(`
    INSERT INTO waves (room_id, from_profile_id, to_participant_id, waved_during_presentation)
    VALUES (?, ?, ?, ?)
  `) as Statement,

  getByRoomAndFromTo: db.prepare(`
    SELECT * FROM waves WHERE room_id = ? AND from_profile_id = ? AND to_participant_id = ?
  `) as Statement<[string, number, number], WaveRow>,

  getSentByProfile: db.prepare(`
    SELECT w.*, p.name, p.tagline, p.profile_image_path, p.project_name, p.project_url
    FROM waves w
    JOIN participants p ON w.to_participant_id = p.id
    WHERE w.room_id = ? AND w.from_profile_id = ?
  `) as Statement<[string, number], WaveWithParticipantInfo>,

  getReceivedByParticipant: db.prepare(`
    SELECT w.*, pr.name, pr.tagline, pr.profile_image_path
    FROM waves w
    JOIN profiles pr ON w.from_profile_id = pr.id
    WHERE w.to_participant_id = ?
  `) as Statement<[number], WaveWithProfileInfo>,

  getWavesForParticipant: db.prepare(`
    SELECT w.*, pr.id as profile_id, pr.name, pr.profile_image_path
    FROM waves w
    JOIN profiles pr ON w.from_profile_id = pr.id
    WHERE w.to_participant_id = ?
  `) as Statement<[number], WaveWithProfileInfo & { profile_id: number }>,

  checkMutual: db.prepare(`
    SELECT w1.id
    FROM waves w1
    JOIN participants p1 ON w1.to_participant_id = p1.id
    JOIN participants p2 ON p2.profile_id = w1.from_profile_id AND p2.room_id = w1.room_id
    JOIN waves w2 ON w2.from_profile_id = p1.profile_id AND w2.to_participant_id = p2.id
    WHERE w1.room_id = ? AND w1.from_profile_id = ? AND w1.to_participant_id = ?
  `) as Statement<[string, number, number], { id: number }>
};

export default db;
