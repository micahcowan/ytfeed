import $ from 'jquery';
import z from 'zod';
import 'jquery-color';

import * as YT from './youtube';
import "./main.sass";

const lsBins = 'ytfeed-bins';

export default class App {
    ytApi : YT.Api;
    protected _bodyElem: JQuery<HTMLElement>;
    protected _errsOuter: JQuery<HTMLElement>;
    protected _errsElem: JQuery<HTMLElement>;
    protected _widgetsElem: JQuery<HTMLElement>;
    protected _params : any;

    constructor(body : JQuery<HTMLElement>, yt : YT.Api) {
        this._bodyElem = body;
        this.ytApi = yt;

        yt.errorHandler = (ev) => this.handleError(ev);

        $('<h1>YouTube Feed App</h1>').appendTo(body);

        let errs = this._errsOuter = $('<div id="errors-container"/>');
        errs.appendTo(this._bodyElem);
        errs.html('<div id="errors-container-title">Errors</div>');
        this._errsElem = $('<div id="errors-container-inner"/>')
            .appendTo(errs);

        let w = this._widgetsElem = $('<div id="widgets-container"/>');
        w.appendTo(this._bodyElem);
    }

    // Parse query string to see if page request is coming from OAuth 2.0 server.
    protected _getParams() : any {
        let fragmentString = location.hash.substring(1);
        let params : any = {};
        let regex = /([^&=]+)=([^&]*)/g;
        let m;
        while (m = regex.exec(fragmentString)) {
            params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
        }
        return params;
    }

    run() {
        let p = this._params = this._getParams();
        if (p.error !== undefined) {
            this.addError('YouTube Callback Error', p.error);
        }
        this.ytApi.handleParams(p);
        // Now remove the params from user view
        if (location.hash.length > 1) {
            console.log("Removing URL hash!");
            console.log(`Original URL: ${location.href}`);
            location.hash = '#';
        }

        this.prependWidget(new MainWidget(this));
    }

    handleError(err : any) {
        if (err instanceof YT.Exception) {
            console.error(err);
            this._addYoutubeError(err);
            //throw err;
        }
        else if (err instanceof window.Error) {
            console.error(err);
            this.addError('Exception caught', err.message, JSON.stringify(err,null,2));
        }
        else if (typeof(err) === 'string') {
            console.error("Caught string: ${err}");
            this.addError('Exception caught (thrown string)', err);
        }
        else {
            console.error(err);
            this.addError('Exception caught', 'Exception of unknown type',
                          JSON.stringify(err,null,2));
        }
    }

    private _addYoutubeError(x : YT.Exception) {
        let err = x.ytError.error;
        let w = new YtErrorWidget(this, {
            title: 'YouTube API Error',
            message: err.message,
            ytCode: err.code,
            ytStatus: (err.status !== undefined)? err.status : '',
            raw: JSON.stringify(x, null, 2),
        });
        this.prependWidget(w);
    }

    addError(title : string | JQuery<HTMLElement>,
             msg : string = '', raw? : string) {
        let wArgs : ErrorWidgetArgs = {title: title, message: msg};
        if (raw !== undefined) wArgs.raw = raw;
        let w = new ErrorWidget(this, wArgs);
        let el = this.prependWidget(w);
        return el;
    }

    prependWidget(w : Widget, parent?: JQuery<HTMLElement>) {
        this._insertWidget('prependTo', w, parent);
    }

    appendWidget(w : Widget, parent?: JQuery<HTMLElement>) {
        this._insertWidget('appendTo', w, parent);
    }

    insertAfterWidget(w : Widget, target?: JQuery<HTMLElement>) {
        this._insertWidget('insertAfter', w, target);
    }

    _insertWidget(op : 'prependTo' | 'appendTo' | 'insertAfter', w : Widget, parent?: JQuery<HTMLElement>) {
        if (parent !== undefined) {
            // Already defined
        }
        else if (w instanceof ErrorWidget) {
            parent = this._errsElem;
            this._errsOuter.slideDown(); // unhide errors area
        }
        else {
            parent = this._widgetsElem;
        }

        let el = w.element;
        el.hide();
        el[op](parent);
        el.slideDown();
    }

