import {
	GuildMember,
	Message,
	MessageActionRow,
	MessageAttachment,
	MessageButton,
	MessageEmbed,
	MessageSelectMenu,
	Role,
	TextChannel
} from 'discord.js';
import type { GuildConfig } from '#helpers/interfaces/Config';
import { BrandColors, Colors } from '#utils/constants';
import { client } from '#root/RankVerify';
import fetch from 'node-fetch';
import fs from 'fs';
import axios from 'axios';
import type VerificationResponse from '#helpers/interfaces/VerificationResponse';
import type AccountAssociation from '#helpers/interfaces/AccountAssociation';
import resolveTag from '#utils/valorantTagResolver';
import { API as ValorantAPI } from '#helpers/lib/ValorantJS/index';
import { Ranks } from '#utils/Rank';
import { fetchImagesForMessage, sendMessageWithTTL } from '#utils/MessageUtils';

export default class VerificationManager {
	private previouslyVerified: AccountAssociation[];

	private valorantApi: any;

	public constructor() {
		this.previouslyVerified = JSON.parse(fs.readFileSync('./data/verifications.json').toString());

		this.valorantApi = new ValorantAPI();
		this.valorantApi.authorize('stelchworker', '8uIM&qVaTUEBek5hO0N%2x@gVaeymk4S8ty');
		setInterval(() => {
			this.valorantApi.authorize('stelchworker', '8uIM&qVaTUEBek5hO0N%2x@gVaeymk4S8ty');
		}, 1000 * 60 * 60);
	}

