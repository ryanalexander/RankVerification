/* eslint-disable no-template-curly-in-string */
type Routes =
	| {
			method: 'GET';
			route: '/status';
			data: undefined;
			response: { status: boolean; notice?: string };
	  }
	| {
			method: 'GET';
			route: '/valorant/users/${sername}/${tagline}';
			data: { username: string; tagline: string };
			response: {
				success: boolean;
				data?: {
					puuid: string;
					username: string;
					tagline: string;
				}[];
			};
	  }
	| {
			method: 'GET';
			route: '/valorant/users/${puuid}/rank';
			data: { puuid: string };
			response: { success: boolean; data?: { puuid: string; rank: string } };
	  };

export interface ValorantUser {
	puuid: string;
	username: string;
	tagline: string;
}

export type RoutePath = Routes['route'];
export type RouteMethod = Routes['method'];

type ExcludeRouteKey<K> = K extends 'route' ? never : K;
type ExcludeRouteField<A> = { [K in ExcludeRouteKey<keyof A>]: A[K] };
type ExtractRouteParameters<A, T> = A extends { route: T } ? ExcludeRouteField<A> : never;

type ExcludeMethodKey<K> = K extends 'method' ? never : K;
type ExcludeMethodField<A> = { [K in ExcludeMethodKey<keyof A>]: A[K] };
type ExtractMethodParameters<A, T> = A extends { method: T } ? ExcludeMethodField<A> : never;

export type Route<M extends RouteMethod, T extends RoutePath> = ExtractMethodParameters<ExtractRouteParameters<Routes, T>, M>;
