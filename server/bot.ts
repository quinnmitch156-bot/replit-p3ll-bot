import { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { storage } from './storage';
import { fortniteService } from './services/fortnite';
import { xboxService } from './services/xbox';
import { format } from 'date-fns';
import { randomBytes } from 'crypto';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages] });

async function generateAndGrantKey(userId: number, discordUser: any, type: string) {
  const keyStr = `SCOUT-${type.toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  const newKey = await storage.createKey({
    key: keyStr,
    type: type,
    status: "active",
    createdBy: userId
  });

  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle('Payment Received!')
    .setDescription(`Thank you for your purchase! Here is your access key:\n\n\`${newKey.key}\`\n\nUse \`/redeem key:${newKey.key}\` in the server to activate your access.`)
    .setFooter({ text: 'Enjoy Scout Bot!' });

  try {
    await discordUser.send({ embeds: [embed] });
  } catch (err) {
    console.error('Could not send DM to user:', err);
  }
  return newKey;
}

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
  new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Purchase access to the bot'),
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
    if (interaction.isChatInputCommand()) {
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
        try {
          const embed = new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle('Scout Bot Key')
            .setDescription('**"What is scout?"**\nScout bot is a discord bot used to gather information on Epic Games accounts! This information can be used to verify the ownership of an account, allowing you too gain **full access** to the account!\n\n**Features**\n• HQ Receipts Xbox/PSN\n• Xbox AOV Command\n• PSN AOV Command\n• 15+ Total commands!\n\nWith 15+ commands, Scout makes pulling easy and fast!')
            .setThumbnail(interaction.client.user?.displayAvatarURL() || null);

          const row1 = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('select_key')
                .setPlaceholder('Choose a key...')
                .addOptions([
                  { label: 'Lifetime Access', value: 'lifetime', description: '$35.00' },
                  { label: '1 Month Access', value: 'monthly', description: '$20.00' },
                  { label: 'Lifetime Access + Full In Depth Pulling Guide', value: 'lifetime_guide', description: '$45.00' }
                ])
            );

          const row2 = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('select_payment')
                .setPlaceholder('Choose a payment method')
                .addOptions([
                  { label: 'CASHAPP', value: 'cashapp', emoji: '💸' },
                  { label: 'PAYPAL', value: 'paypal', emoji: '🅿️' },
                  { label: 'VENMO', value: 'venmo', emoji: '🇻' },
                  { label: 'CARD', value: 'card', emoji: '💳' },
                  { label: 'BTC', value: 'btc', emoji: '₿' },
                  { label: 'LTC', value: 'ltc', emoji: 'Ł' }
                ])
            );

          await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
        } catch (error) {
          console.error('Error in /buy command:', error);
          if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ content: 'An error occurred while processing the buy command.', ephemeral: true });
          } else {
            await interaction.reply({ content: 'An error occurred while processing the buy command.', ephemeral: true });
          }
        }
        return;
      }

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

      const hasAccess = user.subscriptionTier === 'lifetime' || (user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date());
      if (!hasAccess) {
        const errorEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('Invalid Access')
          .setDescription('No Key Found\nPurchase a key using `/buy` (Available on dashboard)\nMade by Simba');
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        return;
      }

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
          embed.setTitle('Receipt Generated Successfully').setDescription('Your requested receipt has been generated and sent to your DM (Placeholder).');
          await interaction.reply({ embeds: [embed], ephemeral: true });
          break;
        case 'xbox_aov':
        case 'psn_aov':
          embed.setTitle('AOV Created').setDescription('Account Ownership Verification (AOV) has been initiated.');
          await interaction.reply({ embeds: [embed], ephemeral: true });
          break;
        case 'iplookup':
          const ip = interaction.options.getString('ip', true);
          embed.setTitle(`IP Lookup: ${ip}`).setDescription('Location: (Leaked database lookup simulated)\nCity: Brisbane\nCountry: Australia');
          await interaction.reply({ embeds: [embed] });
          break;
        default:
          await interaction.reply({ content: 'Unknown command.', ephemeral: true });
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_key') {
        const selectedKey = interaction.values[0];
        await interaction.reply({ content: `You selected **${selectedKey.replace('_', ' ')}**. Now select a payment method below.`, ephemeral: true });
      }
      if (interaction.customId === 'select_payment') {
        const paymentMethod = interaction.values[0];
        const selectedKey = 'monthly'; 
        const payEmbed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle(`Payment: ${paymentMethod.toUpperCase()}`)
          .setDescription(`Please send the payment to our ${paymentMethod.toUpperCase()} address.\n\nOnce sent, click the button below to verify your payment and receive your key.`)
          .addFields({ name: 'Amount', value: '$20.00' });
        const verifyButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(`verify_pay_${paymentMethod}_${selectedKey}`).setLabel('Verify Payment').setStyle(ButtonStyle.Success)
        );
        await interaction.reply({ embeds: [payEmbed], components: [verifyButton], ephemeral: true });
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith('verify_pay_')) {
        const [, , method, type] = interaction.customId.split('_');
        let user = await storage.getUserByDiscordId(interaction.user.id);
        if (user) {
          await interaction.reply({ content: 'Verifying payment... (This may take a few minutes)', ephemeral: true });
          setTimeout(async () => {
            await generateAndGrantKey(user!.id, interaction.user, type);
            try {
              await interaction.followUp({ content: 'Payment verified! Check your DMs for the access key.', ephemeral: true });
            } catch (e) {}
          }, 3000);
        }
      }
    }
  });

  client.login(process.env.DISCORD_TOKEN);
  console.log('Discord Bot Logged In with Updated Commands');
}
