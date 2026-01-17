# Presentation Queue System — Final Implementation Plan

---

## 1. Product Overview

A web application for managing live presentation sessions where audience members can queue up to present their projects. The system connects presenters with audience members and facilitates networking through a wave/bookmark feature.

### Core Flow
1. Host creates a room on their laptop → Gets a random room name (e.g., "blue-tiger-sunset")
2. QR code displayed on screen links to the room
3. Attendees scan QR → Submit their project info to join the queue
4. Host advances through presenters using keyboard controls
5. Optional timer counts down presentation time (visible on separate device)
6. Attendees can wave at presenters — waves appear as floating 👋 animations on screen
7. Attendees can browse who presented and connect via mutual waves

---

## 2. User Interfaces

### 2.1 Presenter Display (Laptop at podium)

**Purpose:** Fullscreen display for audience, controlled by host

**Layout — Timer Not Started:**
```
┌────────────────────────────────────────────────────────────────────┐
│  Room: blue-tiger-sunset              Queue: 7 remaining     [QR] │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│    ┌───────────────────────────────┐      ┌────────┐               │
│    │                               │      │Profile │  Jane Doe     │
│    │                               │      │  Pic   │               │
│    │   [Presentation Image/Video]  │      └────────┘               │
│    │   (autoplays muted + looped)  │      "UX Designer"            │
│    │                               │                               │
│    │                               │      Project: SnapFlow        │
│    └───────────────────────────────┘      snapflow.io              │
│                                                                    │
│                                           "An app for quick        │
│                                            photo sharing with      │
│                                            friends"                │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│  Up next: [img] John Smith — "BuildBot"         [SPACE to start]  │
└────────────────────────────────────────────────────────────────────┘
```

**Layout — Timer Running with Wave Animations:**
```
┌────────────────────────────────────────────────────────────────────┐
│  Room: blue-tiger-sunset              Queue: 6 remaining     [QR] │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│    ┌───────────────────────────────┐      ┌────────┐               │
│    │                               │      │Profile │  Jane Doe     │
│    │                               │  👋  │  Pic   │               │
│    │   [Presentation Image/Video]  │      └────────┘               │
│    │                         👋    │      "UX Designer"            │
│    │                               │                               │
│    │              👋               │      Project: SnapFlow        │
│    └───────────────────────────────┘      snapflow.io              │
│                                                                    │
│                 👋        👋              "An app for quick        │
│                                            photo sharing..."       │
│          👋                                                        │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│  Up next: [img] John Smith — "BuildBot"                            │
└────────────────────────────────────────────────────────────────────┘
```

**Layout — Timer in Final 1/3 (Current Need Fades In):**
```
┌────────────────────────────────────────────────────────────────────┐
│  Room: blue-tiger-sunset              Queue: 6 remaining     [QR] │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│    ┌───────────────────────────────┐      ┌────────┐               │
│    │                               │  👋  │Profile │  Jane Doe     │
│    │   [Presentation Image/Video]  │      │  Pic   │               │
│    │                               │      └────────┘               │
│    │                    👋         │      "UX Designer"            │
│    └───────────────────────────────┘                               │
│                                           Project: SnapFlow        │
│       👋                                                           │
│    ┌──────────────────────────────────────────────────────────┐    │
│    │  💡 Looking for: Beta testers for our iOS app launch     │    │
│    └──────────────────────────────────────────────────────────┘    │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│  Up next: [img] John Smith — "BuildBot"                            │
└────────────────────────────────────────────────────────────────────┘
```

**Wave Animation Behavior:**
- Each wave from audience spawns a 👋 emoji
- Emoji appears at random position on screen
- Floats upward with slight wobble/drift
- Fades out after ~2 seconds
- Multiple waves can appear simultaneously
- Subtle, not overwhelming — doesn't block content

**Keyboard Controls:**

| Key | Action |
|-----|--------|
| `Space` | Start timer (if stopped) / Stop timer early (if running) |
| `→` Right | Go to next presenter, clears timer, does NOT auto-start, chainable |
| `←` Left | Go to previous presenter, clears timer |

**Live Updates:**
- New participants joining queue
- Edits to submissions
- Queue count changes
- Withdrawals
- Wave animations when audience waves at current presenter

---

### 2.2 Admin Controller (Mobile remote control via QR)

**Purpose:** Remote control for event organizers to manage presentations from their phone

**Access:**
- Accessible via QR code shown from a dropdown menu in the presenter display
- Protected by admin room password (generated when room is created)
- QR encodes: `{baseUrl}/room/{roomId}/admin?key={adminKey}`

