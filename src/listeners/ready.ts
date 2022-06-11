import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type VerifyClient from '../helpers/VerifyClient';

@ApplyOptions<Listener.Options>({
	once: true
})
export default class UserListener extends Listener {
	public run(client: VerifyClient) {
		// Do health checks and stuff

		client.logging.log('INFO', `${client.user} is ready!`, 'Ready!');
		console.log('Ready!');

		void (async () => {
			await client.guilds.fetch();
			client.guilds.cache.forEach((guild) => {
				void guild.members.fetch();
			});
		})().then(() => console.log('Finished caching all members'));

		/* Remove all registered application commands
		void (async () =>
			(await client.application?.commands.fetch())?.forEach((command) => {
				void command.delete();
			}))();
		*/
	}
}