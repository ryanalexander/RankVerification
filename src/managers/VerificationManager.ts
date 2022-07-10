import { GuildMember, Message, MessageActionRow, MessageAttachment, MessageEmbed, MessageSelectMenu, Role, TextChannel } from 'discord.js';
import type { GuildConfig } from '#helpers/interfaces/Config';
import { BrandColors, Colors } from '#utils/constants';
import { client } from '#root/RankVerify';
import fetch from 'node-fetch';
import fs from 'fs';
import axios from 'axios';
import type VerificationResponse from '#helpers/interfaces/VerificationResponse';
import type AccountAssociation from '#helpers/interfaces/AccountAssociation';
import resolveTag from '#utils/valorantTagResolver';

export default class VerificationManager {
	private previouslyVerified: AccountAssociation[];

	public constructor() {
		this.previouslyVerified = JSON.parse(fs.readFileSync('./data/verifications.json').toString());
	}

	public async verifyUser(
		member: GuildMember,
		rank: string,
		account: VerificationResponse
	): Promise<{ error?: string; message?: string; success?: boolean; role?: Role }> {
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
			fs.writeFileSync('./data/verifications.json', JSON.stringify(this.previouslyVerified));

			return { success: true, role };
		}
		return {
			error: 'invalid-role',
			message: `The server admins have not configured that rank yet, have an admin configure \`${rank.split(' ')[0].toLowerCase()}\`!`
		};
	}

	public async logVerificationFailure(member: GuildMember, reason: string, image: Buffer, staff: GuildMember) {
		const guild: GuildConfig = client.config.guilds.find((g) => g.id === member.guild.id) as GuildConfig;
		const targetChannel = (await client.channels.fetch(guild.verify_log)) as TextChannel;

		const attachment = new MessageAttachment(image, 'verification.png');

		const embed = new MessageEmbed()
			.setColor(Colors.Red)
			.setTitle('Verification Rejected')
			.setDescription(`${member.user} has failed verification for the reason: \`\`\`\n${reason}\`\`\``)
			.addField('Denied by', `${staff.user}`)
			.setImage('attachment://verification.png')
			.setTimestamp();

		await targetChannel.send({ embeds: [embed], files: [attachment] });
	}

	public async logVerificationSuccess(member: GuildMember, rank: string, image: Buffer, staff: GuildMember) {
		const guild: GuildConfig = client.config.guilds.find((g) => g.id === member.guild.id) as GuildConfig;
		const targetChannel = (await client.channels.fetch(guild.verify_log)) as TextChannel;

		const attachment = new MessageAttachment(image, 'verification.png');

		const embed = new MessageEmbed()
			.setColor(Colors.LightGreen)
			.setTitle('Verification Accepted')
			.setDescription(`${member.user} has been verified for the rank ${rank}`)
			.addField('Rank', `${rank}`)
			.addField('Verified by', `${staff.user}`)
			.setImage('attachment://verification.png')
			.setTimestamp();

		await targetChannel.send({ embeds: [embed], files: [attachment] });
	}

	public async locateExistingVerification(member: GuildMember): Promise<Message<boolean> | undefined> {
		const guild: GuildConfig = client.config.guilds.find((g) => g.id === member.guild.id) as GuildConfig;
		const targetChannel = (await client.channels.fetch(guild.verify_queue)) as TextChannel;
		const messages = await targetChannel.messages.fetch({ limit: 100 });
		const message = messages
			.filter((m) => m.embeds.length > 0 && m.embeds[0].footer !== null)
			.filter((m) => m.embeds[0].footer!.text === member.user.id);

		return message.size > 0 ? message.first() : undefined;
	}

	public async lookupUser(username: string, tagline: string) {
		let account = await (
			await fetch(`https://api.henrikdev.xyz/valorant/v1/account/${username}/${tagline}`, {
				headers: {
					accept: '*/*',
					'accept-language': 'en-AU,en;q=0.9,en-US;q=0.8',
					'cache-control': 'no-cache',
					pragma: 'no-cache',
					'sec-fetch-dest': 'empty',
					'sec-fetch-mode': 'cors',
					'sec-fetch-site': 'same-site',
					'sec-gpc': '1',
					'Referrer-Policy': 'strict-origin-when-cross-origin'
				},
				method: 'GET'
			})
		).json();

		account = account.data;

		if (!account) return { success: false, message: 'No account found' };

		if (!account.region || account.region !== 'ap') return { success: false, message: 'Account not oce' };

		let rank = await (
			await fetch(`https://api.henrikdev.xyz/valorant/v2/by-puuid/mmr/ap/${account.puuid}`, {
				headers: {
					accept: '*/*',
					'accept-language': 'en-AU,en;q=0.9,en-US;q=0.8',
					'cache-control': 'no-cache',
					pragma: 'no-cache',
					'sec-fetch-dest': 'empty',
					'sec-fetch-mode': 'cors',
					'sec-fetch-site': 'same-site',
					'sec-gpc': '1',
					'Referrer-Policy': 'strict-origin-when-cross-origin'
				},
				method: 'GET'
			})
		).json();

		rank = rank.data;

		return { success: true, data: { account, rank } };
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
				const image = await VerificationManager.downloadImage(imageUrl);

				void message.delete().catch(console.log);
				const targetChannel = (await client.channels.fetch(guild.verify_queue)) as TextChannel;
				if (!message.member) return;

				const existingVerification = await this.locateExistingVerification(message.member);

				if (existingVerification) {
					const attachment = new MessageAttachment(image, 'verify.png');
					void existingVerification.edit({ files: [attachment] });

					void message.channel
						.send({
							content: `Hey ${message.author.toString()}! \nI have updated your existing verification to show this new image!`
						})
						.then((message) => {
							setTimeout(() => message.delete().catch(console.log), 5000);
						});
					return;
				}

				const valorantUsername = await resolveTag(image);

				const currentRank = message.member.roles.cache.find((role) => guild.ranknames.includes(role.name));

				const embed = new MessageEmbed();
				embed.setAuthor({
					name: `Rank Verification`,
					iconURL: 'https://uploads-ssl.webflow.com/5f7627b1060dac86739e4d54/60984bf8bc5031de9f22b50e_Main_Wordmark.png'
				});
				embed.setDescription(`${message.author.tag} has requested verification.`);
				embed.addField('Mention', message.author.toString(), true);
				embed.addField('Username', valorantUsername.parts?.join('#') ?? 'Unknown', true);
				if (currentRank) embed.addField('Current Rank', currentRank.toString(), true);
				embed.setColor(BrandColors.Primary);
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

				rank.addOptions([
					{
						label: 'Higher rank',
						value: 'higher'
					}
				]);

				quickDenyRow.addComponents(quickDeny);
				rankVerifyRow.addComponents(rank);

				const attachment = new MessageAttachment(image, 'verify.png');

				embed.setImage('attachment://verify.png');

				await targetChannel.send({ embeds: [embed], components: [quickDenyRow, rankVerifyRow], files: [attachment] });

				void message.channel
					.send({
						content: `Hey ${message.author.toString()}! \nWe are now processing your verification, this may take a few hours :)`
					})
					.then((message) => {
						setTimeout(() => message.delete().catch(console.log), 10000);
					});
			} else {
				void message.author
					.createDM()
					.then((dm) => {
						dm.send(`You must include an image in your message to verify.`).catch(() => {
							void message.channel
								.send({
									content: `Hey ${message.author.toString()}, you must include an image in your message to verify.`
								})
								.then((message) => {
									setTimeout(() => message.delete().catch(console.log), 5000);
								});
						});
					})
					.catch(() => {
						void message.channel
							.send({
								content: `Hey ${message.author.toString()}, you must include an image in your message to verify.`
							})
							.then((message) => {
								setTimeout(() => message.delete().catch(console.log), 5000);
							});
					});
			}
		}
	}

	public static async downloadImage(image: string) {
		const imageData = await axios.get(image, { responseType: 'arraybuffer' });
		return Buffer.from(imageData.data);
	}
}
