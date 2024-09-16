import $ from 'jquery';
import z from 'zod';

const TESTING=false

const lsSubsCache = 'ytfeed-subs-cache';
const lsSubsCacheDate = 'ytfeed-subs-cache-date';
const lsToken = 'ytfeed-acess-token';
const lsTokenExpire = 'ytfeed-acess-token-expire-ms';

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

export const SubscriptionItem = z.object({
    snippet: z.object({
        title: z.string(),
        resourceId: z.object({
            channelId: z.string()
        }),
    }),
});
export type SubscriptionItem = z.infer<typeof SubscriptionItem>;

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

    async _getToken() : Promise<string> {
        if (localStorage[lsToken] === undefined
                || Number(localStorage[lsTokenExpire]) <= Date.now()) {
            await this._refreshToken();
        }
        return localStorage[lsToken];
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
        console.log(`Url is: ${url}`);
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
            let ex =  new Exception(Error.parse(jqXHR.responseJSON));
            throw ex;
        }
    }

    async getRequest(args: RequestArgs) : Promise<object> {
        return this.doRequest('GET', args);
    }

    handleParams(p : Record<string, string>) {
        if ('access_token' in p) {
            console.log('Processing new access token!');
            localStorage[lsToken] = p.access_token;
            localStorage[lsTokenExpire] = Date.now() + (Number(p.expires_in) * 1000);
        }
    }
};

export class SubscriptionList implements AsyncIterable<Channel> {
    private _yt : Api;
    private _pager : AsyncIterable<RequestPage>;
    private _listeners : (() => void)[] = [];

    constructor(yt : Api) {
        this._yt = yt;
        this._pager = TESTING ?
            new DummyPagedRequestIterator
          : new PagedRequestIterator(yt);
    }

    async *[Symbol.asyncIterator]() {
        if (this.cached) {
            let cache = JSON.parse(localStorage[lsSubsCache]);
            for (let item of cache) {
                yield new Channel(this._yt, item);
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
        let date = Date.now();
        for await (let page of (this._pager)) {
            for await (let _item of page.items) {
                let item = SubscriptionItem.parse(_item);
                cache.push(item);
                yield new Channel(this._yt, item);
            }
        }
        localStorage[lsSubsCache] = JSON.stringify(cache);
        localStorage[lsSubsCacheDate] = date;
        this._fireUpdated();
    }

    invalidateCache() {
        delete localStorage[lsSubsCache];
        this._fireUpdated();
    }

    get cached() : boolean {
        return localStorage[lsSubsCache] !== undefined;
    }

    get cacheDate() : Date {
        return new Date(Number(localStorage[lsSubsCacheDate]));
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

class PagedRequestIterator implements AsyncIterable<RequestPage> {
    private _yt : Api;

    async *[Symbol.asyncIterator]() {
        let yt = this._yt;
        let nextPage : undefined | string;
        let params : any = {
            path: 'subscriptions',
            params: {
                mine: "true",
                part: "snippet",
                maxResults: "50",
            },
        };
        do {
            let response = await yt.getRequest(params);
            let parsed =  RequestPage.parse(response);
            yield parsed;
            nextPage = parsed.nextPageToken;
            params.params.pageToken = nextPage;
        } while (nextPage !== undefined);
    }

    constructor(yt : Api) {
        this._yt = yt;
    }
}

export class Channel {
    private _yt : Api;
    public title : string;
    public id : string;
    constructor(yt : Api, json : SubscriptionItem) {
        this._yt = yt;
        this.title = json.snippet.title;
        this.id = json.snippet.resourceId.channelId;
    }
}

export class Exception extends window.Error {
    ytError : Error;

    constructor(obj : Error) {
        let err = obj.error;
        super(`[${err.code}] ${err.status}: ${err.message}`);

        this.ytError = obj;
    }
}