**Layout:**
```
┌─────────────────────────────────────┐
│  🎛️ Admin Controller                │
│  blue-tiger-sunset                  │
├─────────────────────────────────────┤
│                                     │
│  Now: Jane Doe — SnapFlow           │
│  Next: John Smith — BuildBot        │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                     │
│        ┌─────────────────┐          │
│        │                 │          │
│        │      0:47       │          │
│        │   [██████░░░░]  │          │
│        │                 │          │
│        └─────────────────┘          │
│                                     │
│  ┌─────────┐  ┌─────────┐           │
│  │  ⏮️ Prev │  │ Next ⏭️  │           │
│  └─────────┘  └─────────┘           │
│                                     │
│  ┌───────────────────────────────┐  │
│  │         ▶️ Start Timer         │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌──────────┐  ┌──────────────┐     │
│  │ ⏹️ Stop   │  │ 🔄 Restart   │     │
│  └──────────┘  └──────────────┘     │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                     │
│  📊 Queue Status                    │
│  ┌───────────────────────────────┐  │
│  │  7 people remaining           │  │
│  │  12 already presented         │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

**Layout — Timer Overtime:**
```
┌─────────────────────────────────────┐
│  🎛️ Admin Controller                │
├─────────────────────────────────────┤
│                                     │
│        ┌─────────────────┐          │
│        │   🔴 OVERTIME   │          │
│        │     +0:23       │          │
│        │   [██████████]  │          │
│        └─────────────────┘          │
│                                     │
│  ... (same controls as above) ...   │
│                                     │
└─────────────────────────────────────┘
```

**Features:**
- Real-time countdown display with color phases (green → yellow → red → overtime)
- Overtime display shows elapsed time past zero with red pulsing indicator
- Previous/Next presenter navigation buttons
- Start/Stop/Restart timer controls
- Queue status showing people remaining and already presented
- Current and next presenter names visible
- All state synced via WebSocket (same as presenter display)

**Presenter Display QR Dropdown:**
```
┌────────────────────────────┐
│  [QR ▼]                    │
├────────────────────────────┤
│  📱 Audience Join          │  ← Default room QR
│  🎛️ Admin Controller       │  ← Admin QR (protected)
│  ⏱️ Timer Display          │  ← Timer-only view
└────────────────────────────┘
```

---

### 2.3 Timer Display (Separate phone/tablet for speaker)

**Purpose:** Speaker-facing countdown, not visible to audience

**Layout:**
```
┌─────────────────────────────────────┐
│                                     │
│                           👋        │
│            0:47                     │
│                    👋               │
│         [██████░░░░]                │
│                                     │
│     👋              👋              │
│                                     │
└─────────────────────────────────────┘
```

**Behavior:**
- Large countdown numbers
- Progress bar
- Color changes: Green → Yellow (under 20s) → Red (under 10s)
- Flash/pulse when time is up
- Receives timer events via WebSocket
- Also shows wave animations so speaker sees audience engagement

---

### 2.3 Participant App (Mobile via QR)

#### 2.3.1 Join Screen
```
┌─────────────────────────────────────┐
│                                     │
│       🎤 Presentation Queue         │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Room code                  │    │
│  │  blue-tiger-sunset          │    │
│  └─────────────────────────────┘    │
│                                     │
│  Your Name *                        │
│  ┌─────────────────────────────┐    │
│  │  John Smith                 │    │
│  └─────────────────────────────┘    │
│                                     │
│  [       Join Room            ]     │
│                                     │
│  ─────────── or ───────────────     │
│                                     │
│  Have a passphrase?                 │
│  ┌─────────────────────────────┐    │
│  │  apple-mountain-river       │    │
│  └─────────────────────────────┘    │
│  [   Join with Passphrase     ]     │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Currently presenting: Jane Doe     │
│  In queue: 7 people                 │
│                                     │
└─────────────────────────────────────┘
```

**Behavior:**
- "Join Room" → Requires name, creates profile, goes to room view (can wave and be identified)
- "Join with Passphrase" → Validates passphrase, loads previous profile data (including name)
  - If passphrase has active submission in this room → Goes to "My Submission" view
  - If passphrase exists but no submission in this room → Goes to room view with profile loaded
  - If passphrase not found → Error message
- Name is required so presenters can see who waved at them

#### 2.3.2 Room View (After Joining)
```
┌─────────────────────────────────────┐
│  blue-tiger-sunset            [⚙️]  │
├─────────────────────────────────────┤
│                                     │
│  🎤 Now Presenting                  │
│  ┌─────────────────────────────┐    │
│  │ ┌──────┐                    │    │
│  │ │ Pic  │  Jane Doe          │    │
│  │ └──────┘  "UX Designer"     │    │
│  │                             │    │
│  │ 📱 SnapFlow                 │    │
│  │ snapflow.io            🔗   │    │
│  │                             │    │
│  │ "An app for quick photo     │    │
│  │  sharing with friends"      │    │
│  │                             │    │
│  │ 💡 Looking for: Beta        │    │
│  │    testers for iOS launch   │    │
│  │                             │    │
│  │ ┌─────────────────────────┐ │    │
│  │ │    👋 Wave at Jane      │ │    │
│  │ └─────────────────────────┘ │    │
│  └─────────────────────────────┘    │
│                                     │
│  Queue: 7 waiting                   │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  [＋] Submit Your Project   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                     │
│  📋 Already Presented (12)     ▼    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ [img] Mike Chen             │    │
│  │ DataViz — dataviz.io   🔗   │    │
│  │ 💡 Looking for: investors   │    │
│  │       [👋 Wave] [Waved ✓]   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ [img] Sara Park             │    │
│  │ EcoTrack — ecotrack.app 🔗  │    │
│  │ 💡 Need: Android developer  │    │
│  │            [👋 Wave]        │    │
│  └─────────────────────────────┘    │
│                                     │
│  ... scrollable list ...            │
│                                     │
└─────────────────────────────────────┘
```

**Current Presenter Card Features:**
- Larger, more prominent than list items
- Full profile image
- Name + tagline
- Project name + clickable URL
- Full description
- Current need (the ask)
- **Wave button** — prominent call to action, triggers animation on presenter display
- Wave button changes to "Waved ✓" after waving

**Presented List Features:**
- All finished presenters visible
- Tappable cards → Opens full detail view
- Clickable project URLs
- Wave button on each card
- Shows if you already waved

#### 2.3.3 Presenter Detail View
```
┌─────────────────────────────────────┐
│  ← Back        Presenter            │
├─────────────────────────────────────┤
│                                     │
│         ┌────────────┐              │
│         │            │              │
│         │  Profile   │              │
│         │   Image    │              │
│         │            │              │
│         └────────────┘              │
│                                     │
│         Jane Doe                    │
│         "UX Designer & Founder"     │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                     │
│  📱 SnapFlow                        │
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │   [Presentation Image/      │    │
│  │    Video Thumbnail]         │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  "An app for quick photo sharing    │
│   with friends. Built with React    │
│   Native and Firebase. Launched     │
│   last month with 500 users."       │
│                                     │
│  🔗 snapflow.io                     │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                     │
│  💡 What they need:                 │
│  "Looking for beta testers for      │
│   our upcoming iOS app launch.      │
│   Also interested in meeting        │
│   potential investors."             │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │      👋 Wave at Jane        │    │
│  └─────────────────────────────┘    │
│                                     │
│  or (if already waved)              │
│                                     │
│  ┌─────────────────────────────┐    │
│  │      ✓ You waved            │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

