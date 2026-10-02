# discord-table-bot

Speaker control for a Discord voice/video D&D table (1 DM + up to 6 players).
The bot posts a button panel in the voice channel's chat. Players raise hands;
the DM passes the floor around in initiative order and mutes people with one
click. Muting is done with Discord **server mute**.

Origin: [NOTES.md](NOTES.md) (captured in RawNotes 2026-10-02)

## Setup (one time, ~10 min)

1. Go to <https://discord.com/developers/applications>, then **New Application**
   and name it (e.g. "Table Bot").
2. **General Information**: copy the **Application ID**.
3. **Bot** tab: click **Reset Token**, then copy the token. No privileged intents are needed.
4. Invite the bot to your server by opening this URL (paste your Application ID):
   ```
   https://discord.com/oauth2/authorize?client_id=APPLICATION_ID&scope=bot+applications.commands&permissions=4197376
   ```
   (permissions = View Channels + Send Messages + Mute Members)
5. In Discord: **User Settings → Advanced → Developer Mode** on. Then right-click
   your server icon and choose **Copy Server ID**.
6. Fill in `.env`:
   ```bash
   cd ~/Projects/active/discord-table-bot
   cp .env.example .env
   nvim .env   # DISCORD_TOKEN=..., CLIENT_ID=<Application ID>, GUILD_ID=<Server ID>
   ```
7. Install and register the slash command:
   ```bash
   npm install
   npm run deploy   # prints "Registered /table"
   ```

## Run a session

1. `npm start` (leave it running; it prints `Logged in as ...`).
2. Everyone joins the voice channel. The DM types `/table start` in that
   channel's chat. The panel appears, and everyone already in the channel is seated.
3. Optional: set initiative with `/table order players: @Ana @Ben @Cy`.
4. Use the panel:

   | Button | Who | What it does |
   |---|---|---|
   | ✋ Raise hand / Lower hand | anyone | joins/leaves the hand queue |
   | Switch to turn mode / open table | DM | **Turn mode**: only the floor + DM can talk. **Open**: everyone can talk |
   | ▶ Next / ◀ Prev | DM | passes the floor along the order (wraps around) |
   | 🙋 Take hand (n) | DM | gives the floor to the oldest raised hand. **Next** then returns to whoever's turn it was |
   | 🔊/🔇 Name | DM | flips that player's mute right now. The override clears when the floor moves or the mode changes |

5. When done: `/table end` unmutes everyone in the channel. Run it after a
   bot crash too, because it clears stuck mutes even without a running table.

`/table` only shows up for people with the **Mute Members** permission.

## Tests

```bash
npm test
```

## Known limits (first pass)

- State is in memory: restarting the bot loses the table (run `/table end`, then `/table start`).
- Someone who drops and rejoins goes to the end of the order; re-run `/table order`.
- Server mute sticks across the server. If someone leaves while muted, the bot
  unmutes them the next time they join any other voice channel. Until then, they stay muted.
- The bot can mute people but can't unmute someone who muted themselves.
- Only server voice channels, not DMs/group calls. Up to 10 player buttons.

## License

MIT, see [LICENSE](LICENSE).
