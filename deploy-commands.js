// Registers /table in one server. Guild commands show up instantly; re-run after changing them.
import { PermissionFlagsBits, REST, Routes, SlashCommandBuilder } from 'discord.js';

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

const table = new SlashCommandBuilder()
  .setName('table')
  .setDescription('Speaker control for a voice/video game table')
  .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
  .addSubcommand((s) =>
    s.setName('start').setDescription('Start a table in your current voice channel (you become the DM)'),
  )
  .addSubcommand((s) =>
    s
      .setName('order')
      .setDescription('Set the speaking/initiative order')
      .addStringOption((o) =>
        o.setName('players').setDescription('Mention players in order, e.g. @Ana @Ben @Cy').setRequired(true),
      ),
  )
  .addSubcommand((s) => s.setName('end').setDescription('End the table and unmute everyone in your channel'));

await new REST()
  .setToken(DISCORD_TOKEN)
  .put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [table.toJSON()] });
console.log('Registered /table');