#### 2.3.4 Submission Form
```
┌─────────────────────────────────────┐
│  ← Back       Submit Project        │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │ ℹ️ Pre-filled from your      │    │
│  │   previous submission       │    │
│  │   [Clear and start fresh]   │    │
│  └─────────────────────────────┘    │
│  (only shown if using passphrase)   │
│                                     │
│  Profile Picture                    │
│  ┌─────────────────────────────┐    │
│  │     [＋] Upload Photo       │    │
│  └─────────────────────────────┘    │
│                                     │
│  Your Name *                        │
│  ┌─────────────────────────────┐    │
│  │  Jane Doe                   │    │
│  └─────────────────────────────┘    │
│                                     │
│  Tagline                            │
│  ┌─────────────────────────────┐    │
│  │  UX Designer & Founder      │    │
│  └─────────────────────────────┘    │
│                                     │
│  Project Name *                     │
│  ┌─────────────────────────────┐    │
│  │  SnapFlow                   │    │
│  └─────────────────────────────┘    │
│                                     │
│  Project URL                        │
│  ┌─────────────────────────────┐    │
│  │  https://snapflow.io        │    │
│  └─────────────────────────────┘    │
│                                     │
│  Description *                      │
│  ┌─────────────────────────────┐    │
│  │  An app for quick photo     │    │
│  │  sharing with friends...    │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  Presentation Media *               │
│  ┌─────────────────────────────┐    │
│  │  [＋] Upload Image/Video    │    │
│  └─────────────────────────────┘    │
│  Max 30s video, 10MB                │
│                                     │
│  What do you need? (Your ask)       │
│  ┌─────────────────────────────┐    │
│  │  Looking for beta testers   │    │
│  │  for iOS app launch...      │    │
│  └─────────────────────────────┘    │
│                                     │
│  [        Submit to Queue        ]  │
│                                     │
└─────────────────────────────────────┘
```

#### 2.3.5 Join Confirmation (shown after entering name)
```
┌─────────────────────────────────────┐
│                                     │
│        ✅ Welcome, John!            │
│                                     │
│  Your passphrase:                   │
│  ┌─────────────────────────────┐    │
│  │   apple-mountain-river      │    │
│  │              [📋 Copy]      │    │
│  └─────────────────────────────┘    │
│                                     │
│  ⚠️  Save this to rejoin later      │
│  or reuse your profile.             │
│                                     │
│  [       Enter Room           ]     │
│                                     │
└─────────────────────────────────────┘
```

#### 2.3.6 Submission Confirmation
```
┌─────────────────────────────────────┐
│                                     │
│             ✅ Submitted!           │
│                                     │
│  You are #8 in the queue            │
│                                     │
│  Your passphrase:                   │
│  ┌─────────────────────────────┐    │
│  │   apple-mountain-river      │    │
│  │              [📋 Copy]      │    │
│  └─────────────────────────────┘    │
│                                     │
│  ⚠️  Save this! You'll need it to   │
│  edit or reuse your submission.     │
│                                     │
│  [     View My Submission     ]     │
│  [     Back to Room           ]     │
│                                     │
└─────────────────────────────────────┘
```