    getAssignedBins() : BinAssignments {
        // Process user-provided bins assignments, which are organized
        // by bin, to produce an organization by channel, eached
        // mapped to an object whose keys are bin ids.
        let val : BinAssignments = {};
        let ls = localStorage[lsBins];
        if (ls === undefined)
            return val;
        let bins = BinsStruct.parse(JSON.parse(ls));
        for (let binName in bins.bins) {
            let bin = bins.bins[binName];
            for (let chanKey in bin) {
                let chan = bin[chanKey];
                if (!(chan.id in val)) {
                    val[chan.id] = {
                        name: chan.name,
                        bins: new Set<string>
                    }
                }
                val[chan.id].bins.add(binName);
            }
        }
        return val;
    }
}

const BinsStruct = z.object({
    "pl-names": z.record(z.string(), z.string()),
    "bins": z.record(
        z.string(),
        z.array(
            z.object({
                'id': z.string(),
                'name': z.string(),
            })
        ),
    ),
});
type BinsStruct = z.infer<typeof BinsStruct>;

type BinAssignments = Record<string, {
    name: string,
    bins: Set<string>
}>;

export interface WidgetArgs {
    title?: string | JQuery<HTMLElement>,
    contents?: JQuery<HTMLElement>,
    closeable?: boolean,
}

export class WidgetCloseEvent {
    /*
    // No! Don't make it cancellable, bc
    // then people would handle the "removal" with cleanup,
    // and then the removal gets cancelled afterwards? Can't work.

    //protected targetWidget
    protected preventDefault : () => void;

    get cancellable() {
        return true;
    }

    constructor(prevDfltHandler : () => void) {
        this.preventDefault = prevDfltHandler;
    }
    */
}

export class Widget {
    protected _app : App;
    protected _ew : JQuery<HTMLElement>;
    protected _cb? : JQuery<HTMLElement>;
    protected _sum : JQuery<HTMLElement>;
    protected _et : JQuery<HTMLElement>;
    protected _ec : JQuery<HTMLElement>;
    private _evListeners : ( (ev? : WidgetCloseEvent) => void )[] = [];

    get element() : JQuery<HTMLElement> {
        return this._ew;
    }

    get title() : JQuery<HTMLElement> {
        return this._et;
    };
    setTitle(title: string | JQuery<HTMLElement>) {
        this._et.empty();
        if (typeof title == "string") {
            this._et.text(title);
        }
        else {
            this._et.append(title);
        }
    }

    get contents() : JQuery<HTMLElement> {
        return this._ec;
    };
    setContents(contents: JQuery<HTMLElement>) {
        this._ec.empty();
        this._ec.append(contents);
    }

    close() {
        /*
        let cancelled = false;
        let fn = () => { cancelled = true; }
        ...
        if (cacnelled) return;
        */

        let ew = this._ew;
        let listeners = this._evListeners;
        let ev = new WidgetCloseEvent(/*fn*/);
        ew.slideUp(() => {
            ew.remove();
            for (let listener of listeners) {
                listener(ev);
            }
        });
    }

    addEventListener(evType: 'close',
                     handler: (ev? : WidgetCloseEvent) => void) {
        this._evListeners.push(handler);
    }

    makeSingleSpawner(button : JQuery<HTMLElement>,
                      makeFn : () => Widget) {
        let listener = () => {
            button.removeAttr('disabled');
        };
        button.click(
            () => {
                button.attr('disabled','disabled');
                let subW = makeFn();
                this._app.insertAfterWidget(subW, this.element);
                subW.addEventListener('close', listener);
            }
        );
    }

