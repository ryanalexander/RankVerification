import { ApplicationCommandRegistry, Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { CommandInteraction, MessageEmbed } from 'discord.js';
import { SlashCommandBuilder, SlashCommandStringOption, SlashCommandUserOption } from '@discordjs/builders';
import fetch from 'node-fetch';
import { LogColors } from '#utils/constants';
import { client } from '#root/RankVerify';

@ApplyOptions<Command.Options>({
	description: 'Verify a members rank'
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
		const userOption = new SlashCommandUserOption();
		userOption.setName('user').setRequired(true).setDescription('The user to verify');
		const usernameOptions = new SlashCommandStringOption();
		usernameOptions.setName('username').setRequired(true).setDescription('in game username of player');
		const taglineOptions = new SlashCommandStringOption();
		taglineOptions.setName('tag').setRequired(true).setDescription('in game tagline of player');

		const command = new SlashCommandBuilder()
			.setName(this.name)
			.setDescription(this.description)
			.setDefaultPermission(true)
			.addUserOption(userOption)
			.addStringOption(usernameOptions)
			.addStringOption(taglineOptions);

		registry.registerChatInputCommand(command);
	}

	public async chatInputRun(interaction: CommandInteraction) {
		const user = interaction.options.getUser('user');
		const username = interaction.options.getString('username');
		const tagline = interaction.options.getString('tag');

		const member = await interaction.guild!.members.fetch(user!.id);

		const embed = new MessageEmbed();

		await interaction.deferReply({ ephemeral: true });

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

		if (!account) {
			embed.setTitle('Error');
			embed.setDescription('Could not find account');
			embed.setColor(LogColors.Error);
			return interaction.editReply({ embeds: [embed] });
		}

		if (!account.region || account.region !== 'ap') {
			embed.setTitle("User's account is not in OCE");
			embed.setDescription('We are not able to verify accounts not in the oceanic region, advise player we are in the oceanic region');
			embed.setColor(LogColors.Warning);

			return interaction.editReply({ embeds: [embed] });
		}

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

		if (!rank.current_data || !rank.current_data.currenttier) {
			embed.setTitle('User is not ranked');
			embed.setDescription('Please advise the member we are unable to verify an account that is not current placed.');
			embed.setColor(LogColors.Warning);

			return interaction.editReply({ embeds: [embed] });
		}

		const verification = await client.verificationManager.verifyUser(member, rank.current_data.currenttierpatched.split(' ')[0], {
			puuid: account.puuid,
			rank: rank.current_data.currenttierpatched.split(' ')[0]
		});

		if (verification.success) {
			embed.setTitle('User verified');
			embed.addField('User', `${user?.toString()}`, true);
			embed.addField('Rank', rank.current_data.currenttierpatched.split(' ')[0], true);
			embed.addField('Username', `${username}#${tagline}`, false);
			embed.setTimestamp(new Date());
			embed.setFooter('Verified by', interaction.user.displayAvatarURL());
			embed.setColor(LogColors.Success);

			await interaction.editReply({ embeds: [embed] });
		} else {
			embed.setTitle(verification.error!);
			embed.setDescription(verification.message!);
			embed.setColor(LogColors.Error);

			await interaction.editReply({ embeds: [embed] });
		}

		return true;
	}
}