#### 2.3.7 My Submission View
```
┌─────────────────────────────────────┐
│  ← Back        My Submission        │
├─────────────────────────────────────┤
│                                     │
│        Your position: #5            │
│        ≈ 5 minutes until you        │
│                                     │
│  ┌─────────────────────────────┐    │
│  │      [Your submission       │    │
│  │       details here]         │    │
│  └─────────────────────────────┘    │
│                                     │
│  [         ✏️ Edit            ]     │
│  [      🚫 Withdraw           ]     │
│                                     │
└─────────────────────────────────────┘
```

#### 2.3.8 "You're Next" Alert
```
┌─────────────────────────────────────┐
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │    ⚡ YOU'RE UP NEXT! ⚡     │    │
│  │                             │    │
│  │    Get ready to present     │    │
│  │                             │    │
│  │         [Got it]            │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

- Full screen overlay
- Vibration (if supported)
- Pulsing animation
- Triggered when current presentation starts and user is next

#### 2.3.9 Waves / Connections View
```
┌─────────────────────────────────────┐
│  ← Back          My Waves           │
├─────────────────────────────────────┤
│                                     │
│  🤝 Mutual (2)                      │
│  ┌─────────────────────────────┐    │
│  │ [img] Mike Chen             │    │
│  │ DataViz — dataviz.io   🔗   │    │
│  │ 💡 Looking for: investors   │    │
│  └─────────────────────────────┘    │
│                                     │
│  👋 You waved at (3)                │
│  ┌─────────────────────────────┐    │
│  │ [img] Sara Park             │    │
│  │ EcoTrack                    │    │
│  └─────────────────────────────┘    │
│                                     │
│  👋 Waved at you (1)                │
│  ┌─────────────────────────────┐    │
│  │ [img] Tom Wilson            │    │
│  │ CloudSync                   │    │
│  │         [👋 Wave back]      │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

---

## 3. Data Model

### 3.1 Database Schema (SQLite)

```sql
-- Rooms
CREATE TABLE rooms (
    id TEXT PRIMARY KEY,                -- "blue-tiger-sunset"
    admin_key TEXT NOT NULL,            -- random key for admin controller access
    timer_duration INTEGER DEFAULT 60,  -- seconds
    current_index INTEGER DEFAULT -1,   -- -1 = not started, 0+ = presenting
    status TEXT DEFAULT 'active',       -- 'active', 'paused', 'ended'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Profiles (persistent identity across rooms)
CREATE TABLE profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    passphrase TEXT UNIQUE NOT NULL,    -- "apple-mountain-river"

    -- Required identity (for waving)
    name TEXT NOT NULL,                 -- required to join room

    -- Optional identity data
    tagline TEXT,
    profile_image_path TEXT,

    -- Optional project data (for presenting)
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
CREATE TABLE participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    profile_id INTEGER NOT NULL,
    
    -- Snapshot of data at submission time (can differ from profile)
    name TEXT NOT NULL,
    tagline TEXT,
    profile_image_path TEXT,
    project_name TEXT NOT NULL,
    project_url TEXT,
    project_description TEXT NOT NULL,
    presentation_media_path TEXT,
    media_type TEXT,
    current_need TEXT,
    
    -- Queue state
    queue_position INTEGER NOT NULL,
    status TEXT DEFAULT 'queued',       -- 'queued', 'presenting', 'presented', 'withdrawn'
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (profile_id) REFERENCES profiles(id),
    UNIQUE(room_id, profile_id)         -- one submission per profile per room
);

-- Waves (connection requests)
CREATE TABLE waves (
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
CREATE INDEX idx_participants_room ON participants(room_id);
CREATE INDEX idx_participants_status ON participants(room_id, status);
CREATE INDEX idx_profiles_passphrase ON profiles(passphrase);
CREATE INDEX idx_waves_room ON waves(room_id);
CREATE INDEX idx_waves_to ON waves(to_participant_id);
CREATE INDEX idx_waves_from ON waves(from_profile_id);
```

### 3.2 Field Reference

**Profile fields (for joining room & waving):**

| Field | Required | Notes |
|-------|----------|-------|
| name | ✅ | Required to join room — identifies you when waving |
| tagline | | Optional profile info |
| profile_image_path | | Optional profile photo |

**Submission fields (for presenting):**

| Field | Required | Shown on Display | Shown in App | Notes |
|-------|----------|------------------|--------------|-------|
| name | ✅ | ✅ Large | ✅ | From profile |
| tagline | | ✅ | ✅ | |
| profile_image_path | | ✅ Small | ✅ | |
| project_name | ✅ | ✅ | ✅ | |
| project_url | | Optional | ✅ Clickable | |
| project_description | ✅ | ✅ | ✅ | |
| presentation_media_path | ✅ | ✅ Large | Thumbnail | |
| media_type | ✅ | | | 'image' or 'video' |
| current_need | | ✅ Fades in at 1/3 remaining | ✅ Always | The ask |

