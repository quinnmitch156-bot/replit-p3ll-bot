import { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { storage } from './storage';
import { fortniteService } from './services/fortnite';
import { xboxService } from './services/xbox';
import { format } from 'date-fns';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder()
    .setName('check_xbox')
    .setDescription('(BUGGY) Checks if a Xbox profile is valid and provides the Profile links')
    .addStringOption(option => option.setName('xbox_name').setDescription('The Xbox Gamertag').setRequired(true)),
  new SlashCommandBuilder()
    .setName('iplookup')
    .setDescription('Looks up information about an IP address')
    .addStringOption(option => option.setName('ip').setDescription('The IP address').setRequired(true)),
  new SlashCommandBuilder()
    .setName('psn_aov')
    .setDescription('Creates AOV with the provided information')
    .addStringOption(option => option.setName('email').setDescription('Email address').setRequired(true))
    .addStringOption(option => option.setName('password').setDescription('Password').setRequired(true)),
  new SlashCommandBuilder()
    .setName('psn_ip')
    .setDescription('Get The IP Address of a Playstation Player')
    .addStringOption(option => option.setName('psn_id').setDescription('PSN ID').setRequired(true)),
  new SlashCommandBuilder()
    .setName('psn_stw_receipt')
    .setDescription('Generate a PlayStation receipt for Save The World')
    .addStringOption(option => option.setName('date').setDescription('Date').setRequired(true))
    .addStringOption(option => option.setName('email').setDescription('Email').setRequired(true))
    .addStringOption(option => option.setName('amount').setDescription('Amount').setRequired(true)),
  new SlashCommandBuilder()
    .setName('psn_vbucks_receipt')
    .setDescription('Generate a Vbucks receipt for Playstation! 2800 or 1000')
    .addStringOption(option => option.setName('date').setDescription('Date').setRequired(true))
    .addStringOption(option => option.setName('email').setDescription('Email').setRequired(true))
    .addStringOption(option => option.setName('amount').setDescription('Amount').setRequired(true)),
  new SlashCommandBuilder()
    .setName('xbox_aov')
    .setDescription('Creates AOV with the provided information')
    .addStringOption(option => option.setName('email').setDescription('Email').setRequired(true))
    .addStringOption(option => option.setName('password').setDescription('Password').setRequired(true)),
  new SlashCommandBuilder()
    .setName('xbox_ip')
    .setDescription('Get The IP Address of a Xbox Player')
    .addStringOption(option => option.setName('gamertag').setDescription('Gamertag').setRequired(true)),
  new SlashCommandBuilder()
    .setName('xbox_stw_receipt')
    .setDescription('Generate a Xbox receipt for Save The World')
    .addStringOption(option => option.setName('date').setDescription('Date').setRequired(true))
    .addStringOption(option => option.setName('email').setDescription('Email').setRequired(true))
    .addStringOption(option => option.setName('amount').setDescription('Amount').setRequired(true)),
  new SlashCommandBuilder()
    .setName('xbox_vbucks_receipt')
    .setDescription('Generate a Vbucks Xbox receipt! 2800 or 1000')
    .addStringOption(option => option.setName('date').setDescription('Date').setRequired(true))
    .addStringOption(option => option.setName('email_address').setDescription('Email Address').setRequired(true))
    .addStringOption(option => option.setName('amount').setDescription('Amount').setRequired(true)),
  new SlashCommandBuilder()
    .setName('redeem')
    .setDescription('Redeem a key and gain access to the bot')
    .addStringOption(option => option.setName('key').setDescription('The license key').setRequired(true)),
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

    const hasAccess = user.subscriptionTier === 'lifetime' || (user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date());

    if (interaction.commandName === 'redeem') {
      const keyStr = interaction.options.getString('key', true);
      const key = await storage.getKey(keyStr);

      if (!key || key.status === 'redeemed') {
        await interaction.reply({ content: 'Invalid or already redeemed key.', ephemeral: true });
        return;
      }

      const now = new Date();
      let expiresAt: Date | null = null;
      if (key.type === 'monthly') expiresAt = new Date(now.setMonth(now.getMonth() + 1));
      if (key.type === 'weekly') expiresAt = new Date(now.setDate(now.getDate() + 7));

      await storage.redeemKey(key.id, user.id);
      await storage.updateUserSubscription(user.id, key.type, expiresAt);

      await interaction.reply({ content: `Successfully redeemed **${key.type}** access!`, ephemeral: true });
      return;
    }

    if (!hasAccess) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('Invalid Access')
        .setDescription('No Key Found\nPurchase a key using `/buy` (Available on dashboard)\nMade by Simba');
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      return;
    }

    // Command Logic Placeholder for Receipts and Lookups
    const embed = new EmbedBuilder().setColor(0x22c55e);

    switch (interaction.commandName) {
      case 'check_xbox':
        const gt = interaction.options.getString('xbox_name', true);
        const profile = await xboxService.searchGamertag(gt);
        if (profile) {
          embed.setTitle(`Xbox Profile Found: ${profile.gamertag}`)
               .addFields({ name: 'Gamerscore', value: profile.gamerScore }, { name: 'XID', value: profile.xid });
          await interaction.reply({ embeds: [embed] });
        } else {
          await interaction.reply({ content: 'Xbox profile not found.', ephemeral: true });
        }
        break;

      case 'xbox_ip':
      case 'psn_ip':
        await interaction.reply({ content: 'IP Pulling feature is currently restricted. Contact support for access.', ephemeral: true });
        break;

      case 'xbox_stw_receipt':
      case 'psn_stw_receipt':
      case 'xbox_vbucks_receipt':
      case 'psn_vbucks_receipt':
        embed.setTitle('Receipt Generated Successfully')
             .setDescription('Your requested receipt has been generated and sent to your DM (Placeholder).');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      
      case 'xbox_aov':
      case 'psn_aov':
        embed.setTitle('AOV Created')
             .setDescription('Account Ownership Verification (AOV) has been initiated.');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;

      case 'iplookup':
        const ip = interaction.options.getString('ip', true);
        embed.setTitle(`IP Lookup: ${ip}`)
             .setDescription('Location: (Leaked database lookup simulated)\nCity: Brisbane\nCountry: Australia');
        await interaction.reply({ embeds: [embed] });
        break;

      default:
        await interaction.reply({ content: 'Unknown command.', ephemeral: true });
    }
    
    await storage.createLog({
      userId: user.id,
      command: interaction.commandName,
      details: { options: interaction.options.data }
    });
  });

  client.login(process.env.DISCORD_TOKEN);
  console.log('Discord Bot Logged In with Updated Commands');
}
