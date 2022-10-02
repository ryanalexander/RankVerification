import type VerifyClient from '#helpers/VerifyClient';
import { PrismaClient } from '@prisma/client';

export default class Database {
	public prisma: PrismaClient;

	public client: VerifyClient;

	public constructor(client: VerifyClient) {
		this.prisma = new PrismaClient({
			errorFormat: 'pretty'
		});

		this.client = client;
	}
}