---

## 4. API Specification

### 4.1 Rooms

#### Create Room
```
POST /api/rooms
Response: {
    id: "blue-tiger-sunset",
    admin_key: "a1b2c3d4e5f6",
    timer_duration: 60,
    created_at: "2024-01-15T10:00:00Z"
}
```

#### Get Room
```
GET /api/rooms/:roomId
Response: {
    id: "blue-tiger-sunset",
    timer_duration: 60,
    current_index: 2,
    status: "active",
    current_participant: { ... },
    next_participant: { ... },
    queue_count: 7,
    presented_count: 12
}
```

#### Update Room Settings
```
PATCH /api/rooms/:roomId
Body: { timer_duration: 90 }
```

#### Navigation Controls
```
POST /api/rooms/:roomId/next
POST /api/rooms/:roomId/previous
POST /api/rooms/:roomId/timer/start
POST /api/rooms/:roomId/timer/stop
POST /api/rooms/:roomId/timer/restart
```

Note: Navigation and timer controls require admin_key as query param when called from admin controller:
`POST /api/rooms/:roomId/next?admin_key=a1b2c3d4e5f6`

#### Validate Admin Key
```
GET /api/rooms/:roomId/admin?key=a1b2c3d4e5f6
Response: {
    valid: true,
    room: {
        id: "blue-tiger-sunset",
        timer_duration: 60,
        current_index: 2,
        status: "active",
        current_participant: { ... },
        next_participant: { ... },
        queue_count: 7,
        presented_count: 12
    }
}
// or
Response: { valid: false }
```

### 4.2 Profiles

#### Create Profile (Join Room)
```
POST /api/profiles
Body: { name: "John Smith" }
Response: {
    id: 456,
    passphrase: "apple-mountain-river",
    name: "John Smith"
}
```
Note: Creates a new profile with just a name. Returns passphrase for future use.

#### Validate Passphrase
```
GET /api/profiles/:passphrase
Response: {
    exists: true,
    profile: {
        id: 456,
        name: "Jane Doe",
        tagline: "UX Designer",
        project_name: "SnapFlow",
        ...
    }
}
// or
Response: { exists: false }
```

#### Check Passphrase Status in Room
```
GET /api/rooms/:roomId/check?passphrase=apple-mountain-river
Response: {
    profile_exists: true,
    has_submission_in_room: true,
    submission_status: "queued",
    queue_position: 5,
    participant: {...}
}
// or
Response: {
    profile_exists: true,
    has_submission_in_room: false,
    profile: {...}                // for room view (can wave)
}
// or
Response: {
    profile_exists: false
}
```

### 4.3 Participants

#### Submit to Queue
```
POST /api/rooms/:roomId/participants
Body: FormData {
    passphrase: "apple-mountain-river",  // optional for new, required for returning
    name: "Jane Doe",
    tagline: "UX Designer",
    project_name: "SnapFlow",
    project_url: "https://snapflow.io",
    project_description: "An app for...",
    current_need: "Looking for beta testers",
    profile_image: File,
    presentation_media: File
}
Response: {
    id: 123,
    passphrase: "apple-mountain-river",
    queue_position: 8,
    is_new_profile: true/false
}
```

#### Get All Participants (Presenter)
```
GET /api/rooms/:roomId/participants
Response: { 
    participants: [...], 
    queue_count: 7,
    current_index: 2
}
```

#### Get Presented List (Public)
```
GET /api/rooms/:roomId/participants/presented
Response: { 
    participants: [...],
    count: 12
}
```

#### Get Own Submission
```
GET /api/rooms/:roomId/participants/me?passphrase=apple-mountain-river
Response: { 
    participant: {...}, 
    queue_position: 5,
    status: "queued"
}
```

#### Update Own Submission
```
PATCH /api/rooms/:roomId/participants/me?passphrase=apple-mountain-river
Body: FormData { ...fields to update }
```

#### Withdraw
```
DELETE /api/rooms/:roomId/participants/me?passphrase=apple-mountain-river
```

#### Get Single Participant (for detail view)
```
GET /api/rooms/:roomId/participants/:participantId
Response: { participant: {...} }
```

### 4.4 Waves

#### Send Wave
```
POST /api/rooms/:roomId/waves
Body: { 
    passphrase: "apple-mountain-river", 
    to_participant_id: 456 
}
Response: { 
    success: true,
    is_mutual: false,
    triggered_animation: true  // true if target is currently presenting
}
```

#### Get My Waves
```
GET /api/rooms/:roomId/waves?passphrase=apple-mountain-river
Response: {
    mutual: [...],
    sent: [...],
    received: [...]
}
```

#### Get Waves for Participant
```
GET /api/rooms/:roomId/participants/:participantId/waves
Response: {
    count: 12,
    wavers: [
        { id: 1, name: "Mike Chen", profile_image_path: "..." },
        ...
    ]
}
```

### 4.5 Uploads

