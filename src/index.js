import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import * as T from './table.js';
import { renderPanel } from './panel.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const tables = new Map(); // voice channel id -> table
// Server mutes stick after someone leaves, so remember who we muted and undo it
// the next time they show up in voice anywhere else.
const mutedByBot = new Set();

client.once(Events.ClientReady, (c) => console.log(`Logged in as ${c.user.tag}`));

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'table') {
      await onTableCommand(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith('tbl:')) {
      await onButton(interaction);
    }
  } catch (err) {
    console.error(err);
    const reply = { content: 'Something went wrong. Check the bot logs.', flags: MessageFlags.Ephemeral };
    const send = interaction.replied || interaction.deferred ? interaction.followUp(reply) : interaction.reply(reply);
    await send.catch(() => {});
  }
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  if (oldState.channelId === newState.channelId) return; // mute/video/stream changes, not a move
  const { guild, id } = newState;

  const left = tables.get(oldState.channelId);
  if (left) {
    T.removePlayer(left, id);
    await refreshPanel(guild, left);
  }

  const joined = tables.get(newState.channelId);
  if (joined) {
    if (!newState.member?.user.bot) T.addPlayer(joined, id, newState.member?.displayName ?? 'player');
    await applyMutes(guild, joined);
    await refreshPanel(guild, joined);
  } else if (newState.channelId && mutedByBot.has(id)) {
    await setMute(guild, id, false, newState.serverMute);
  }
});

async function onTableCommand(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const sub = interaction.options.getSubcommand();
  const { guild, user } = interaction;
  const voice = interaction.member.voice.channel;
  if (!voice) return interaction.editReply('Join the voice channel first, then run this.');
  const table = tables.get(voice.id);

  if (sub === 'start') {
    if (table) return interaction.editReply('A table is already running here. Use `/table end` first.');
    const fresh = T.createTable({ dmId: user.id, channelId: voice.id });
    await seatPlayers(guild, fresh);
    const message = await voice.send(renderPanel(fresh));
    fresh.panelMessageId = message.id;
    tables.set(voice.id, fresh);
    await applyMutes(guild, fresh);
    return interaction.editReply(`Table started. The panel is in ${voice}'s chat, and you're the DM.`);
  }

  if (sub === 'order') {
    if (!table) return interaction.editReply('No table running here. Use `/table start`.');
    if (table.dmId !== user.id) return interaction.editReply('Only the DM can set the order.');
    const ids = [...interaction.options.getString('players').matchAll(/<@!?(\d+)>/g)].map((m) => m[1]);
    T.setOrder(table, ids);
    await refreshPanel(guild, table);
    await applyMutes(guild, table);
    return interaction.editReply('Order set. Press ▶ Next to give the first player the floor.');
  }

  if (sub === 'end') {
    // Works even with no table (e.g. after a bot restart) to clear stuck mutes.
    tables.delete(voice.id);
    for (const vs of guild.voiceStates.cache.values()) {
      if (vs.channelId === voice.id && vs.serverMute) await setMute(guild, vs.id, false, true);
    }
    if (table?.panelMessageId) {
      await voice.messages
        .edit(table.panelMessageId, { content: '🎲 Table closed. Everyone is unmuted.', components: [] })
        .catch(() => {});
    }
    return interaction.editReply('Table ended. Everyone in the channel is unmuted.');
  }
}

async function onButton(interaction) {
  const table = tables.get(interaction.channelId);
  if (!table) {
    return interaction.reply({ content: 'No table is running here.', flags: MessageFlags.Ephemeral });
  }
  const [, action, targetId] = interaction.customId.split(':');
  const userId = interaction.user.id;

  if (action === 'hand') T.raiseHand(table, userId);
  else if (action === 'lower') T.lowerHand(table, userId);
  else if (userId !== table.dmId) {
    return interaction.reply({ content: 'Only the DM can use that.', flags: MessageFlags.Ephemeral });
  } else if (action === 'next') T.next(table);
  else if (action === 'prev') T.prev(table);
  else if (action === 'take') T.takeHand(table);
  else if (action === 'mode') T.toggleMode(table);
  else if (action === 'mute') T.toggleMute(table, targetId);

  await interaction.update(renderPanel(table)); // ack first; Discord wants a reply within 3s
  await applyMutes(interaction.guild, table);
}

async function seatPlayers(guild, table) {
  for (const vs of guild.voiceStates.cache.values()) {
    if (vs.channelId !== table.channelId) continue;
    const member = vs.member ?? (await guild.members.fetch(vs.id));
    if (!member.user.bot) T.addPlayer(table, member.id, member.displayName);
  }
}

async function applyMutes(guild, table) {
  for (const vs of guild.voiceStates.cache.values()) {
    if (vs.channelId !== table.channelId || vs.member?.user.bot) continue;
    await setMute(guild, vs.id, T.isMuted(table, vs.id), vs.serverMute);
  }
}

async function setMute(guild, userId, mute, current) {
  if (current === mute) return;
  try {
    await guild.members.edit(userId, { mute, reason: 'Table speaker control' });
    if (mute) mutedByBot.add(userId);
    else mutedByBot.delete(userId);
  } catch (err) {
    console.warn(`Could not ${mute ? 'mute' : 'unmute'} ${userId}: ${err.message}`);
  }
}

async function refreshPanel(guild, table) {
  const channel = guild.channels.cache.get(table.channelId);
  if (!channel || !table.panelMessageId) return;
  await channel.messages.edit(table.panelMessageId, renderPanel(table)).catch((err) => {
    console.warn(`Could not update panel: ${err.message}`);
  });
}

client.login(process.env.DISCORD_TOKEN);