    constructor(app: App, args?: WidgetArgs) {
        this._app = app;
        this._ew = $('<div class="widget" />');
        let dt = $('<details open="open"></details>').appendTo(this._ew);
        this._sum = $('<summary class="widget-top"></summary>').appendTo(dt);
        let whp = $('<div class="widget-heading-parent"></div>').appendTo(this._sum);
        this._et = $('<span class="widget-heading"></span>').appendTo(whp);
        //let cbp = $('<div class="widget-close-button-parent" />').appendTo(this._ew);
        if (args === undefined ||args.closeable === undefined
            || args.closeable) {
            this._cb = $('<button class="widget-close-button">X</button>').appendTo(whp);
            this._cb.click( () => this.close() );
        }
        this._ec = $('<div class="widget-contents" />').appendTo(dt);

        if (args !== undefined) {
            let { title, contents} = args;

            if (title !== undefined) this.setTitle(title);
            if (contents !== undefined) this.setContents(contents);
        }
    }

    // Generate an error handling function, suitable as an argument to
    //  a Promise's .catch()
    protected get errorHandler() {
        let app = this._app;
        return (err : any) => app.handleError(err);
    };
}


export class MainWidget extends Widget {
    private _cacheP : JQuery<HTMLElement>;

    constructor(app: App, args?: WidgetArgs) {
        super(app, { closeable: false });
        this.setTitle('Main');

        this._cacheP = $('<div></div>');

        this._doSubsCache();
        this._doSubsView();
    }

    _doSubsCache() {
        let ec = this._ec;
        let tube = this._app.ytApi;

        $('<div class="widget-section-heading">Cached data</div>').appendTo(ec);
        let p = this._cacheP;
        p.appendTo(ec);

        let inv = $('<button>Delete Cache</button>').appendTo(ec)
            .click(() => { tube.subscriptions.invalidateCache(); });

        this._cacheUpdated();
        tube.subscriptions.addEventListener(
            'cacheUpdated',
            () => { this._cacheUpdated(); },
        )

        let bins = $('<button>Edit Subscription Bins (JSON)</button>')
            .appendTo(this._ec);
        this.makeSingleSpawner(bins, () => new BinsWidget(this._app));
    }

    _cacheUpdated() {
        let p = this._cacheP;
        let tube = this._app.ytApi;

        if (tube.subscriptions.cached) {
            p.text('Subscriptions data was cached on '
                   + tube.subscriptions.cacheDate);
        }
        else {
            p.text('Subscriptions data is NOT cached.')
        }
    }

    _doSubsView() {
        let app = this._app;
        let button = $('<button>View Subscriptions</button>')
            .appendTo(this._ec);
        this.makeSingleSpawner(button, () => new SubscriptionsWidget(app));

        let update = $('<button>View Subscriptions (Updated)</button>')
            .appendTo(this._ec);
        this.makeSingleSpawner(update, () => new SubscriptionsWidget(app, 'update'));
    }
}

export class SubscriptionsWidget extends Widget {
    _update : boolean;

    constructor(app: App, update? : 'update') {
        super(app);
        this.setTitle('Subscriptions');
        this._update = update === 'update';

        this._asyncDoSubscriptions().catch(this.errorHandler);
    }

    private async _asyncDoSubscriptions() {
        let tube = this._app.ytApi;
        let w = this._ec;

        let loading = $('<div class="loading">loading...</div>');
        w.append(loading);

        let x;
        x = $('<details open="open"><summary>UNKNOWN subscriptions</summary></details>')
            .appendTo(w);
        let unkSubsUl = $('<ul class="subscriptions"/>').appendTo(x);
        x = $('<details open="open"><summary>IGNORED subscriptions</summary></details>')
            .appendTo(w);
        let ignSubsUl = $('<ul class="subscriptions"/>').appendTo(x);
        x = $('<details><summary>ALL subscriptions</summary></details>')
            .appendTo(w);
        let allSubsUl = $('<ul class="subscriptions"/>').appendTo(x);

        let assign = this._app.getAssignedBins();
        let iter : AsyncIterable<YT.Channel> = tube.subscriptions;
        if (this._update) {
            iter = tube.subscriptions.getAsyncUpdatedIterator();
        }
        for await (let chan of iter) {
            let li = $('<li />');
            let t = $('<span class="subs-title" />');
            t.text(chan.title);
            t.appendTo(li);
            let id = $('<span class="subs-id" />');
            id.text(chan.id);
            id.appendTo(li);
            li.hide();
            li.appendTo(allSubsUl);
            li.slideDown('fast');

            let a = assign[chan.id];
            if (a === undefined) {
                li.clone().appendTo(unkSubsUl);
            }
            else if (a.bins.has('IGNORE')) {
                li.clone().appendTo(ignSubsUl);
            }
        }

        // Loading is finished
        // Include a count
        let p = $('<p/>');
        p.text(`There are ${$('li', allSubsUl).length} subscribed channels:
               ${$('li', unkSubsUl).length} unknown, and ${$('li', ignSubsUl).length} ignored.`);
        p.insertBefore(loading);

        loading.remove();
    }
}

