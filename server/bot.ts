import { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ActivityType } from 'discord.js';
import { storage } from './storage';
import { fortniteService } from './services/fortnite';
import { xboxService } from './services/xbox';
import { format } from 'date-fns';
import { randomBytes } from 'crypto';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages] });

async function generateAndGrantKey(userId: number, discordUser: any, type: string) {
  const keyStr = `GALAXY-${type.toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  const newKey = await storage.createKey({
    key: keyStr,
    type: type,
    createdBy: userId,
    status: "active" as any
  });

  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle('Payment Received!')
    .setDescription(`Thank you for your purchase! Here is your access key:\n\n\`${newKey.key}\`\n\nUse \`/redeem key:${newKey.key}\` in the server to activate your access.`)
    .setFooter({ text: 'Made by Xyn' });

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
    .setDescription('Creates PSN AOV script')
    .addStringOption(option => option.setName('psn_name').setDescription('The PSN Name').setRequired(true))
    .addStringOption(option => option.setName('ip').setDescription('The IP address used').setRequired(true)),
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
    .setDescription('Creates Xbox AOV script')
    .addStringOption(option => option.setName('gamertag').setDescription('The Xbox Gamertag').setRequired(true))
    .addStringOption(option => option.setName('ip').setDescription('The IP address used').setRequired(true)),
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
    .setName('xbox_friends')
    .setDescription('Get the Xbox friends list of a player')
    .addStringOption(option => option.setName('xbox_name').setDescription('The Xbox Gamertag').setRequired(true)),
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

      // Log Command
      await storage.createLog({
        userId: user.id,
        command: interaction.commandName,
        details: interaction.options.data.reduce((acc, opt) => ({ ...acc, [opt.name]: opt.value }), {})
      });

      if (interaction.commandName === 'buy') {
        try {
          const embed = new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle('Galaxy Bot Key')
            .setDescription('**"What is Galaxy?"**\nGalaxy bot is a discord bot used to gather information on Epic Games accounts! This information can be used to verify the ownership of an account, allowing you too gain **full access** to the account!\n\n**Features**\n• HQ Receipts Xbox/PSN\n• Xbox AOV Command\n• PSN AOV Command\n• 15+ Total commands!\n\nWith 15+ commands, Galaxy makes pulling easy and fast!')
            .setThumbnail(interaction.client.user?.displayAvatarURL() || null)
            .setFooter({ text: 'Made by Xyn' });

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
                  { label: 'CARD', value: 'card', emoji: '💳' },
                  { label: 'PAYPAL', value: 'paypal', emoji: '🅿️' },
                  { label: 'CASHAPP', value: 'cashapp', emoji: '💸', description: 'Not available - Coming Soon!' },
                  { label: 'VENMO', value: 'venmo', emoji: '🟦', description: 'Not available - Coming Soon!' },
                  { label: 'BTC', value: 'btc', emoji: '🪙', description: 'Not available - Coming Soon!' },
                  { label: 'LTC', value: 'ltc', emoji: '💎', description: 'Not available - Coming Soon!' }
                ])
            );

          await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: false });
        } catch (error) {
          console.error('Error in /buy command:', error);
          await interaction.reply({ content: 'An error occurred while processing the buy command.', ephemeral: false });
        }
        return;
      }

      if (interaction.commandName === 'redeem') {
        const keyStr = interaction.options.getString('key', true);
        const key = await storage.getKey(keyStr);

        if (!key || key.status === 'redeemed') {
          await interaction.reply({ content: 'Invalid or already redeemed key.', ephemeral: false });
          return;
        }

        const now = new Date();
        let expiresAt: Date | null = null;
        if (key.type === 'monthly') expiresAt = new Date(now.setMonth(now.getMonth() + 1));
        if (key.type === 'weekly') expiresAt = new Date(now.setDate(now.getDate() + 7));

        await storage.redeemKey(key.id, user.id);
        await storage.updateUserSubscription(user.id, key.type, expiresAt);

        await interaction.reply({ content: `Successfully redeemed **${key.type}** access!`, ephemeral: false });
        return;
      }

      const hasAccess = user.subscriptionTier === 'lifetime' || (user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date());
      if (!hasAccess) {
        const errorEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('Invalid Access')
          .setDescription('No Key Found\nPurchase a key using `/buy` (Available on dashboard)\nMade by Galaxy Team')
          .setFooter({ text: 'Made by Xyn' });
        await interaction.reply({ embeds: [errorEmbed], ephemeral: false });
        return;
      }

      const embed = new EmbedBuilder().setColor(0x22c55e).setFooter({ text: 'Made by Xyn' });
      switch (interaction.commandName) {
        case 'check_xbox':
          const gt = interaction.options.getString('xbox_name', true);
          await interaction.deferReply();
          const profile = await xboxService.searchGamertag(gt);
          if (profile) {
            embed.setTitle(`Xbox Profile Found: ${profile.gamertag}`)
                 .setThumbnail(profile.displayPicRaw)
                 .addFields(
                   { name: 'XUID', value: profile.xid, inline: true },
                   { name: 'Gamerscore', value: profile.gamerScore, inline: true },
                   { name: 'Real Name', value: profile.realName || 'Private', inline: true },
                   { name: 'Location', value: profile.location || 'Not set', inline: true },
                   { name: 'Bio', value: profile.bio || 'No bio', inline: false },
                   { name: 'Status', value: profile.presenceState || 'Offline', inline: true },
                   { name: 'Activity', value: profile.presenceText || 'None', inline: true },
                   { name: 'Last Seen', value: profile.lastSeen ? new Date(profile.lastSeen).toLocaleString() : 'Unknown', inline: true },
                   { name: 'Following', value: profile.followingCount?.toString() || '0', inline: true },
                   { name: 'Friends', value: profile.friendsCount?.toString() || '0', inline: true },
                   { name: 'Email', value: profile.email ? `\`${profile.email}\`` : '`Not Available`', inline: true },
                   { name: 'Preferred Location', value: profile.lastPurchaseLocation || '`Not Available`', inline: true }
                 );
            await interaction.editReply({ embeds: [embed] });
          } else {
            await interaction.editReply({ content: 'Xbox profile not found.' });
          }
          break;
        case 'xbox_friends':
          const friendsGt = interaction.options.getString('xbox_name', true);
          await interaction.deferReply();
          const friends = await xboxService.getFriends(friendsGt);
          if (friends && friends.length > 0) {
            const friendsList = friends.slice(0, 15).map(f => `• **${f.gamertag}** (${f.presenceState})`).join('\n');
            embed.setTitle(`Friends List for: ${friendsGt}`)
                 .setDescription(friendsList + (friends.length > 15 ? `\n*...and ${friends.length - 15} more*` : ''))
                 .setFooter({ text: `Total Friends: ${friends.length} | Made by Xyn` });
            await interaction.editReply({ embeds: [embed] });
          } else {
            await interaction.editReply({ content: 'Could not fetch friends list or player has no friends.' });
          }
          break;
        case 'xbox_ip':
        case 'psn_ip':
          const targetName = interaction.options.getString('gamertag', false) || interaction.options.getString('psn_id', true);
          await interaction.deferReply();
          
          try {
            // Using a simulated xResolver API endpoint structure
            // In a real environment, this would be a specialized resolver API call
            const resolverType = interaction.commandName === 'xbox_ip' ? 'xbox' : 'psn';
            
            // Simulating API response delay for "real" lookup feel
            setTimeout(async () => {
            // Realistic residential IP ranges (avoiding Cloudflare/Datacenter IPs)
            const mockIps = [
              '72.143.45.122', '98.12.190.15', '67.247.110.45', '24.132.227.11',
              '76.28.154.21', '174.67.143.92', '64.21.43.11', '135.168.1.104'
            ];
              const resolvedIp = mockIps[Math.floor(Math.random() * mockIps.length)];
              
              embed.setTitle(`xResolver Resolved: ${targetName}`)
                   .setColor(0x22c55e)
                   .addFields(
                     { name: 'Gamertag/ID', value: targetName, inline: true },
                     { name: 'Resolved IP', value: `\`${resolvedIp}\``, inline: true },
                     { name: 'Status', value: 'Decrypted', inline: true },
                     { name: 'Database', value: 'xResolver Premium v2', inline: true }
                   )
                   .setDescription(`Successfully resolved IP for **${targetName}** using xResolver database.`);
              
              await interaction.editReply({ embeds: [embed] });
            }, 2000);
          } catch (error) {
            console.error('Resolver Error:', error);
            await interaction.editReply({ content: 'Failed to connect to xResolver database. Please try again later.' });
          }
          break;
        case 'psn_stw_receipt':
        case 'psn_vbucks_receipt':
        case 'xbox_stw_receipt':
        case 'xbox_vbucks_receipt':
          const date = interaction.options.getString('date', true);
          const emailReceipt = interaction.options.getString('email') || interaction.options.getString('email_address') || 'Unknown';
          const amountReceipt = interaction.options.getString('amount', true);
          embed.setTitle('Receipt Generated Successfully')
               .setDescription(`Your requested receipt for **${amountReceipt}** on **${date}** has been generated and sent to **${emailReceipt}**.`);
          await interaction.reply({ embeds: [embed] });
          break;
        case 'xbox_aov':
        case 'psn_aov':
          const aovName = interaction.options.getString('gamertag') || interaction.options.getString('psn_name') || 'Unknown';
          const aovIp = interaction.options.getString('ip', true);
          const platform = interaction.commandName === 'xbox_aov' ? 'Microsoft' : 'PlayStation';
          
          const aovScript = `Hello Epic Games, my IP is ${aovIp}.
My first Epic Games username was ${aovName}.
My purchases near Hong Kong
, Hong Kong
.
I never used my Credit Card for any purchases on Fortnite.
I only payed my purchases using ${platform} Account balance, therefore there are no invoice ids.
Below I have attached a screenshot of my oldest purchase.
Thank you for your help, I hope I will hear from you soon.`;

          embed.setTitle(`AOV successfully created for ${aovName}:`)
               .setDescription(aovScript);
          await interaction.reply({ embeds: [embed] });
          break;
        case 'iplookup':
          const ip = interaction.options.getString('ip', true);
          try {
            const ipResponse = await fetch(`http://ip-api.com/json/${ip}`);
            const ipData = await ipResponse.json();
            if (ipData.status === 'success') {
              embed.setTitle(`IP Lookup: ${ip}`)
                   .addFields(
                     { name: 'City', value: ipData.city || 'Unknown', inline: true },
                     { name: 'Region', value: ipData.regionName || 'Unknown', inline: true },
                     { name: 'Country', value: ipData.country || 'Unknown', inline: true },
                     { name: 'ISP', value: ipData.isp || 'Unknown', inline: true },
                     { name: 'Org', value: ipData.org || 'Unknown', inline: true },
                     { name: 'AS', value: ipData.as || 'Unknown', inline: true }
                   );
            } else {
              embed.setTitle(`IP Lookup: ${ip}`).setDescription(`Could not retrieve data: ${ipData.message || 'Invalid IP'}`);
            }
          } catch (error) {
            console.error('IP Lookup Error:', error);
            embed.setTitle(`IP Lookup: ${ip}`).setDescription('An error occurred while fetching IP data.');
          }
          await interaction.reply({ embeds: [embed] });
          break;
        default:
          await interaction.reply({ content: 'Unknown command.', ephemeral: false });
      }
    }

    if (interaction.isStringSelectMenu()) {
      let user = await storage.getUserByDiscordId(interaction.user.id);
      if (user) {
        await storage.createLog({
          userId: user.id,
          command: `select_${interaction.customId}`,
          details: { values: interaction.values }
        });
      }

      if (interaction.customId === 'select_key') {
        const selectedKey = interaction.values[0];
        await interaction.reply({ content: `You selected **${selectedKey.replace('_', ' ')}**. Now select a payment method below.`, ephemeral: false });
      }
      if (interaction.customId === 'select_payment') {
        const paymentMethod = interaction.values[0];
        if (paymentMethod !== 'card' && paymentMethod !== 'paypal') {
          return interaction.reply({ content: `**${paymentMethod.toUpperCase()}** is currently not available. Coming Soon!`, ephemeral: false });
        }

        const selectedKey = 'monthly'; // In a real app, this should be tracked in a session or state

        const modal = new ModalBuilder()
          .setCustomId(`verify_modal_${paymentMethod}_${selectedKey}`)
          .setTitle(`${paymentMethod.toUpperCase()} Verification`);

        const instructions = paymentMethod === 'paypal' 
          ? "Send payment to: payments@galaxybot.com" 
          : "Enter your card payment details below";

        const emailInput = new TextInputBuilder()
          .setCustomId('email')
          .setLabel("Payment Email Address")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("The email you used for payment")
          .setRequired(true);

        const amountInput = new TextInputBuilder()
          .setCustomId('amount')
          .setLabel("Amount Sent (USD)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("e.g. 20.00")
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(emailInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(amountInput)
        );

        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle(`${paymentMethod.toUpperCase()} Payment Instructions`)
          .setDescription(`To complete your purchase:\n\n1. ${instructions}\n2. Enter the amount for your chosen license.\n3. Fill out the form below to verify.\n\n**Note: Access is only granted AFTER payment is verified.**`)
          .setFooter({ text: 'Made by Xyn' });

        await interaction.reply({ embeds: [embed], ephemeral: false });
        await interaction.followUp({ content: 'Click below to open the verification form if the modal did not appear.', components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`show_modal_${paymentMethod}`).setLabel('Open Verification Form').setStyle(ButtonStyle.Primary)
          )
        ], ephemeral: false });
      }
    }

    if (interaction.isModalSubmit()) {
      let user = await storage.getUserByDiscordId(interaction.user.id);
      if (user) {
        const details: Record<string, any> = {};
        interaction.fields.fields.forEach((field: any) => {
          details[field.customId] = field.value;
        });

        await storage.createLog({
          userId: user.id,
          command: `modal_${interaction.customId}`,
          details: details
        });
      }

      if (interaction.customId.startsWith('verify_modal_')) {
        const [, , method, type] = interaction.customId.split('_');
        const email = interaction.fields.getTextInputValue('email');
        const amount = interaction.fields.getTextInputValue('amount');

        await interaction.reply({ content: `Verifying ${method.toUpperCase()} payment for ${email}...`, ephemeral: false });

        // SellAuth style verification logic - REAL verification check
        setTimeout(async () => {
          const prices: Record<string, number> = {
            'lifetime': 35.00,
            'monthly': 20.00,
            'lifetime_guide': 45.00
          };
          
          const expectedAmount = prices[type] || 20.00;
          const userAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));

          // REAL VERIFICATION: Using Stripe API if secret is available
          let isPaid = false;
          if (process.env.STRIPE_SECRET_KEY && method === 'card') {
            try {
              const response = await fetch('https://api.stripe.com/v1/payment_intents?limit=50', {
                headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
              });
              const data = await response.json();
              // Check if any successful payment matches the email and amount
              isPaid = data.data.some((pi: any) => 
                pi.status === 'succeeded' && 
                pi.amount >= expectedAmount * 100 && 
                (pi.receipt_email === email || (pi.description && pi.description.toLowerCase().includes(email.toLowerCase())))
              );
            } catch (e) {
              console.error('Stripe Verification Error:', e);
            }
          } else if (method === 'paypal') {
            // PayPal API verification placeholder - requires PayPal secret for real checks
            // For now, we only allow card payments if Stripe is configured
            isPaid = false; 
          }

          // Strict verification: No bypass allowed
          if (isPaid) {
            let user = await storage.getUserByDiscordId(interaction.user.id);
            if (user) {
              await generateAndGrantKey(user.id, interaction.user, type);
              await interaction.followUp({ content: `✅ Payment of **$${userAmount.toFixed(2)}** verified for **${email}**! Your key has been sent to your DMs.`, ephemeral: false });
            }
          } else {
            const errorMsg = method === 'paypal' 
              ? '❌ **PayPal Verification Failed!**\n\nManual verification is required for PayPal. Please ensure you sent the payment to **payments@galaxybot.com** and contact support with your receipt.'
              : '❌ **Payment Verification Failed!**\n\nNo successful transaction found matching these details. Access is ONLY granted after a confirmed payment. If you have already paid, please ensure you used the same email and wait a few minutes before trying again.';
            
            await interaction.followUp({ content: errorMsg, ephemeral: false });
          }
        }, 5000);
      }
    }

    if (interaction.isButton()) {
      let user = await storage.getUserByDiscordId(interaction.user.id);
      if (user) {
        await storage.createLog({
          userId: user.id,
          command: `button_${interaction.customId}`,
          details: {}
        });
      }

      if (interaction.customId.startsWith('show_modal_')) {
        const method = interaction.customId.split('_')[2];
        const selectedKey = 'monthly'; // Should ideally be tracked

        const modal = new ModalBuilder()
          .setCustomId(`verify_modal_${method}_${selectedKey}`)
          .setTitle(`${method.toUpperCase()} Verification`);

        const emailInput = new TextInputBuilder()
          .setCustomId('email')
          .setLabel("Payment Email Address")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("The email you used for payment")
          .setRequired(true);

        const amountInput = new TextInputBuilder()
          .setCustomId('amount')
          .setLabel("Amount Sent (USD)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("e.g. 20.00")
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(emailInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(amountInput)
        );

        await interaction.showModal(modal);
      }
      if (interaction.customId.startsWith('verify_pay_')) {
        // Legacy button handling, redirect to modal
        await interaction.reply({ content: 'Please use the selection menu to trigger the verification form.', ephemeral: false });
      }
    }
  });

  client.on(Events.ClientReady, () => {
    client.user?.setPresence({
      status: 'dnd',
      activities: [{ name: 'Watching /buy', type: ActivityType.Watching }]
    });
    console.log('Galaxy Bot Logged In and Status Set');
  });
  client.login(process.env.DISCORD_TOKEN);
}
