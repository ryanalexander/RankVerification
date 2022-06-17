import { Listener } from '@sapphire/framework';
import type { GuildConfig } from '#helpers/interfaces/Config';
import { Interaction, MessageEmbed, SelectMenuInteraction, TextChannel } from 'discord.js';
import { client } from '#root/RankVerify';

export default class UserListener extends Listener {
	public async run(interaction: Interaction) {
		if (interaction instanceof SelectMenuInteraction) {
			const selectInteraction: SelectMenuInteraction = interaction;

			if (interaction.customId === 'quickDeny') {
				await selectInteraction.deferReply({ ephemeral: true });
				const guild: GuildConfig | undefined = client.config.guilds.find((g) => g.verify_queue === interaction.channel!.id);

				if (guild) {
					// Most likely a response to a verification request

					const messages = guild.quickdeny.filter((q) => interaction.values.includes(q.id));
					console.log(messages);
				}
			} else if (interaction.customId === 'rank') {
				const guild: GuildConfig | undefined = client.config.guilds.find((g) => g.verify_queue === interaction.channel!.id);
				if (!guild) return;

				const rank = interaction.guild.roles.cache.find((role) => role.name === interaction.values[0]);

				if (!rank) return;

				const embed = interaction.message.embeds[0] as MessageEmbed;

				// Save log
				const logChannel = (await client.channels.fetch(guild.verify_log)) as TextChannel;
				embed.setTitle('Accepted verification');
				embed.addField('\u200b', '\u200b', false);
				embed.addField('Verified Rank', rank.toString(), true);
				embed.addField('Verified by', interaction.member.toString());

				void logChannel.send({ embeds: [embed] });

				void interaction.deleteReply();
				void interaction.message.delete();
			}
		}

		return true;
	}
}
