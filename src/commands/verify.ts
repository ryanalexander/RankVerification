import { ApplicationCommandRegistry, Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { SlashCommandBuilder, SlashCommandStringOption, SlashCommandUserOption } from '@discordjs/builders';
import { client } from '#root/RankVerify';
import type { CommandInteraction } from 'discord.js';

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

		await interaction.deferReply({ ephemeral: true });

		// Validate account
		const account = await client.verificationManager.lookupUser(username!, tagline!);
		if (!account.success) {
			void interaction.editReply({ content: account.message! });
			return;
		}

		const rank = account.data!.rank.current_data.currenttierpatched.split(' ')[0];

		if (!rank) {
			void interaction.editReply({ content: `No role has been configured for rank ${rank}` });
			return;
		}

		const response = await client.verificationManager.verifyUser(member, rank, {
			puuid: account.data!.account.puuid,
			rank
		});

		if (!response.success) {
			void interaction.editReply({ content: response.message! });
			return;
		}

		void interaction.editReply({ content: `${member.user.toString()} has been verified as ${response.role}` });
	}
}
