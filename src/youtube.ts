import $ from 'jquery';
import { z, ZodError } from 'zod';

import LS from './lstor'

const TESTING=false

//-------------------- ZOD types --------------------
export const Suberror = z.object({
    message: z.string(),
    domain: z.string(),
    reason: z.string(),
});
export type Suberror = z.infer<typeof Suberror>;

export const Error = z.object({
    error: z.object({
        code: z.number(),
        message: z.string(),
        status: z.optional( z.string() ),
        errors: z.array( Suberror ),
    }),
});
export type Error = z.infer<typeof Error>;
export type YtError = z.infer<typeof Error>;

export const PlaylistItem = z.object({
    snippet: z.object({
        title: z.string(),
        videoOwnerChannelTitle: z.optional(z.string()),
        /*
        thumbnails: z.object({
            default: z.object({
                url: z.string(),
                width: z.number(),
                height: z.number(),
            }),
        }),
        */
        resourceId: z.object({
            videoId: z.string(),
        }),
    }),
    contentDetails: z.object({
        videoId: z.string(),
        videoPublishedAt: z.optional(z.string().datetime()),
    }),
});
export type PlaylistItem = z.infer<typeof PlaylistItem>;

export const RequestPage = z.object({
    nextPageToken: z.optional( z.string() ),
    items: z.array(z.unknown()),
});
export type RequestPage = z.infer<typeof RequestPage>;

//
type HttpMethod = 'GET' | 'POST' | 'PUT';
interface RequestArgs {
    path: string,
    params: Record<string, string>;
}

//

function encodeParams(params: Record<string, string>) : string {
    let uri = '';
    for (let key in params) {
        if (uri != '') {
            uri += '&';
        }
        let item = params[key];
        uri += `${encodeURIComponent(key)}=${encodeURIComponent(item)}`;
    }
    return uri;
}


//-------------------- Class defs --------------------
export class Api {
    private _subs = new SubscriptionList(this);
    basePath = 'https://youtube.googleapis.com/youtube/v3';
    errorHandler? : (ev : any) => void;

    get subscriptions() {
        return this._subs;
    }

    getPlaylistItems(id : string) : AsyncIterable<PlaylistItem> {
        return new PlaylistItemList(this, id);
    }

    getChannels(ids : string[]) : AsyncIterable<Channel> {
        return new ChannelsList(this, ids);
    }

    async _getToken() : Promise<string> {
        if (LS.token === undefined || LS.tokenExpired) {
            await this._refreshToken();
        }
        return LS.token;
    }

    async _refreshToken() {
        let secret = await $.ajax('./scratch/client-secret.json');
        let params : Record<string, string> = {
            client_id: secret.web.client_id,
            redirect_uri: location.origin + location.pathname,
            response_type: "token",
            scope: 'https://www.googleapis.com/auth/youtube',
            // FIXME: use the state param to avoid redirect attacks!
        };

        // Encode the params
        let uri = encodeParams(params);
        uri = 'https://accounts.google.com/o/oauth2/v2/auth?' + uri;
        window.location.href = uri; // REDIRECT!
    }

