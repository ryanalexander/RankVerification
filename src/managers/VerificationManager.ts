import { GuildMember, Message, MessageActionRow, MessageEmbed, MessageSelectMenu, TextChannel } from 'discord.js';
import type { GuildConfig } from '#helpers/interfaces/Config';
import { BrandColors } from '#utils/constants';
import { client } from '#root/RankVerify';
import fs from 'fs';
import type VerificationResponse from '#helpers/interfaces/VerificationResponse';
import type AccountAssociation from '#helpers/interfaces/AccountAssociation';

export default class VerificationManager {
	private previouslyVerified: AccountAssociation[];

	public constructor() {
		this.previouslyVerified = JSON.parse(fs.readFileSync('./verifications.json').toString());
	}

	public async verifyUser(
		member: GuildMember,
		rank: string,
		account: VerificationResponse
	): Promise<{ error?: string; message?: string; success?: boolean }> {
		await member.guild.roles.fetch();
		const role = member.guild.roles.cache.find((r) => r.name.toLowerCase() === rank.split(' ')[0].toLowerCase());

		const duplicate = this.previouslyVerified.find((verification) => verification.puuid === account.puuid);

		if (duplicate && duplicate.discord_id !== member.user.id) {
			return {
				error: 'duplicate',
				message: `This account has already been used to verify for <@${duplicate.discord_id}>, unlink that account first!`
			};
		}

		if (role) {
			await member.roles.add(role);
			this.previouslyVerified.push({
				discord_id: member.user.id,
				puuid: account.puuid
			});
			fs.writeFileSync('./verifications.json', JSON.stringify(this.previouslyVerified));
			return { success: true };
		}
		return {
			error: 'invalid-role',
			message: `The server admins have not configured that rank yet, have an admin configure \`${rank.split(' ')[0].toLowerCase()}\`!`
		};
	}

	public async handleVerificationMessage(message: Message) {
		if (!message.inGuild() || message.author.bot) return;

		const channel: TextChannel = message.channel as TextChannel;

		const guild: GuildConfig | undefined = client.config.guilds.find((g) => g.verify_target === channel.id);

		if (guild) {
			// Message was sent in verify channel

			let imageUrl = '';

			// Check if message contains an image, save as image
			if (message.attachments.size > 0) {
				const attachment = message.attachments.first();
				if (attachment) {
					const image = attachment.url;
					if (image) imageUrl = image;
				}
			} else if (message.embeds.length > 0) {
				const embed = message.embeds.find((embed) => embed.image && embed.image.url);
				if (embed) {
					const image = embed.image!.url;
					if (image) imageUrl = image;
				}
			}

			if (imageUrl) {
				const targetChannel = (await client.channels.fetch(guild.verify_queue)) as TextChannel;
				if (!message.member) return;
				const currentRank = message.member.roles.cache.find((role) => guild.ranknames.includes(role.name));

				const embed = new MessageEmbed();
				embed.setAuthor({
					name: `Rank Verification`,
					iconURL: 'https://uploads-ssl.webflow.com/5f7627b1060dac86739e4d54/60984bf8bc5031de9f22b50e_Main_Wordmark.png'
				});
				embed.setDescription(`${message.author.tag} has requested verification.`);
				embed.addField('Mention', message.author.toString(), true);
				if (currentRank) embed.addField('Current Rank', currentRank.toString(), true);
				embed.setColor(BrandColors.Primary);
				embed.setThumbnail(imageUrl);
				embed.setFooter({ text: message.author.id });
				embed.setTimestamp(new Date());

				const quickDenyRow = new MessageActionRow();
				const quickDeny = new MessageSelectMenu()
					.setCustomId('quickDeny')
					.setPlaceholder('Chose a quick deny reason')
					.setMinValues(1)
					.setMaxValues(guild.quickdeny.length);

				quickDeny.addOptions(
					guild.quickdeny.map((q) => {
						return {
							label: q.name,
							description: q.reply,
							value: q.id
						};
					})
				);

				const rankVerifyRow = new MessageActionRow();
				const rank = new MessageSelectMenu().setCustomId('rank').setPlaceholder('Manually specify rank (Gold and below)').setMaxValues(1);

				rank.addOptions(guild.ranknames.slice(0, guild.rankcap).map((r) => ({ label: r, value: r })));

				quickDenyRow.addComponents(quickDeny);
				rankVerifyRow.addComponents(rank);

				await targetChannel.send({ embeds: [embed], components: [quickDenyRow, rankVerifyRow] });
				void message.delete();
			} else {
				void message.delete();
				void message.author
					.createDM()
					.then((dm) => {
						dm.send(`You must include an image in your message to verify.`).catch(() => {
							void message.channel
								.send({
									content: `Hey ${message.author.toString()}, you must include an image in your message to verify.`
								})
								.then((message) => {
									setTimeout(() => message.delete(), 5000);
								});
						});
					})
					.catch(() => {
						void message.channel
							.send({
								content: `Hey ${message.author.toString()}, you must include an image in your message to verify.`
							})
							.then((message) => {
								setTimeout(() => message.delete(), 5000);
							});
					});
			}
		}
	}
}
