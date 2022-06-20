export interface GuildConfig {
	id: string;
	verify_target: string;
	verify_queue: string;
	verify_log: string;
	verify_log_public: string;

	quickdeny: QuickDenyResponse[];
	ranknames: string[];
	rankcap: number;
}

export interface QuickDenyResponse {
	id: string;
	name: string;
	reply: string;
}

export interface Config {
	guilds: GuildConfig[];
}

export default Config;