    async doRequest(method : HttpMethod, args: RequestArgs)
            : Promise<object> {
        let token = await this._getToken();

        let url = `${this.basePath}/${args.path}?${encodeParams(args.params)}`
        let requestPromise = $.ajax({
            url: url,
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        try {
            return await requestPromise;
        } catch(jqXHR : any) {
            let parsed = Error.safeParse(jqXHR.responseJSON);
            //let parsed : any = Error.safeParse(jqXHR.responseJSON);
            if (parsed.success === false) {
                throw jqXHR; // dunno what it was: rethrow
            }
            else {
                // Must be a YouTube error
                // Is it an authentication problem?
                if (parsed.data.error.code == 401) {
                    await this._refreshToken();
                    // Never returns!
                }

                // Other unknown YouTube error, so rethrow it as
                // our special YouTube Exception class
                let ex =  new Exception(Error.parse(jqXHR.responseJSON));
                throw ex;
            }
        }
    }

    async getRequest(args: RequestArgs) : Promise<object> {
        return this.doRequest('GET', args);
    }

    handleParams(p : Record<string, string>) {
        if ('access_token' in p) {
            console.log('Processing new access token!');
            LS.token = p.access_token;
            LS.tokenExpiresIn_s = p.expires_in;
        }
    }
};

export class ChannelsList implements AsyncIterable<Channel> {
    protected _yt : Api;
    private _ids : string[];

    async *[Symbol.asyncIterator]() {
        let ids = this._ids;
        while (ids.length > 0) {
            let batch = ids.splice(0, 50);
            let pager = new PagedRequestIterator(this._yt, {
                path: 'channels',
                params: {
                    id: batch.join(),
                    part: 'snippet,contentDetails',
                    maxResults: '50',
                }
            });

            for await (let page of pager) {
                for await (let item of page.items) {
                    try {
                        yield Channel.parse(item);
                    }
                    catch (err) {
                        console.error(item);
                        throw (err);
                    }
                }
            }
        }
    }

    constructor(yt : Api, ids : string[]) {
        this._yt = yt;
        this._ids = ids;
    }
}

export class PlaylistItemList implements AsyncIterable<PlaylistItem> {
    protected _yt : Api;
    protected _binName : string;
    protected _pager : AsyncIterable<RequestPage>;

    async *[Symbol.asyncIterator]() {
        for await (let page of this._pager) {
            for await (let _item of page.items) {
                let item = PlaylistItem.parse(_item);
                yield item;
            }
        }
    }

    constructor(yt : Api, bin : string) {
        this._yt = yt;
        this._binName = bin;
        this._pager = new PagedRequestIterator(yt, {
            path: 'playlistItems',
            params: {
                playlistId: bin,
                part: 'snippet,contentDetails',
                maxResults: '50',
            }
        });
    }
}

export class SubscriptionList implements AsyncIterable<SubscriptionItem> {
    private _yt : Api;
    private _pager : AsyncIterable<RequestPage>;
    private _listeners : (() => void)[] = [];

    constructor(yt : Api) {
        this._yt = yt;
        this._pager = TESTING ?
            new DummyPagedRequestIterator
          : new PagedRequestIterator(yt, {
                path: 'subscriptions',
                params: {
                    mine: "true",
                    part: "snippet",
                    maxResults: "50",
                }});
    }

    async *[Symbol.asyncIterator]() {
        if (this.cached) {
            let cache = LS.subsCache;
            for (let item of cache) {
                yield SubscriptionItem.parse(item);
            }
        }
        else {
            return this.getAsyncUpdatedIterator();
        }
    }

    private _fireUpdated() {
        for (let li of this._listeners) {
            li();
        }
    }

    addEventListener(kind : 'cacheUpdated', handler : () => void) {
        this._listeners.push(handler);
    }

    getAsyncIter() {
        return this[Symbol.asyncIterator]();
    }

    async *getAsyncUpdatedIterator() {
        let cache = [];
        let date = new Date();
        for await (let page of (this._pager)) {
            for await (let _item of page.items) {
                let item = SubscriptionItem.parse(_item);
                cache.push(item);
                yield item;
            }
        }
        LS.subsCache = cache;
        LS.subsCacheDate = date;
        this._fireUpdated();
    }

    invalidateCache() {
        LS.subsCache = [];
        this._fireUpdated();
    }

    get cached() : boolean {
        return LS.subsCache.length != 0;
    }

    get cacheDate() : Date {
        return LS.subsCacheDate;
    }
}

class DummyPagedRequestIterator implements AsyncIterable<RequestPage> {
    async *[Symbol.asyncIterator]() {
        for (let i = 0; i != 8; ++i) {
            let _p = await $.ajax(`./scratch/subs${i}.json`)
                       .catch((x) => {throw JSON.stringify(x)});
            yield RequestPage.parse(_p);
        }
    }
}

export class PagedRequestIterator implements AsyncIterable<RequestPage> {
    protected _yt : Api;
    protected _params : any;

    async *[Symbol.asyncIterator]() {
        let yt = this._yt;
        let nextPage : undefined | string;
        let params : any = {};
        $.extend(true, params, this._params);
        do {
            let response = await yt.getRequest(params);
            let parsed =  RequestPage.parse(response);
            yield parsed;
            nextPage = parsed.nextPageToken;
            params.params.pageToken = nextPage;
        } while (nextPage !== undefined);
    }

    constructor(yt : Api, params : any) {
        this._yt = yt;
        this._params = params;
    }
}

export const Channel = z.object({
    id: z.string(),
    snippet: z.object({
        title: z.string(),
    }),
    contentDetails: z.object({
        relatedPlaylists: z.object({
            uploads: z.string(),
        }),
    }),
});
export type Channel = z.infer<typeof Channel>;

export const SubscriptionItem = z.object({
    snippet: z.object({
        title: z.string(),
        resourceId: z.object({
            channelId: z.string(),
        }),
    }),
});
export type SubscriptionItem = z.infer<typeof SubscriptionItem>;

export class Exception extends window.Error {
    ytError : Error;

    constructor(obj : Error) {
        let err = obj.error;
        super(`[${err.code}] ${err.status}: ${err.message}`);

        this.ytError = obj;
    }
}
