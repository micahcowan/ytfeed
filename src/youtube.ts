import $ from 'jquery';
import z from 'zod';

const TESTING=1

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
        status: z.string(),
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
    items: z.array(z.unknown()),
});
export type RequestPage = z.infer<typeof RequestPage>;


export class Api {
    private _subs = new SubscriptionList(this);

    get subscriptions() {
        return this._subs;
    }
};

export class SubscriptionList implements AsyncIterable<Channel> {
    private _yt : Api;
    private _pager : AsyncIterable<RequestPage>;

    constructor(yt : Api) {
        this._yt = yt;
        this._pager = TESTING ?
            new DummyPagedRequestIterator
          : new DummyPagedRequestIterator;
    }

    async *[Symbol.asyncIterator]() {
        for await (let page of (this._pager)) {
            for await (let _item of page.items) {
                let item = SubscriptionItem.parse(_item);
                yield new Channel(this._yt, item);
            }
        }
    }

    getAsyncIter() {
        return this[Symbol.asyncIterator]();
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
    ytHtml : any;

    constructor(obj : Error) {
        let err = obj.error;
        super(`[${err.code}] ${err.status}: ${err.message}`);

        this.ytError = obj;
    }
}
