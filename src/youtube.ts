import $ from 'jquery';
import z from 'zod';

const TESTING=1

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

const SubscriptionItem = z.object({
    snippet: z.object({
        title: z.string(),
        resourceId: z.object({
            channelId: z.string()
        }),
    }),
});

type SubscriptionItem = z.infer<typeof SubscriptionItem>;

const RequestPage = z.object({
    items: z.array(z.unknown()),
});

type RequestPage = z.infer<typeof RequestPage>;

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
