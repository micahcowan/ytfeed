export class Api {
    private _subs = new SubscriptionList(this);

    get subscriptions() {
        return this._subs;
    }
};

export class SubscriptionList implements AsyncIterable<Channel> {
    private _yt : Api;

    constructor(yt : Api) {
        this._yt = yt;
    }

    [Symbol.asyncIterator]() {
        return new SubscriptionListAsyncIter;
    }

    getAsyncIter() {
        return this[Symbol.asyncIterator]();
    }
}

export class SubscriptionListAsyncIter implements AsyncIterator<Channel>  {
    n : number = 0;
    next() : Promise<IteratorResult<Channel>> {
        return new Promise((resolve, reject) => {
            let n = ++this.n;
            //if (n == 4) { reject(); }
            setTimeout(() => { resolve({value: new Channel('title', n.toString()), done: (n == 10)}); }, Math.random() * 4000);
        });
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