export class BinsWidget extends Widget {
    _ta : JQuery<HTMLElement>;
    _btn : JQuery<HTMLElement>;

    constructor(app: App, args?: WidgetArgs) {
        super(app, args);
        this.setTitle('Bins');

        let ec = this._ec;
        let ta = this._ta = $('<textarea></textarea>').appendTo(ec);
        if (localStorage[lsBins] !== undefined) {
            ta.val(localStorage[lsBins]);
        }
        let btn = this._btn = $('<button>Update</button>').appendTo(ec)
            .click( () => {
                let val = ta.val();
                if (val === undefined) {
                    val = ''
                } else if (typeof val !== 'string') {
                    val = val.toString();
                }
                try {
                    let json = JSON.stringify(JSON.parse(val),null,2);
                    localStorage[lsBins] = json;
                }
                catch(err : any) {
                    err.message += `\nJSON: ${val}`;
                    this.errorHandler(err);
                }
            });
    }
}

export interface ErrorWidgetArgs extends WidgetArgs {
    message: string,
    raw?: string
}

export class ErrorWidget extends Widget {
    protected _msgEl : JQuery<HTMLElement>;
    protected _rawEl : JQuery<HTMLElement>;

    get message() {
        return this._msgEl.text();
    }
    set message(m : string) {
        this._msgEl.text(m);
    }

    get raw() {
        return this._rawEl.text();
    }
    set raw(r : string) {
        this._rawEl.text(r);
    }

    constructor(app: App, args: ErrorWidgetArgs) {
        super(app, args);

        this._ew.addClass('error-widget');
        this._msgEl = $('<div class="error-message" />').prependTo(this._ec);
        this._rawEl = $('<pre/>').appendTo(this._ec);

        // Set up additonal elements under contents (_ec)
        this.message = args.message;
        if (args.raw !== undefined) this.raw = args.raw;
    }
}

export interface YtErrorWidgetArgs extends ErrorWidgetArgs {
    ytCode: number;
    ytStatus: string;
}

export class YtErrorWidget extends ErrorWidget {
    protected _ecs : JQuery<HTMLElement>;
    protected _eCodeElem : JQuery<HTMLElement>;
    protected _eStatElem : JQuery<HTMLElement>;
    protected _code : number = 0;

    get ytCode() {
        return this._code;
    }
    set ytCode(code : number) {
        this._code = code;
        this._eCodeElem.text('[' + code + ']');
    }

    get ytStatus() {
        return this._eStatElem.text();
    }
    set ytStatus(status : string) {

        this._eStatElem.text(status);
    }

    constructor(app: App, args: YtErrorWidgetArgs) {
        super(app, args);

        this._ew.addClass('yt-error-widget');

        this._ecs = $('<div class="yt-error-cs" />').prependTo(this._ec);
        this._eCodeElem = $('<span class="yt-error-code" />')
            .appendTo(this._ecs);
        this.ytCode = args.ytCode;
        this._eStatElem = $('<span class="yt-error-status" />')
            .appendTo(this._ecs);
        this.ytStatus = args.ytStatus;
    }
}
