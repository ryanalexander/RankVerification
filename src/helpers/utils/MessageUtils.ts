import type { Message, MessageOptions, TextChannel } from 'discord.js';

export function fetchImagesForMessage(message: Message): string[] {
	const attachments: string[] = [];

	const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];

	message.attachments
		.filter((attachment) => imageTypes.includes(attachment.contentType ?? 'unknown'))
		.forEach((attachment) => attachments.push(attachment.url));

	message.embeds
		.filter((embed) => embed.image && embed.image.url)
		.forEach((embed) => {
			attachments.push(embed.image!.url);
		});

	return attachments;
}

export function sendMessageWithTTL(payload: MessageOptions, channel: TextChannel, ttl: number): void {
	void channel.send(payload).then((message) => {
		setTimeout(() => {
			void message.delete();
		}, ttl);
	});
}
