import { client } from '#root/RankVerify';
import { Listener } from '@sapphire/framework';
import type { Message } from 'discord.js';

export default class UserListener extends Listener {
	public run(message: Message) {
		if (!message.inGuild() || message.author.bot) return;

		client.verificationManager.handleVerificationMessage(message);
	}
}