#### Upload File
```
POST /api/upload
Body: FormData { 
    file: File, 
    type: "profile" | "presentation" 
}
Response: { 
    path: "/uploads/abc123.jpg",
    media_type: "image"
}
```

---

## 5. WebSocket Specification

### 5.1 Connection

```javascript
// Client connects and joins room
client.send({
    type: 'join',
    roomId: 'blue-tiger-sunset',
    role: 'presenter' | 'participant' | 'timer' | 'admin',
    passphrase: 'apple-mountain-river',  // optional, for participants
    adminKey: 'a1b2c3d4e5f6'             // required for admin role
});

// Server acknowledges
{ type: 'joined', roomId: 'blue-tiger-sunset', role: 'participant' }
// or for admin with invalid key
{ type: 'error', message: 'Invalid admin key' }
```

### 5.2 Server → All Clients in Room

```javascript
// Queue updates
{ type: 'participant_joined', participant: {...}, queue_count: 8 }
{ type: 'participant_updated', participant: {...} }
{ type: 'participant_withdrawn', participantId: 123, queue_count: 7 }

// Presentation state
{ 
    type: 'presenter_changed', 
    current_participant: {...}, 
    next_participant: {...}, 
    queue_count: 6,
    direction: 'next' | 'previous'
}
```

### 5.3 Server → Presenter + Timer + Admin Clients

```javascript
// Timer events
{ type: 'timer_start', duration: 60 }
{ type: 'timer_tick', remaining: 45, phase: 'main' }
{ type: 'timer_tick', remaining: 18, phase: 'need' }  // final 1/3
{ type: 'timer_end' }
{ type: 'timer_overtime', elapsed: 23 }  // seconds past zero
{ type: 'timer_cleared' }

// Wave animation trigger
{ type: 'wave_animation', participant_id: 123 }
```

### 5.4 Server → Specific Participant

```javascript
{ type: 'you_are_next' }
{ type: 'wave_received', from: { id: 1, name: "Mike" } }
{ type: 'wave_mutual', with: { id: 1, name: "Mike", ... } }
```

---

## 6. File Structure

```
presentation-queue/
├── backend/
│   ├── src/
│   │   ├── index.js                 # Express + WebSocket setup
│   │   ├── db.js                    # SQLite connection + queries
│   │   ├── words.js                 # Word lists for room names + passphrases
│   │   ├── utils.js                 # Helper functions
│   │   ├── routes/
│   │   │   ├── rooms.js             # Room CRUD + controls
│   │   │   ├── participants.js      # Participant CRUD
│   │   │   ├── profiles.js          # Profile/passphrase validation
│   │   │   ├── waves.js             # Wave/bookmark system
│   │   │   └── upload.js            # File upload handling
│   │   └── websocket/
│   │       ├── index.js             # WebSocket server setup
│   │       ├── handlers.js          # Event handlers
│   │       └── rooms.js             # Room subscription management
│   ├── tmp/                         # Uploaded files (gitignored)
│   │   └── uploads/
│   ├── data/                        # SQLite database (gitignored)
│   │   └── queue.db
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── main.js                  # Entry point
│   │   ├── App.vue                  # Router setup
│   │   ├── router/
│   │   │   └── index.js
│   │   ├── pages/
│   │   │   ├── presenter/
│   │   │   │   ├── PresenterView.vue
│   │   │   │   ├── CreateRoom.vue
│   │   │   │   └── components/
│   │   │   │       ├── CurrentPresenter.vue
│   │   │   │       ├── UpNext.vue
│   │   │   │       ├── QRDropdown.vue
│   │   │   │       └── NeedOverlay.vue
│   │   │   ├── admin/
│   │   │   │   └── AdminController.vue
│   │   │   ├── timer/
│   │   │   │   └── TimerView.vue
│   │   │   └── participant/
│   │   │       ├── JoinRoom.vue
│   │   │       ├── JoinConfirmation.vue
│   │   │       ├── RoomView.vue
│   │   │       ├── SubmitForm.vue
│   │   │       ├── MySubmission.vue
│   │   │       ├── PresenterDetail.vue
│   │   │       └── WavesView.vue
│   │   ├── components/
│   │   │   ├── CurrentPresenterCard.vue
│   │   │   ├── ParticipantCard.vue
│   │   │   ├── MediaUpload.vue
│   │   │   ├── WaveButton.vue
│   │   │   ├── WaveEmitter.vue
│   │   │   └── YouAreNextModal.vue
│   │   ├── composables/
│   │   │   ├── useWebSocket.js
│   │   │   ├── useRoom.js
│   │   │   ├── usePassphrase.js
│   │   │   ├── useAdminController.js
│   │   │   └── useApi.js
│   │   ├── api/
│   │   │   └── client.js
│   │   └── assets/
│   │       └── main.css
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
└── README.md
```

---

## 7. Technical Specifications

### 7.1 Dependencies

**Backend:**
```json
{
    "express": "^4.18",
    "better-sqlite3": "^9.0",
    "ws": "^8.14",
    "multer": "^1.4",
    "cors": "^2.8",
    "uuid": "^9.0",
    "dotenv": "^16.0"
}
```

