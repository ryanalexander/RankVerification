import { Listener } from '@sapphire/framework';
import type { GuildConfig } from '#helpers/interfaces/Config';
import {
	ButtonInteraction,
	Interaction,
	MessageActionRow,
	Modal,
	ModalActionRowComponent,
	ModalSubmitInteraction,
	SelectMenuInteraction,
	TextChannel,
	TextInputComponent,
	ThreadChannel
} from 'discord.js';
import { client } from '#root/RankVerify';
import VerificationManager from '#root/managers/VerificationManager';

export default class UserListener extends Listener {
	public async run(interaction: Interaction) {
		if (interaction instanceof SelectMenuInteraction) {
			if (interaction.customId === 'quickDeny') {
				const guild: GuildConfig | undefined = client.config.guilds.find((g) => g.verify_queue === interaction.channel!.id);

				if (guild) {
					// Most likely a response to a verification request
					const logChannel = (await client.guilds.cache.get(guild.id)!.channels.fetch(guild.verify_log_public)) as unknown as ThreadChannel;
					const target = await client.guilds.cache.get(guild.id)!.members.fetch(interaction.message.embeds[0].footer!.text.split(' ')[0]);

					if (!target) {
						await interaction.reply({ content: 'Looks like they left the Discord :(', ephemeral: true });
						void interaction.message.delete().catch(console.log);
						return;
					}

					const messages = guild.quickdeny.filter((q) => interaction.values.includes(q.id));
					void interaction.message.delete().catch(console.log);

					void logChannel.send(
						`:red_square: ${target.user} Hello! Your verification was denied. Reason/s listed below: \n${messages
							.map((message) => ` > ${message.reply}`)
							.join('\n')}`
					);

					void client.verificationManager.logVerificationFailure(
						target,
						messages.map((message) => `- ${message.reply}`).join('\n'),
						await VerificationManager.downloadImage(interaction.message.embeds[0].image!.url),
						interaction.member
					);

					try {
						target
							.createDM()
							.then((dm) => {
								dm.send(
									`:red_square: ${target.user} Hello! Your verification was denied. Reason/s listed below: \n${messages
										.map((message) => `> ${message.reply}\n`)
										.join('\n')}`
								).catch();
							})
							.catch();
					} catch (e) {}
				}
			} else if (interaction.customId === 'rank' && interaction.values[0] !== 'higher') {
				const guild: GuildConfig | undefined = client.config.guilds.find((g) => g.verify_queue === interaction.channel!.id);
				if (!guild) return;
				const target = await client.guilds.cache.get(guild.id)!.members.fetch(interaction.message.embeds[0].footer!.text.split(' ')[0]);

				if (!target) {
					await interaction.reply({ content: 'Looks like they left the Discord :(', ephemeral: true });
					void interaction.message.delete().catch(console.log);
					return;
				}

				const rank = interaction.guild.roles.cache.find((role) => role.name === interaction.values[0]);

				if (!rank) return;

				target.roles.add(rank).catch();

				void client.verificationManager.logVerificationSuccess(
					target,
					rank,
					await VerificationManager.downloadImage(interaction.message.embeds[0].image!.url),
					interaction.member
				);

				void interaction.message.delete().catch(console.log);
			}
		}

		if (interaction instanceof ButtonInteraction) {
			if (interaction.customId === 'higher') {
				const modal = new Modal().setCustomId(`higher-${interaction.message.id}`).setTitle('uwu rank me please');

				const username = interaction.message.embeds[0].fields.find((field) => field.name === 'Username')!.value;

				const usernameInput = new TextInputComponent()
					.setCustomId('username')
					.setLabel('Valorant Username')
					.setStyle('SHORT')
					.setRequired(true);
				const taglineInput = new TextInputComponent().setCustomId('tag').setLabel('Valorant Tagline').setStyle('SHORT').setRequired(true);

				if (username !== 'Unknown') {
					usernameInput.setValue(username.split('#')[0] ?? ' ');
					taglineInput.setValue(username.split('#')[1] ?? '');
				}

				modal.addComponents(
					new MessageActionRow<ModalActionRowComponent>().addComponents(usernameInput),
					new MessageActionRow<ModalActionRowComponent>().addComponents(taglineInput)
				);

				void interaction.showModal(modal);
			} else if (interaction.customId === 'manual') {
				if (!interaction.member.permissions.has('ADMINISTRATOR')) {
					void interaction.reply("Hey, You can't do that!");
					return;
				}

				const modal = new Modal().setCustomId(`manual-${interaction.message.id}`).setTitle('Manually specify rank');

				const rankInput = new TextInputComponent().setCustomId('rank').setLabel('Valorant Rank').setStyle('SHORT').setRequired(true);

				modal.addComponents(new MessageActionRow<ModalActionRowComponent>().addComponents(rankInput));

				void interaction.showModal(modal);
			}
		}

		if (interaction instanceof ModalSubmitInteraction) {
			const modalInteraction: ModalSubmitInteraction = interaction;
			if (modalInteraction.customId.startsWith('higher-')) {
				await modalInteraction.deferReply({ ephemeral: true });
				const verifyMessage = await (modalInteraction.guild!.channels.cache.get(modalInteraction.channelId!)! as TextChannel).messages.fetch(
					modalInteraction.customId.split('-')[1]
				);
				const guild: GuildConfig | undefined = client.config.guilds.find((g) => g.verify_queue === modalInteraction.channel!.id);
				if (!guild) return;
				const username = modalInteraction.fields.getTextInputValue('username');
				const tag = modalInteraction.fields.getTextInputValue('tag');

				// Validate account
				const account = await client.verificationManager.lookupUser(username, tag);
				if (!account.success) {
					void interaction.editReply({ content: account.message! });
					return;
				}

				const target = await client.guilds.cache.get(guild.id)!.members.fetch(verifyMessage.embeds[0].footer!.text.split(' ')[0]);

				if (!target) {
					await interaction.editReply({ content: 'Looks like they left the Discord :(' });
					void verifyMessage.delete().catch(console.log);
					return;
				}

				const rank = account.data!.rank.split(' ')[0];

				if (!rank) {
					void interaction.editReply({ content: `No role has been configured for rank ${rank}` });
					return;
				}

				const response = await client.verificationManager.verifyUser(target, rank, {
					puuid: account.data!.account.puuid,
					rank
				});

				if (!response.success) {
					void interaction.editReply({ content: response.message! });
					return;
				}

				void client.verificationManager.logVerificationSuccess(
					target,
					response.role!,
					await VerificationManager.downloadImage(verifyMessage.embeds[0].image!.url),
					interaction.member
				);

				void interaction.editReply({ content: `${target.user.toString()} has been verified as ${response.role}` });
				void verifyMessage.delete().catch(console.log);
			} else if (modalInteraction.customId.startsWith('manual-')) {
				await modalInteraction.deferReply({ ephemeral: true });
				const verifyMessage = await (modalInteraction.guild!.channels.cache.get(modalInteraction.channelId!)! as TextChannel).messages.fetch(
					modalInteraction.customId.split('-')[1]
				);
				const guild: GuildConfig | undefined = client.config.guilds.find((g) => g.verify_queue === modalInteraction.channel!.id);
				if (!guild) return;

				const target = await client.guilds.cache.get(guild.id)!.members.fetch(verifyMessage.embeds[0].footer!.text.split(' ')[0]);

				if (!target) {
					await interaction.editReply({ content: 'Looks like they left the Discord :(' });
					void verifyMessage.delete().catch(console.log);
					return;
				}

				const rank = modalInteraction.fields.getTextInputValue('rank');

				const response = await client.verificationManager.verifyUser(target, rank, {
					puuid: '',
					rank
				});

				if (!response.success) {
					void interaction.editReply({ content: response.message! });
					return;
				}

				void client.verificationManager.logVerificationSuccess(
					target,
					response.role!,
					await VerificationManager.downloadImage(verifyMessage.embeds[0].image!.url),
					interaction.member
				);

				void interaction.editReply({ content: `${target.user.toString()} has been verified as ${response.role}` });
				void verifyMessage.delete().catch(console.log);
			}
		}

		return true;
	}
}
