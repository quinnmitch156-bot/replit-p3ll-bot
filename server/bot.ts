import { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { storage } from './storage';
import { fortniteService } from './services/fortnite';
import { xboxService } from './services/xbox';
import { format } from 'date-fns';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder()
    .setName('lookup')
    .setDescription('Lookup a player')
    .addStringOption(option => 
      option.setName('platform')
        .setDescription('Platform (epic/xbox)')
        .setRequired(true)
        .addChoices(
          { name: 'Epic Games', value: 'epic' },
          { name: 'Xbox', value: 'xbox' }
        ))
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Username/Gamertag')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Purchase access to the bot'),
  new SlashCommandBuilder()
    .setName('redeem')
    .setDescription('Redeem an access key')
    .addStringOption(option =>
      option.setName('key')
        .setDescription('The license key')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('info')
    .setDescription('Check your subscription status'),
];

export async function startBot() {
  if (!process.env.DISCORD_TOKEN || !process.env.DISCORD_CLIENT_ID) {
    console.log('Discord credentials missing, skipping bot startup');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands },
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }

  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // Ensure user exists in DB
    let user = await storage.getUserByDiscordId(interaction.user.id);
    if (!user) {
      user = await storage.createUser({
        discordId: interaction.user.id,
        username: interaction.user.username,
        role: 'user',
        subscriptionTier: null,
        subscriptionExpiresAt: null
      });
    }

    if (interaction.commandName === 'buy') {
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('Purchase Access')
        .setDescription('Choose a plan to get access to Scout Bot:')
        .addFields(
          { name: 'Lifetime Access', value: '$35.00', inline: true },
          { name: 'Monthly Access', value: '$20.00', inline: true },
          { name: 'Weekly Access', value: '$10.00', inline: true },
        )
        .setFooter({ text: 'Visit our dashboard to purchase' });
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.commandName === 'redeem') {
      const keyStr = interaction.options.getString('key', true);
      const key = await storage.getKey(keyStr);

      if (!key || key.status === 'redeemed') {
        await interaction.reply({ content: 'Invalid or already redeemed key.', ephemeral: true });
        return;
      }

      // Calculate expiry
      const now = new Date();
      let expiresAt: Date | null = null;
      if (key.type === 'monthly') expiresAt = new Date(now.setMonth(now.getMonth() + 1));
      if (key.type === 'weekly') expiresAt = new Date(now.setDate(now.getDate() + 7));
      // lifetime is null

      await storage.redeemKey(key.id, user.id);
      await storage.updateUserSubscription(user.id, key.type, expiresAt);

      await interaction.reply({ content: `Successfully redeemed **${key.type}** access!`, ephemeral: true });
    }

    if (interaction.commandName === 'info') {
      const status = user.subscriptionTier ? user.subscriptionTier.toUpperCase() : 'NONE';
      const expiry = user.subscriptionExpiresAt ? format(user.subscriptionExpiresAt, 'yyyy-MM-dd') : 'Never';
      
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('User Info')
        .addFields(
          { name: 'Username', value: user.username || 'Unknown' },
          { name: 'Subscription', value: status },
          { name: 'Expires', value: expiry }
        );
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.commandName === 'lookup') {
      // Check Access
      const hasAccess = user.subscriptionTier === 'lifetime' || (user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date());
      
      if (!hasAccess) {
        const errorEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('Invalid Access')
          .setDescription('No Key Found\nPurchase a key using `/buy`\nMade by Simba');
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        return;
      }

      await interaction.deferReply();
      const platform = interaction.options.getString('platform', true);
      const username = interaction.options.getString('username', true);

      try {
        if (platform === 'epic') {
          const accountId = await fortniteService.lookup(username);
          if (!accountId) {
            await interaction.editReply('Player not found.');
            return;
          }
          const stats = await fortniteService.getStats(accountId);
          if (!stats) {
            await interaction.editReply('Could not fetch stats.');
            return;
          }

          const embed = new EmbedBuilder()
            .setColor(0x9400D3)
            .setTitle(`Fortnite Stats: ${stats.account.name}`)
            .addFields(
              { name: 'Wins', value: stats.global.all.wins.toString(), inline: true },
              { name: 'K/D', value: stats.global.all.kd.toString(), inline: true },
              { name: 'Win Rate', value: `${stats.global.all.winrate}%`, inline: true },
              { name: 'Matches', value: stats.global.all.matchesplayed.toString(), inline: true },
              { name: 'Battle Pass', value: `Level ${stats.global.battle_pass.level}`, inline: true }
            )
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
        } else if (platform === 'xbox') {
          const profile = await xboxService.searchGamertag(username);
          if (!profile) {
            await interaction.editReply('Gamertag not found.');
            return;
          }

          const embed = new EmbedBuilder()
            .setColor(0x107C10)
            .setTitle(`Xbox Profile: ${profile.gamertag}`)
            .setThumbnail(profile.displayPicRaw)
            .addFields(
              { name: 'Gamerscore', value: profile.gamerScore },
              { name: 'XID', value: profile.xid }
            );
          
          await interaction.editReply({ embeds: [embed] });
        }
        
        // Log the lookup
        await storage.createLog({
          userId: user.id,
          command: 'lookup',
          details: { platform, username }
        });

      } catch (err) {
        console.error(err);
        await interaction.editReply('An error occurred while processing your request.');
      }
    }
  });

  client.login(process.env.DISCORD_TOKEN);
  console.log('Discord Bot Logged In');
}
