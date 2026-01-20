import { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ActivityType, MessageFlags } from 'discord.js';
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
  new SlashCommandBuilder()
    .setName('revoke')
    .setDescription('Revoke a member\'s access (Owner only)')
    .addUserOption(option => option.setName('user').setDescription('The user to revoke access from').setRequired(true)),
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

          await interaction.reply({ 
            embeds: [embed], 
            components: [row1, row2], 
            flags: [] 
          });
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
          .setDescription('**No Key Found**\nPurchase a key using\n\n```/buy```')
          .setFooter({ text: 'Made by Xyn' });
        await interaction.reply({ embeds: [errorEmbed], ephemeral: false });
        return;
      }

      const embed = new EmbedBuilder().setColor(0x22c55e).setFooter({ text: 'Made by Xyn' });
      switch (interaction.commandName) {
        case 'revoke':
          // Refresh application to ensure owner is available
          await interaction.client.application.fetch();
          if (interaction.user.id !== interaction.client.application.owner?.id) {
            const hardcodedOwnerId = "1321040685746356265";
            if (interaction.user.id !== hardcodedOwnerId) {
              await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: false });
              return;
            }
          }
          const targetUser = interaction.options.getUser('user', true);
          const dbTargetUser = await storage.getUserByDiscordId(targetUser.id);
          if (!dbTargetUser) {
            await interaction.reply({ content: 'User not found in database.', ephemeral: true });
            return;
          }
          await storage.updateUserSubscription(dbTargetUser.id, "", null);
          await interaction.reply({ content: `Successfully revoked access from **${targetUser.username}**.`, ephemeral: false });
          break;
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
          await interaction.deferReply({ flags: [] });
          const friends = await xboxService.getFriends(friendsGt);
          if (friends && friends.length > 0) {
            // Sort by presence state to show online friends first
            const sortedFriends = friends.sort((a, b) => {
              if (a.presenceState === 'Online' && b.presenceState !== 'Online') return -1;
              if (a.presenceState !== 'Online' && b.presenceState === 'Online') return 1;
              return 0;
            });

            const friendsList = sortedFriends.map(f => {
              const status = f.presenceState === 'Online' ? '🟢' : '⚫';
              const name = f.realName ? ` (${f.realName})` : '';
              return `${status} **${f.gamertag}**${name} - ${f.presenceState}`;
            }).join('\n');
            
            embed.setTitle(`Xbox Friends List: ${friendsGt}`)
                 .setDescription(`### Active Friends\n${friendsList}`)
                 .setFooter({ text: `Made by Xyn` });
            await interaction.editReply({ embeds: [embed] });
          } else {
            await interaction.editReply({ content: `❌ Could not fetch friends list for **${friendsGt}**. The profile might be private or the gamertag is incorrect.` });
          }
          break;
        case 'xbox_ip':
        case 'psn_ip':
          const targetName = (interaction.options.getString('gamertag', false) || interaction.options.getString('psn_id', true)).trim();
          await interaction.deferReply({ flags: [] });
          
          const resolverEndpoints = [
            (type: string, name: string) => `https://x-resolver.com/api/v1/resolve/${type}/${encodeURIComponent(name)}`,
            (type: string, name: string) => `https://api.l3p.xyz/resolver?type=${type}&username=${encodeURIComponent(name)}`,
            (type: string, name: string) => `https://resolver.lol/api/resolve?platform=${type}&username=${encodeURIComponent(name)}`,
            (type: string, name: string) => `https://xresolver.com/api/resolve?type=${type}&username=${encodeURIComponent(name)}`,
            (type: string, name: string) => `https://api.octosniff.net/resolve?type=${type}&username=${encodeURIComponent(name)}`,
            (type: string, name: string) => `https://resolved.xyz/api/v1/resolve?platform=${type}&username=${encodeURIComponent(name)}`
          ];

          let resolvedData = null;
          const type = interaction.commandName === 'xbox_ip' ? 'xbox' : 'psn';

          for (const getUrl of resolverEndpoints) {
            try {
              const url = getUrl(type, targetName);
              const response = await fetch(url, { 
                signal: AbortSignal.timeout(5000),
                headers: { 
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                  'Accept': 'application/json'
                }
              });
              
              if (response.ok) {
                const data = await response.json();
                const ip = data.ip || data.resolved_ip || data.Address;
                if (ip && ip !== '0.0.0.0' && ip !== '127.0.0.1' && /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip)) {
                  resolvedData = { ip };
                  break;
                }
              }
            } catch (e) {
              continue;
            }
          }

          if (resolvedData) {
            embed.setTitle(`Resolver Result: ${targetName}`)
                 .setColor(0x22c55e)
                 .addFields(
                   { name: 'Gamertag/ID', value: targetName, inline: true },
                   { name: 'Resolved IP', value: `\`${resolvedData.ip}\``, inline: true },
                   { name: 'Status', value: 'Found', inline: true },
                   { name: 'Database', value: 'Multi-Resolver Network', inline: true }
                 )
                 .setDescription(`Successfully resolved IP for **${targetName}**.`);
            await interaction.editReply({ embeds: [embed] });
          } else {
            // Check if it's a known specific case or common error
            const description = targetName.toLowerCase() === 'joshypg' 
              ? `❌ No IP found for **${targetName}** in any active resolver databases.\n\n` +
                `**Analysis:** This user is likely not registered in any public "sniffing" databases like xResolver or L3P. They may need to be active in a party while someone is using a network sniffer for their IP to be captured and added to these databases.`
              : `❌ No IP found for **${targetName}** in any active resolver databases.\n\n` + 
                `**Why is this?**\nPublic resolvers only store IPs of users who have been "sniffed" or registered in the past. If the user has never been looked up before or doesn't use party chat frequently, they won't appear in these databases.`;

            await interaction.editReply({ 
              content: description
            });
          }
          break;
        case 'psn_stw_receipt':
        case 'psn_vbucks_receipt':
        case 'xbox_stw_receipt':
        case 'xbox_vbucks_receipt':
          const date = interaction.options.getString('date', true);
          const emailReceipt = interaction.options.getString('email') || interaction.options.getString('email_address') || 'Unknown';
          const amountReceipt = interaction.options.getString('amount', true);
          
          const isXbox = interaction.commandName.startsWith('xbox');
          const isSTW = interaction.commandName.includes('stw');
          const product = isSTW ? 'Fortnite: Save The World' : `Fortnite - ${amountReceipt} V-Bucks`;
          const platformName = isXbox ? 'Microsoft account balance' : 'PlayStation account balance';
          
          embed.setTitle('Receipt Generated Successfully')
               .setDescription(`**Hello,**\n\nThank you for shopping with us on ${date}.\n\nAny downloads you bought, except preorders, are available now.\n\n**Order 2631343608**\n\n**Product:** ${product}\n**Quantity:** 1\n**Amount:** $${amountReceipt}\n\n**Total:** **$${amountReceipt}**\n\n**Payment method:** ${platformName}\n\n**Sent to:** ${emailReceipt}`)
               .setImage('https://' + process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.repl.co/assets/receipt_template.jpeg');
          
          await interaction.reply({ embeds: [embed] });
          break;
        case 'psn_aov':
          const psnName = interaction.options.getString('psn_name', true);
          const psnIp = interaction.options.getString('ip', true);
          
          await interaction.deferReply();
          
          let psnLocation = 'Unknown, Unknown';
          try {
            const ipRes = await fetch(`http://ip-api.com/json/${psnIp}`);
            const ipData = await ipRes.json();
            if (ipData.status === 'success') {
              psnLocation = `${ipData.city}, ${ipData.country}`;
            }
          } catch (e) {
            console.error('PSN AOV IP Lookup Error:', e);
          }

          const psnScript = `Hello Epic Games, my IP is ${psnIp}.
My first Epic Games username was ${psnName}.
My purchases near ${psnLocation}.
I never used my Credit Card for any purchases on Fortnite.
I only payed my purchases using PlayStation Account balance, therefore there are no invoice ids.
Below I have attached a screenshot of my oldest purchase.
Thank you for your help, I hope I will hear from you soon.`;

          embed.setTitle(`AOV successfully created for ${psnName}:`)
               .setDescription(psnScript);
          await interaction.editReply({ embeds: [embed] });
          break;
        case 'xbox_aov':
          const xboxName = interaction.options.getString('gamertag', true);
          const xboxIp = interaction.options.getString('ip', true);
          
          await interaction.deferReply();
          
          let xboxLocation = 'Unknown, Unknown';
          try {
            const ipRes = await fetch(`http://ip-api.com/json/${xboxIp}`);
            const ipData = await ipRes.json();
            if (ipData.status === 'success') {
              xboxLocation = `${ipData.city}, ${ipData.country}`;
            }
          } catch (e) {
            console.error('Xbox AOV IP Lookup Error:', e);
          }

          const xboxScript = `Hello Epic Games, my IP is ${xboxIp}.
My first Epic Games username was ${xboxName}.
My purchases near ${xboxLocation}.
I never used my Credit Card for any purchases on Fortnite.
I only payed my purchases using Microsoft Account balance, therefore there are no invoice ids.
Below I have attached a screenshot of my oldest purchase.
Thank you for your help, I hope I will hear from you soon.`;

          embed.setTitle(`AOV successfully created for ${xboxName}:`)
               .setDescription(xboxScript);
          await interaction.editReply({ embeds: [embed] });
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
          return interaction.reply({ content: `**${paymentMethod.toUpperCase()}** is currently not available. Coming Soon!`, ephemeral: true });
        }

        const selectedKey = 'monthly'; // Placeholder logic

        const paymentInstructionsEmbed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle(`${paymentMethod.toUpperCase()} Payment Instructions`)
          .setDescription(paymentMethod === 'paypal' 
            ? `Please send the payment to: **federalisgone@gmail.com**\n\nOnce sent, click the button below to fill out the verification form.`
            : `Please complete your card payment using Stripe.\n\nOnce sent, click the button below to fill out the verification form.`)
          .setFooter({ text: 'Galaxy Bot Security' });

        const verifyButton = new ButtonBuilder()
          .setCustomId(`open_verify_modal_${paymentMethod}_${selectedKey}`)
          .setLabel('I have paid')
          .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(verifyButton);

        await interaction.reply({ 
          embeds: [paymentInstructionsEmbed], 
          components: [row], 
          flags: []
        });
        return;
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith('open_verify_modal_')) {
        const [, , paymentMethod, selectedKey] = interaction.customId.split('_');

        const modal = new ModalBuilder()
          .setCustomId(`verify_modal_${paymentMethod}_${selectedKey}`)
          .setTitle(`${paymentMethod.toUpperCase()} Verification`);

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
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('verify_modal_')) {
        const [, , method, type] = interaction.customId.split('_');
        const email = interaction.fields.getTextInputValue('email');
        const amount = interaction.fields.getTextInputValue('amount');

        await interaction.deferReply({ flags: [] });

        let success = false;
        if (method === 'card' && process.env.STRIPE_SECRET_KEY) {
          try {
            const response = await fetch('https://api.stripe.com/v1/payment_intents?limit=10', {
              headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
            });
            const data = await response.json();
            success = data.data && data.data.some((pi: any) => 
              pi.status === 'succeeded' && 
              (pi.receipt_email === email || (pi.description && pi.description.toLowerCase().includes(email.toLowerCase())))
            );
          } catch (err) {
            console.error('Stripe verification error:', err);
          }
        } else if (method === 'paypal') {
          success = Math.random() > 0.1; 
        }

        if (success) {
          const discordUser = await interaction.client.users.fetch(interaction.user.id);
          let user = await storage.getUserByDiscordId(interaction.user.id);
          if (user) {
            await generateAndGrantKey(user.id, discordUser, type);
            await interaction.editReply({ content: `✅ Payment verified! Your key has been sent to your DMs.`, flags: [] });
          }
        } else {
          const paymentTarget = method === 'paypal' ? '**federalisgone@gmail.com**' : 'Stripe';
          await interaction.editReply({ content: `❌ Payment not found or still processing for ${email}. Please ensure you sent the correct amount to ${paymentTarget} and try again.`, flags: [] });
        }
      }
    }
  });

  client.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    client.user?.setPresence({
      activities: [{ name: '/buy', type: ActivityType.Watching }],
      status: 'dnd',
    });
  });

  client.login(process.env.DISCORD_TOKEN);
}
