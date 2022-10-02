import Axios, { AxiosInstance } from 'axios';
import type { Route, RouteMethod, RoutePath } from './api/routes';

export default class sws {
	private api_key: string;

	private Axios: AxiosInstance;

	public constructor(key: string) {
		this.api_key = key;

		this.Axios = Axios.create({ baseURL: 'https://services.stelch.net/v1' });

		if (this.api_key && this.api_key.length > 16) this.Axios.defaults.headers.common['Authorization'] = `Bearer ${this.api_key}`;
	}

	// Methods: Endpoints (Valorant Basic, Vision Basic)

	private req<M extends RouteMethod, T extends RoutePath>(method: M, url: T, opts?: any): Promise<Route<M, T>['response']>;

	private req<M extends RouteMethod, T extends RoutePath>(
		method: M,
		url: T,
		data: Route<M, T>['data'],
		opts?: any
	): Promise<Route<M, T>['response']>;

	private async req<M extends RouteMethod, T extends RoutePath>(
		method: M,
		url: T,
		data?: Route<M, T>['data'],
		opts?: any
	): Promise<Route<M, T>['response']> {
		const res = await this.Axios.request({
			method,
			data,
			url,
			...opts
		});

		return res.data;
	}
}