	public async verifyUser(
		member: GuildMember,
		rank: string,
		account: VerificationResponse
	): Promise<{ error?: string; message?: string; success?: boolean; role?: Role }> {
		const guild: GuildConfig = client.config.guilds.find((g) => g.id === member.guild.id) as GuildConfig;
		await member.guild.roles.fetch();
		const role = member.guild.roles.cache.find((r) => r.name.toLowerCase() === rank.split(' ')[0].toLowerCase());

		const duplicate = this.previouslyVerified.find((verification) => verification.puuid === account.puuid);

		if (duplicate && duplicate.discord_id !== member.user.id && account.puuid !== '') {
			return {
				error: 'duplicate',
				message: `This account has already been used to verify for <@${duplicate.discord_id}>, unlink that account first!`
			};
		}

		if (role) {
			/*
			if (guild.ranknames.map((name) => name.toLowerCase()).indexOf(role.name!.toLowerCase()) > 4)
				return {
					error: 'too-high',
					message: `Daddy waspy said we can't verify ${role.toString()} right now. Maybe one day ;)`
				};
				*/
			if (guild.ranknames.map((name) => name.toLowerCase()).indexOf(role.name!.toLowerCase()) === -1) {
				return {
					error: 'invalid',
					message: `The rank specified is not a valid rank for this server.`
				};
			}
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

	public async logVerificationSuccess(member: GuildMember, rank: Role, image: Buffer, staff: GuildMember) {
		const guild: GuildConfig = client.config.guilds.find((g) => g.id === member.guild.id) as GuildConfig;
		const targetChannel = (await client.channels.fetch(guild.verify_log)) as TextChannel;
		const pubTargetChannel = (await client.channels.fetch(guild.verify_log_public)) as TextChannel;

		const attachment = new MessageAttachment(image, 'verification.png');

		const embed = new MessageEmbed()
			.setColor(Colors.LightGreen)
			.setTitle('Verification Accepted')
			.setDescription(`${member.user} has been verified for the rank ${rank}`)
			.addField('Rank', `${rank}`)
			.addField('Verified by', `${staff.user}`)
			.setImage('attachment://verification.png')
			.setTimestamp();

		await pubTargetChannel.send({
			content: `:green_square: ${member.user} Hello! Your image has been accepted!\nYou have been given: ${rank}`,
			allowedMentions: { parse: [] }
		});

		await targetChannel.send({ embeds: [embed], files: [attachment] });
	}

	public async locateExistingVerification(member: GuildMember): Promise<Message<boolean> | undefined> {
		const guild: GuildConfig = client.config.guilds.find((g) => g.id === member.guild.id) as GuildConfig;
		const targetChannel = (await client.channels.fetch(guild.verify_queue)) as TextChannel;
		const messages = await targetChannel.messages.fetch({ limit: 100 });
		const message = messages
			.filter((m) => m.embeds.length > 0 && m.embeds[0].footer !== null)
			.filter((m) => m.embeds[0].footer!.text.split(' ')[0].split(' ')[0] === member.user.id);

		return message.size > 0 ? message.first() : undefined;
	}

	public async lookupUser(username: string, tagline: string) {
		let account = await (
			await fetch(`http://ext-ocegg.stelch.net:8081/valorant/users/${username}/${tagline}`, {
				headers: {
					accept: '*/*',
					'accept-language': 'en-AU,en;q=0.9,en-US;q=0.8',
					'sec-fetch-dest': 'empty',
					'sec-fetch-mode': 'cors',
					'sec-fetch-site': 'same-site',
					'sec-gpc': '1',
					'Referrer-Policy': 'strict-origin-when-cross-origin'
				},
				method: 'GET'
			})
		).json();

		if (account.success === false) {
			return {
				success: account.success,
				message: `${account.error} - DV${account.code}`
			};
		}

		if (!account) return { success: false, message: 'No account found' };

		account = account.data;

		if (!account.puuid) {
			console.log(account);
			return { success: false, message: 'Failed to resolve player ID' };
		}

		// Region check is deprecated
		// if (!account.region || account.region !== 'ap') return { success: false, message: 'Account not oce' };

		const { data } = await axios.get(
			`https://pd.ap.a.pvp.net/mmr/v1/players/${account.puuid}/competitiveupdates?startIndex=0&endIndex=1&queue=competitive`,
			{
				headers: this.valorantApi.generateRequestHeaders()
			}
		);
		const rank = data;

		if (!rank) return { success: false, message: 'No MMR found' };

		if (!rank.Matches[0]) return { success: false, message: 'No recent enough matches to determine current rank' };

		return { success: true, data: { account, rank: Ranks[rank.Matches[0].TierAfterUpdate] } };
	}

	public async handleVerificationMessage(message: Message) {
		if (!message.inGuild() || message.author.bot) return;

		const channel: TextChannel = message.channel as TextChannel;

		const guild: GuildConfig | undefined = client.config.guilds.find((g) => g.verify_target === channel.id);

		if (guild) {
			// Message was sent in verify channel
			if (!message.member) {
				void message.delete();
				return;
			}

			if (message.member.id === '427364819205881856') {
				void message.delete();
				sendMessageWithTTL(
					{
						content: `Hey ${message.author.toString()}, you are currently restricted from rank verification. Please contact modmail for assistance!`
					},
					message.channel as TextChannel,
					5000
				);
				return;
			}

			const imageUrl = fetchImagesForMessage(message)[0];

			if (imageUrl) {
				const image = await VerificationManager.downloadImage(imageUrl);
				const targetChannel = (await client.channels.fetch(guild.verify_queue)) as TextChannel;
				const existingVerification = await this.locateExistingVerification(message.member);
				const currentRank = message.member!.roles.cache.find((role) => guild.ranknames.includes(role.name));
				let valorantUsername;

				// Delete verification message as we have already cached details and saved image.
				void message.delete().catch(console.log);

				// Update existing verification is already exists
				if (existingVerification) {
					const attachment = new MessageAttachment(image, 'verify.png');
					void existingVerification.edit({ files: [attachment] });

					sendMessageWithTTL(
						{ content: `Hey ${message.author.toString()}! \nI have updated your existing verification to show this new image!` },
						message.channel as TextChannel,
						5000
					);
					return;
				}

				sendMessageWithTTL(
					{
						content: `Hey ${message.author.toString()}! \nWe are now processing your verification, this may take a few hours :)`
					},
					message.channel as TextChannel,
					10000
				);

				try {
					valorantUsername = await resolveTag(image);
				} catch (_e) {
					valorantUsername = { success: false, error: 'Unable to parse image' };
				}

				// Build verification message embed
				const embed = new MessageEmbed();
				embed
					.setAuthor({
						name: `Rank Verification`,
						iconURL: 'https://uploads-ssl.webflow.com/5f7627b1060dac86739e4d54/60984bf8bc5031de9f22b50e_Main_Wordmark.png'
					})
					.setDescription(`${message.author.tag} has requested verification.`)
					.addField('Mention', message.author.toString(), true)
					.setFooter({ text: `${message.author.id} ${valorantUsername.message}` })
					.setTimestamp(new Date())
					.setColor(BrandColors.Primary);

				if (valorantUsername) embed.addField('Username', valorantUsername!.parts?.join('#') ?? 'Unknown', true);
				if (currentRank) embed.addField('Current Rank', currentRank.toString(), true);

				// Define rows
				let manualActionsRow;

				if (guild.modules.indexOf('VALORANT') > -1) {
					manualActionsRow = new MessageActionRow()
						.addComponents(new MessageButton().setCustomId('higher').setStyle('PRIMARY').setLabel('Higher rank'))
						.addComponents(new MessageButton().setCustomId('manual').setStyle('SECONDARY').setLabel('Manual rank'))
						.addComponents(new MessageButton().setCustomId('request').setStyle('DANGER').setLabel('Request username'));
				}

				const quickDenyRow = new MessageActionRow().addComponents(
					new MessageSelectMenu()
						.setCustomId('quickDeny')
						.setPlaceholder('Chose a quick deny reason')
						.setMinValues(1)
						.setMaxValues(guild.quickdeny.length)
						.addOptions([
							...guild.quickdeny.map((q) => {
								return {
									label: q.name,
									description: q.description,
									value: q.id
								};
							})
						])
				);
				const rankVerifyRow = new MessageActionRow().addComponents(
					new MessageSelectMenu()
						.setCustomId('rank')
						.setPlaceholder('Manually specify rank (Gold and below)')
						.setMaxValues(1)
						.addOptions([
							...guild.ranknames.slice(0, guild.rankcap).map((r) => ({ label: r, value: r })),
							{
								label: 'Higher rank',
								value: 'higher'
							}
						])
				);

				// Create attachment to be uploaded with message
				const attachment = new MessageAttachment(image, 'verify.png');
				embed.setImage('attachment://verify.png');

				const components = [quickDenyRow, rankVerifyRow];

				if (manualActionsRow) components.unshift(manualActionsRow);

				await targetChannel.send({ embeds: [embed], components, files: [attachment] });
			} else {
				try {
					// Try DM member
					const dmChannel = await message.author.createDM();
					void dmChannel.send(`You must include an image in your message to verify.`);
				} catch (_e) {
					// Fallback to message channel if unable to DM
					const logChannel = message.channel as TextChannel;
					sendMessageWithTTL(
						{
							content: `You must include an image in your message to verify.`
						},
						logChannel,
						5000
					);
				}
				void message.delete().catch(console.log);
			}
		}
	}

	public static async downloadImage(image: string) {
		const imageData = await axios.get(image, { responseType: 'arraybuffer' });
		return Buffer.from(imageData.data);
	}
}
