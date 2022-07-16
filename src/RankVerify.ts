import { container } from '@sapphire/framework';
import 'dotenv/config';
import VerifyClient from './helpers/VerifyClient';

export const client = new VerifyClient({
	intents: ['GUILDS', 'GUILD_MESSAGES']
});

async function main() {
	try {
		await client.login(process.env.BOT_TOKEN);
	} catch (error) {
		container.logger.error(error);
		client.destroy();
		process.exit(1);
	}
}

main().catch(container.logger.error.bind(container.logger));
