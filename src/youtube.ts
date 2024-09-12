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
    private _items : PagedItemsIterator;

    constructor(yt : Api) {
        this._items = new PagedItemsIterator;
        this._yt = yt;
    }

    async *[Symbol.asyncIterator]() {
        for await (let item of this._items) {
            yield new Channel(item.snippet.title,
                              item.snippet.resourceId.channelId);
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

class PagedItemsIterator implements AsyncIterable<SubscriptionItem> {
    private _pager : AsyncIterable<RequestPage>
        = new DummyPagedRequestIterator;

    async *[Symbol.asyncIterator]() {
        for await (let page of (this._pager)) {
            for await (let item of page.items) {
                yield item;
            }
        }
    }
}

type RequestPage = {
    items: [any];
};

class DummyPagedRequestIterator implements AsyncIterable<RequestPage> {
    async *[Symbol.asyncIterator]() {
        for (let i = 0; i != 8; ++i) {
            yield await $.ajax(`./scratch/subs${i}.json`).catch((x) => {throw JSON.stringify(x)});
        }
    }
}

export class Channel {
    //private _yt : Api;
    public title : string;
    public id : string;
    constructor(/* yt : Api, */ title : string, id : string) {
        //this._yt = yt;
        this.title = title;
        this.id = id;
    }
}
