import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { isMuted } from './table.js';

// Discord allows 5 rows of 5 buttons; rows 1-2 are controls, so 10 player buttons max.
const MAX_PLAYER_BUTTONS = 10;

export function renderPanel(table) {
  const mention = (id) => `<@${id}>`;
  const modeLine =
    table.mode === 'open'
      ? '🎲 **Open table**: everyone can talk'
      : '🎲 **Turn mode**: only the speaker and the DM can talk';
  const order = table.order
    .map((id, i) => (i === table.turnIndex ? `**${i + 1}. ${mention(id)} ◀**` : `${i + 1}. ${mention(id)}`))
    .join('  ');

  const content = [
    modeLine,
    `🧙 DM: ${mention(table.dmId)}`,
    `🎤 Floor: ${table.floor ? mention(table.floor) : 'nobody'}`,
    `📜 Order: ${order || 'no players yet'}`,
    `✋ Hands: ${table.hands.map(mention).join(', ') || 'none'}`,
  ].join('\n');

  const everyone = new ActionRowBuilder().addComponents(
    button('tbl:hand', '✋ Raise hand', ButtonStyle.Primary),
    button('tbl:lower', 'Lower hand', ButtonStyle.Secondary),
  );

  const dmControls = new ActionRowBuilder().addComponents(
    button('tbl:prev', '◀ Prev', ButtonStyle.Secondary),
    button('tbl:next', '▶ Next', ButtonStyle.Success),
    button('tbl:take', `🙋 Take hand (${table.hands.length})`, ButtonStyle.Primary).setDisabled(
      table.hands.length === 0,
    ),
    button(
      'tbl:mode',
      table.mode === 'open' ? 'Switch to turn mode' : 'Switch to open table',
      ButtonStyle.Secondary,
    ),
  );

  const playerButtons = table.order.slice(0, MAX_PLAYER_BUTTONS).map((id) => {
    const muted = isMuted(table, id);
    const name = (table.names[id] ?? 'player').slice(0, 70);
    return button(
      `tbl:mute:${id}`,
      `${muted ? '🔇' : '🔊'} ${name}`,
      muted ? ButtonStyle.Danger : ButtonStyle.Secondary,
    );
  });
  const playerRows = [];
  for (let i = 0; i < playerButtons.length; i += 5) {
    playerRows.push(new ActionRowBuilder().addComponents(playerButtons.slice(i, i + 5)));
  }

  return {
    content,
    components: [everyone, dmControls, ...playerRows],
    allowedMentions: { parse: [] }, // show names without pinging anyone
  };
}

function button(customId, label, style) {
  return new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style);
}
