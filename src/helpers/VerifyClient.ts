import 'dotenv';
import { SapphireClient } from '@sapphire/framework';
import type { ClientOptions } from 'discord.js';
import { Enumerable } from '@sapphire/decorators';
import type Config from './interfaces/Config';
import { readFileSync } from 'fs';
import VerificationManager from '#root/managers/VerificationManager';

// Master class for interacting with constants within the bot

export default class CogClient extends SapphireClient {
	@Enumerable(false)
	public dev = process.env.NODE_ENV !== 'production';

	public config: Config;
	public verificationManager: VerificationManager;

	public constructor(options: ClientOptions) {
		super(options);
		this.verificationManager = new VerificationManager();
		this.config = <Config>JSON.parse(readFileSync('./config.json', 'utf8'));
	}
}
