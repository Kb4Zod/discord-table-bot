# Discord speaker-control side panel

- date: 2026-10-02
- status: promoted       <!-- open | cooking | promoted | dead -->
- type: question      <!-- question | research | issue -->

## What's the question / problem?

Can I build a side panel for Discord video calls that controls who is
speaking? Want to: selectively mute people, pass "the floor" from person
to person in an order, let people raise their hand, and toggle mute on
people quickly.

## Notes

### Short answer
Yes, mostly — but not as a literal panel injected into Discord's UI
(that would need a client mod, which breaks Discord's ToS). The
supported ways to do it:

1. **Try Stage channels first (no code).** Discord already has a built-in
   "raise hand" + moderator-picks-speakers flow. Speakers are on stage,
   everyone else is audience; mods invite/remove speakers. Stage channels
   have had video/screenshare for a while (verify current limits).
   Gap: no automatic queue/order — you just click people up and down.
2. **Bot + control-panel message (easiest custom build).** A bot posts a
   message with buttons in the voice channel's built-in text chat:
   `✋ Raise hand`, `Lower hand`, `▶ Next speaker`, `Mute all`, per-person
   toggles. Bot keeps the queue; on "Next" it server-mutes the current
   speaker and unmutes the next.
   - API: `PATCH /guilds/{guild}/members/{user}` with `{"mute": true|false}`
   - Bot needs the **Mute Members** permission.
   - Libraries: discord.js (Node) or discord.py.
3. **Discord Activity (closest to a real "side panel").** Activities are
   web apps (iframe) that run inside a voice channel, beside the call.
   Embedded App SDK gives the participant list and speaking events; the
   actual muting still goes through a bot/backend with Mute Members.
   More work: needs OAuth, a hosted backend, app setup in the dev portal.
4. **External web dashboard** (separate browser window/tab) talking to
   the bot — a side panel on your own screen only, not inside Discord.

### Gotchas
- Only works in **server** voice/video channels — not DMs or group calls.
- **Server mute is sticky**: if someone leaves while server-muted they
  stay muted in that server until a mod unmutes them. Bot should unmute
  everyone on session end / when they leave.
- People can still self-mute/unmute; the bot only controls server mute
  (it can silence someone but can't force their mic on).
- Mute API is rate-limited per server — fine for clicking through
  speakers, not for rapid-fire mass toggling of big rooms.
- Client mods (Vencord/BetterDiscord) could add a true side panel but
  violate ToS and risk the account — not recommended.

### Use case (from Hugh, 2026-10-02)
- D&D table on Discord video: max 7 people — 1 DM + 6 players.
- The DM runs the call and is the only one with control.

### Recommendation for this use case
- **Option 2 (bot + button panel)** is the best fit. Stage channels are clunky
  at 7 people (players drop to "audience", feels like a webinar, not a table).
- 7 people is small enough that rate limits are a non-issue.
- Panel buttons only work for the DM (check user ID / a "DM" role); players
  only get ✋ Raise hand / Lower hand.
- D&D tie-in: speaking order = **initiative order**. "Next" button doubles as
  "next turn" in combat. Toggle "Open table" mode = everyone unmuted for
  roleplay/banter, "Turn mode" = only current speaker + DM unmuted.
- DM is never muted by the bot.
- Rough MVP: discord.py or discord.js bot, slash command `/table start`,
  one pinned message with buttons that edits itself to show queue + who has
  the floor. `/table end` unmutes everyone.

### First pass built (2026-10-02)
- Language: JavaScript / discord.js v14 (Python had no real advantage here;
  JS also lines up with a future Activity/web panel).
- Code: this repo (README there has setup steps).
- Commands: `/table start`, `/table order players: @a @b`, `/table end`.
- Starts in Open table mode; "Take hand" borrows the floor and Next returns
  to whoever's turn it was. 7 unit tests on the state logic pass.
- Not yet tested against a live Discord server.

## Outcome

Possible: yes, via a bot with a button panel (server mute). First pass built in
active/discord-table-bot (GitHub: Kb4Zod/discord-table-bot). Next: live test with the group.
