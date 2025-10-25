const { getKazagumo } = require("../utils/kazagumoClient");
const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const axios = require("axios");

async function setVoiceStatus(channelId, status, token) {
  try {
    await axios.put(
      `https://discord.com/api/v10/channels/${channelId}/voice-status`,
      { status: status || "" },
      {
        headers: {
          'Authorization': `Bot ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return true;
  } catch (error) {
    console.error('Voice status API error:', error.response?.data || error.message);
    return false;
  }
}

module.exports = {
  name: "vcstatus",
  aliases: ["voicestatus", "vcs"],
  run: async (client, message, args) => {
    const { voice } = message.member;
    if (!voice.channel) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#E74C3C")
            .setDescription("❌ Join a voice channel first!")
        ]
      });
    }

    // Check bot permissions
    const botMember = message.guild.members.me;
    if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#E74C3C")
            .setDescription("❌ I need **Manage Channels** permission to set voice status!")
        ]
      });
    }

    const mode = args[0]?.toLowerCase();
    
    if (!mode || !['on', 'off'].includes(mode)) {
      const embed = new EmbedBuilder()
        .setColor("#3498DB")
        .setTitle("🎙 Voice Channel Status")
        .setDescription("**Usage:**\n`!vcstatus on` - Enable VC status\n`!vcstatus off` - Disable VC status")
        .addFields({
          name: "ℹ️ Info",
          value: "Shows currently playing song above voice channel"
        })
        .setFooter({ text: "Requires Manage Channels permission" });
      return message.channel.send({ embeds: [embed] });
    }

    try {
      if (mode === 'on') {
        const kazagumo = getKazagumo();
        const player = kazagumo?.players.get(message.guild.id);
        
        let statusText = "🎵 Music Bot Active";
        
        if (player?.queue?.current) {
          const track = player.queue.current;
          statusText = `🎵 ${track.title.substring(0, 120)}`;
        }

        const success = await setVoiceStatus(voice.channel.id, statusText, client.token);
        
        if (!success) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor("#E74C3C")
                .setDescription("❌ Failed to set VC status. Check bot permissions!")
            ]
          });
        }

        const embed = new EmbedBuilder()
          .setColor("#2ECC71")
          .setTitle("✅ VC Status Enabled")
          .setDescription(`Voice channel status is now **ON**\n\n📍 Channel: **${voice.channel.name}**\n📊 Status: ${statusText}`)
          .setFooter({ text: "Status will update automatically when songs change" });
        
        message.channel.send({ embeds: [embed] });

        if (player) {
          player.data.set('vcstatus', { enabled: true, channelId: voice.channel.id });
        }

      } else if (mode === 'off') {
        const success = await setVoiceStatus(voice.channel.id, "", client.token);

        if (!success) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor("#E74C3C")
                .setDescription("❌ Failed to clear VC status. Check bot permissions!")
            ]
          });
        }

        const kazagumo = getKazagumo();
        const player = kazagumo?.players.get(message.guild.id);
        if (player) {
          player.data.delete('vcstatus');
        }

        const embed = new EmbedBuilder()
          .setColor("#E74C3C")
          .setTitle("✅ VC Status Disabled")
          .setDescription(`Voice channel status is now **OFF**\n\n📍 Channel: **${voice.channel.name}**`)
          .setFooter({ text: "Status cleared from voice channel" });
        
        message.channel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error('VC Status error:', error);
      message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#E74C3C")
            .setDescription("❌ Failed to update voice channel status!")
        ]
      });
    }
  }
};
      
