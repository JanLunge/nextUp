# nextUp

**The real-time presentation queue that turns audience members into connections.**

Demo nights, pitch events, and show-and-tell sessions deserve better than a clipboard signup. nextUp transforms how people queue up, present, and network—all through their phones.

---

## How It Works

```
Host creates room → Attendees scan QR → Submit to present → Wave at people you want to meet
```

1. **Host** opens the presenter display on a laptop/projector
2. **Attendees** scan the QR code and enter their name to join
3. Anyone can **submit a project** to the presentation queue
4. During presentations, attendees **wave** at presenters they want to connect with
5. **Mutual waves** reveal each other's contact info—instant networking

---

## The Wave System

The killer feature. While someone presents, you tap "Wave" to show interest. They see floating 👋 emojis animate across the screen. Later, if they wave back at you—boom, mutual connection. No awkward "hey, can I get your info?" conversations.

- Wave at the current presenter (they see it live on screen)
- Wave at past presenters (saved for when they check their waves)
- Mutual waves are highlighted with a 🤝 badge
- Browse your sent, received, and mutual waves anytime

---

## Four Views, One Room

| View | Who Uses It | Access |
|------|-------------|--------|
| **Presenter Display** | Projected for audience | Host opens room URL |
| **Admin Controller** | Event organizer's phone | Scan admin QR from dropdown |
| **Timer Display** | Speaker's confidence monitor | Scan timer QR from dropdown |
| **Participant App** | Every attendee | Scan room QR code |

### Presenter Display
What the audience sees:
- Large presenter photo, name, and tagline
- Project name, description, and clickable URL
- Media showcase (images or auto-playing videos)
- **The Ask** fades in during the final third—what they need from the room
- Live wave animations floating up the screen
- "Up next" preview and queue count

**Keyboard controls:**
- `SPACE` — Start/stop timer
- `→` — Next presenter
- `←` — Previous presenter

### Admin Controller
Run the event from your phone:
- Navigate between presenters
- Control the timer (start, stop, restart)
- See current presenter, next up, and queue depth
- Everything syncs in real-time

### Timer Display
Put this on a monitor facing the speaker:
- Giant countdown (200pt font)
- Color shifts: green → yellow (20s) → red (10s)
- **Overtime mode** counts up past zero with pulsing red
- Wave animations visible so speakers see audience engagement

### Participant App
The attendee experience:
- See who's presenting now with full project details
- Browse the queue and past presenters
- Wave at anyone you want to connect with
- Submit your own project to present
- Get a "You're up next!" alert with vibration

---

## Submitting to Present

Attendees fill out a quick form:
- Profile photo and name
- Tagline (e.g., "UX Designer & Founder")
- Project name and URL
- Description of what you're presenting
- Upload an image or video (30s max)
- **What you need**—the ask that appears during your final moments

After submitting, you see your queue position and can edit or withdraw anytime.

---

## The Passphrase System

No passwords. When you join, you get a memorable 3-word phrase like `apple-mountain-river`. Save it to:

- Rejoin if you close the browser
- Reuse your profile at future events
- Edit or withdraw your submission
- Keep your wave history

Over a billion possible combinations, easy to remember, works great on mobile.

---

## Real-Time Everything

WebSocket-powered instant updates:
- New submissions appear in the queue immediately
- Timer syncs across all displays
- Wave animations broadcast to presenter and timer screens
- "You're next!" notifications hit your phone the moment before
- Edits and withdrawals reflect everywhere

---

## Quick Start

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

Create `backend/.env`:
```env
PORT=3000
WS_PORT=3001
DATABASE_PATH=./data/queue.db
UPLOAD_PATH=./tmp/uploads
FRONTEND_URL=http://localhost:5173
```

---

## Tech Stack

- **Frontend:** Vue 3, Vite, Tailwind CSS, DaisyUI
- **Backend:** Express, better-sqlite3, ws (WebSocket)
- **Real-time:** WebSocket for all live updates
- **Storage:** SQLite for simplicity, file uploads for media

---

## Use Cases

- **Demo nights** at coworking spaces
- **Startup pitch events** where networking matters
- **Company show-and-tells** for internal projects
- **Hackathon presentations** with time limits
- **Meetup lightning talks** with audience engagement
- **Classroom presentations** with peer feedback signals

---

## Why nextUp?

Most presentation tools focus on slides. nextUp focuses on **people**. The queue isn't just a list—it's a room full of potential connections. The timer isn't just a countdown—it's a shared experience. And the wave system turns passive watching into active networking.

Stop managing clipboards. Start making connections.

---

## License

MIT