**Frontend:**
```json
{
    "vue": "^3.4",
    "vue-router": "^4.2",
    "@vueuse/core": "^10.7",
    "qrcode.vue": "^3.4",
    "tailwindcss": "^3.4",
    "daisyui": "^4.4",
    "autoprefixer": "^10.4",
    "postcss": "^8.4"
}
```

### 7.2 Environment Variables

```env
PORT=3000
WS_PORT=3001
DATABASE_PATH=./data/queue.db
UPLOAD_PATH=./tmp/uploads
MAX_FILE_SIZE=52428800
FRONTEND_URL=http://localhost:5173
```

### 7.3 Upload Constraints

| Type | Formats | Max Size | Notes |
|------|---------|----------|-------|
| Profile Image | jpg, png, gif, webp | 5MB | Resized to 400x400 |
| Presentation Image | jpg, png, gif, webp | 10MB | Resized to 1920x1080 max |
| Presentation Video | mp4, webm | 50MB | Max 30 seconds |

### 7.4 Word Lists

**Room names** (adjective-animal-noun pattern):
- Adjectives: blue, red, swift, calm, bright, dark, wild, gentle, golden, silver...
- Animals: tiger, eagle, wolf, bear, fox, owl, hawk, lion, dolphin, raven...
- Nouns: sunset, river, mountain, forest, ocean, thunder, crystal, meadow, canyon...

**Passphrases** (noun-noun-noun pattern):
- Simple nouns: apple, bridge, camera, dragon, engine, flower, garden, hammer, island, jacket...

### 7.5 VueUse Helpers

| Composable | Purpose |
|------------|---------|
| `useStorage` | Persist passphrase in localStorage |
| `useWebSocket` | WebSocket with auto-reconnect |
| `useEventListener` | Keyboard controls for presenter |
| `useVibrate` | "You're next" vibration |
| `useClipboard` | Copy passphrase to clipboard |
| `useMediaQuery` | Responsive adjustments |
| `useIntervalFn` | Timer tick backup |
| `useDark` | Theme toggle |
| `useOnline` | Connection status indicator |
| `useWindowFocus` | Pause/resume updates when tab inactive |

### 7.6 Tailwind + DaisyUI Config

```javascript
// tailwind.config.js
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [
        require('daisyui'),
    ],
    daisyui: {
        themes: ["light", "dark", "cupcake"],
    },
}
```

---

## 8. Implementation Phases

### Phase 1: Backend Foundation (Day 1)
- [ ] Project setup: Express, SQLite (better-sqlite3), cors, multer
- [ ] Database schema creation with all tables
- [ ] Word lists for room names (adjective-animal-noun) and passphrases (noun-noun-noun)
- [ ] Room routes: create, get, update settings
- [ ] File upload endpoint with validation
- [ ] Basic error handling middleware

### Phase 2: Profile & Participant Backend (Day 1-2)
- [ ] Profile routes: validate passphrase, get profile
- [ ] Participant routes: create, get, update, delete
- [ ] Room check endpoint (passphrase status in room)
- [ ] Passphrase generation
- [ ] Queue position management
- [ ] Presented list endpoint
- [ ] Profile data reuse logic

### Phase 3: WebSocket Infrastructure (Day 2)
- [ ] WebSocket server setup with ws library
- [ ] Room-based subscription system
- [ ] Client role tracking (presenter, participant, timer, admin)
- [ ] Broadcast helpers (to room, to role, to specific client)
- [ ] Event handlers for join, disconnect
- [ ] Participant-specific messaging (by passphrase)
- [ ] Admin key validation on WebSocket join

### Phase 4: Presenter Controls Backend (Day 2-3)
- [ ] Next/previous navigation endpoints
- [ ] Timer start/stop/restart endpoints
- [ ] Timer tick broadcasting (every second when active)
- [ ] Overtime tracking and broadcasting (elapsed time past zero)
- [ ] Phase detection (main vs need phase at 1/3 remaining)
- [ ] "You're next" notification trigger
- [ ] Current presenter tracking
- [ ] Admin key validation for control endpoints

### Phase 5: Waves Backend (Day 3)
- [ ] Wave creation endpoint
- [ ] Wave animation trigger (when waving at current presenter)
- [ ] Get waves for participant
- [ ] Get my waves (sent, received, mutual)
- [ ] Mutual wave detection
- [ ] Wave notifications via WebSocket

### Phase 6: Frontend Setup (Day 3)
- [ ] Vite + Vue 3 project setup
- [ ] Vue Router configuration
- [ ] Tailwind CSS + DaisyUI setup
- [ ] API client module (fetch wrapper)
- [ ] WebSocket composable with @vueuse/core useWebSocket + reconnect logic
- [ ] Passphrase composable with useStorage

