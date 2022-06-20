import { client as vClient } from '#root/RankVerify';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { Guild, TextChannel } from 'discord.js';
import type VerifyClient from '../helpers/VerifyClient';

@ApplyOptions<Listener.Options>({
	once: true
})
export default class UserListener extends Listener {
	public async run(client: VerifyClient) {
		// Do health checks and stuff

		console.log('Ready!');

		await client.guilds.fetch();

		client.user?.setPresence({
			status: 'dnd',
			activities: [
				{
					name: 'for your rank submissions!',
					type: 'WATCHING'
				}
			]
		});

		vClient.config.guilds.forEach(async (guildConfig) => {
			const guild = client.guilds.cache.get(guildConfig.id) as Guild;
			const channel = (await guild.channels.fetch(guildConfig.verify_target)) as TextChannel;
			if (channel) {
				const messages = (await channel.messages.fetch({ limit: 100 })).filter((message) => !message.author.bot);
				console.log(`Found ${messages.size} messages in ${channel.toString()}`);
				messages.forEach(client.verificationManager.handleVerificationMessage);
			}
		});

		/* Remove all registered application commands
		void (async () =>
			(await client.application?.commands.fetch())?.forEach((command) => {
				void command.delete();
			}))();
		*/
	}
}
