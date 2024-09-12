import $ from 'jquery';

const TESTING=1

export class Api {
    private _subs = new SubscriptionList(this);

    get subscriptions() {
        return this._subs;
    }
};

export class SubscriptionList implements AsyncIterable<Channel> {
    private _yt : Api;
    private _pager : AsyncIterable<RequestPage>
        = new DummyPagedRequestIterator;


    constructor(yt : Api) {
        this._yt = yt;
    }

    async *[Symbol.asyncIterator]() {
        for await (let page of (this._pager)) {
            for await (let item of (page.items as [SubscriptionItem])) {
                yield new Channel(this._yt, item);
            }
        }
    }

    getAsyncIter() {
        return this[Symbol.asyncIterator]();
    }
}

type SubscriptionItem = {
    snippet: {
        title: string;
        resourceId: {
            channelId: string;
        }
    };
};

type RequestPage = {
    items: [object];
};

class DummyPagedRequestIterator implements AsyncIterable<RequestPage> {
    async *[Symbol.asyncIterator]() {
        for (let i = 0; i != 8; ++i) {
            yield await $.ajax(`./scratch/subs${i}.json`).catch((x) => {throw JSON.stringify(x)});
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