### Phase 7: Presenter Display (Day 4)
- [ ] Create room page (displays admin_key for host reference)
- [ ] Main presenter layout
- [ ] QR dropdown component with 3 options (Audience, Admin, Timer)
- [ ] QR code generation (qrcode.vue)
- [ ] Current presenter display with image/video
- [ ] Video autoplay muted + loop handling
- [ ] Up next preview
- [ ] Queue counter
- [ ] Keyboard event listeners (useEventListener)
- [ ] Current need fade-in animation (at 1/3 remaining)
- [ ] Wave animation overlay (WaveEmitter component)
- [ ] WebSocket integration for live updates

### Phase 8: Timer Display (Day 4)
- [ ] Timer-only route
- [ ] Large countdown display
- [ ] Progress bar
- [ ] Color transitions (green → yellow → red)
- [ ] End animation/flash
- [ ] Overtime display (counts up with red pulsing)
- [ ] Wave animation overlay

### Phase 8.5: Admin Controller (Day 4-5)
- [ ] Admin controller route with key validation
- [ ] Validate admin key on page load
- [ ] Display current/next presenter info
- [ ] Timer display with countdown and overtime
- [ ] Color transitions matching timer display
- [ ] Navigation controls (Previous/Next buttons)
- [ ] Timer controls (Start/Stop/Restart buttons)
- [ ] Queue status display (remaining + presented counts)
- [ ] WebSocket integration for real-time sync
- [ ] Mobile-optimized touch-friendly UI

### Phase 9: Participant App — Join & Room View (Day 5)
- [ ] Join screen with room code input
- [ ] Passphrase input option
- [ ] Room status display (current presenter, queue count)
- [ ] Room view with rich current presenter card
- [ ] Wave button on current presenter (triggers animation)
- [ ] Presented list (scrollable, all finished presenters)
- [ ] Presenter detail view (tap to expand)
- [ ] Clickable project URLs
- [ ] WebSocket integration for live updates

### Phase 10: Participant App — Submission (Day 5-6)
- [ ] Submission form with validation
- [ ] Pre-fill from profile when using passphrase
- [ ] "Clear and start fresh" option
- [ ] Media upload with preview
- [ ] Passphrase display with copy button (useClipboard)
- [ ] Confirmation screen
- [ ] My submission view
- [ ] Edit submission flow
- [ ] Withdraw functionality

### Phase 11: Participant App — Notifications & Waves (Day 6)
- [ ] Queue position display
- [ ] "You're next" modal with vibration (useVibrate)
- [ ] Pulsing animation
- [ ] Wave button on all presenter cards
- [ ] Wave state tracking (already waved)
- [ ] Waves list view (mutual, sent, received)
- [ ] Wave back functionality
- [ ] Wave received notifications

### Phase 12: Polish (Day 7)
- [ ] Responsive design for all views
- [ ] Presenter display optimized for projection (high contrast, large text)
- [ ] Loading states and skeletons
- [ ] Error handling and user feedback (toast notifications)
- [ ] Empty states (no queue, no presented yet, waiting for first presenter)
- [ ] Animations and transitions
- [ ] Accessibility basics (focus management, aria labels)
- [ ] Connection status indicator (useOnline)
- [ ] Reconnection handling

### Phase 13: Testing & Deployment (Day 8)
- [ ] End-to-end flow testing
- [ ] Multiple participant simulation
- [ ] WebSocket reconnection testing
- [ ] Mobile browser testing (iOS Safari, Android Chrome)
- [ ] Timer accuracy testing
- [ ] Wave animation performance testing
- [ ] Build optimization
- [ ] Deployment setup

---

## 9. Navigation Flow

```
JoinRoom.vue
    │
    ├─→ [Join as New] ─────────────────→ RoomView.vue
    │                                        │
    └─→ [Join with Passphrase] ────────┬────┤
                                       │    │
        (has submission in room) ──────│────┼─→ MySubmission.vue
                                       │    │        │
        (no submission, prefill) ──────│────┼─→ SubmitForm.vue (prefilled)
                                       │    │        │
                                       │    ├─→ [＋ Submit] → SubmitForm.vue
                                       │    │        │
                                       │    │        └─→ Confirmation → MySubmission.vue
                                       │    │
                                       │    ├─→ [Tap presenter card] → PresenterDetail.vue
                                       │    │
                                       │    └─→ [My Waves] → WavesView.vue
                                       │
                                       └────→ RoomView.vue
```

---

## 10. Wave System Summary

| Action | Result |
|--------|--------|
| Attendee waves at **current presenter** | 👋 animation on presenter display + timer |
| Attendee waves at **past presenter** | No animation, saved for connections |
| Wave at someone who waved at you | Mutual wave created, both notified |
| View waves | See mutual, sent, and received lists |

---

## 11. Security Considerations

- Passphrases are the only auth for participants — use sufficiently large word lists (~1000 words each = 1 billion combinations)
- Rate limit submission endpoint to prevent spam
- Rate limit wave endpoint to prevent animation spam
- Validate and sanitize all file uploads
- Sanitize user input to prevent XSS
- Room IDs should be unguessable (3-word combo from large lists)
- Consider adding room passwords for private events (future enhancement)