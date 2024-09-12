import $ from 'jquery';

export class Api {
    private _subs = new SubscriptionList(this);

    get subscriptions() {
        return this._subs;
    }
};

export class SubscriptionList implements AsyncIterable<Channel> {
    private _yt : Api;
    private _pager : PagedIterator;

    constructor(yt : Api) {
        this._pager = new PagedIterator;
        this._yt = yt;
    }

    async *[Symbol.asyncIterator]() {
        for await (let item of this._pager) {
            yield new Channel(item.snippet.title,
                              item.snippet.resourceId.channelId);
        }
    }

    getAsyncIter() {
        return this[Symbol.asyncIterator]();
    }
}

class PagedIterator {
    private n = 0;
    json? : any;
    next_page? : string;

    async *[Symbol.asyncIterator]() {
        while (this.n != 8) {
            this.json = await $.ajax(`./scratch/subs${this.n}.json`).catch((x) => {throw JSON.stringify(x)});

            for await (let item of this.json.items) {
                yield item;
            }
            ++this.n;
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
