import $ from 'jquery';
import 'jquery-color';
import * as YT from './youtube';
import "./main.sass";

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
            this.addError('Exception caught', err.message, JSON.stringify(err));
        }
        else if (typeof(err) === 'string') {
            console.error("Caught string: ${err}");
            this.addError('Exception caught (thrown string)', err);
        }
        else {
            console.error(err);
            this.addError('Exception caught', 'Exception of unknown type',
                          JSON.stringify(err));
        }
    }

    private _addYoutubeError(x : YT.Exception) {
        let err = x.ytError.error;
        let w = new YtErrorWidget(this, {
            title: 'YouTube API Error',
            message: err.message,
            ytCode: err.code,
            ytStatus: err.status,
            raw: JSON.stringify(x),
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
}

interface WidgetArgs {
    title?: string | JQuery<HTMLElement>,
    contents?: JQuery<HTMLElement>,
    closeable?: boolean,
}

export class Widget {
    protected _app : App;
    protected _ew : JQuery<HTMLElement>;
    protected _cb? : JQuery<HTMLElement>;
    protected _et : JQuery<HTMLElement>;
    protected _ec : JQuery<HTMLElement>;

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
        let ew = this._ew;
        ew.slideUp( () => ew.remove() );
    }

    constructor(app: App, args?: WidgetArgs) {
        this._app = app;
        this._ew = $('<div class="widget" />');
        let cbp = $('<div class="widget-close-button-parent" />').appendTo(this._ew);
        if (args === undefined ||args.closeable === undefined
            || args.closeable) {
            this._cb = $('<button class="widget-close-button">X</button>').appendTo(cbp);
            this._cb.click( () => this.close() );
        }
        this._et = $('<div class="widget-header" />').appendTo(this._ew);
        this._ec = $('<div class="widget-contents" />').appendTo(this._ew);

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
    protected _subs? : SubscriptionsWidget;

    constructor(app: App, args?: WidgetArgs) {
        super(app, { closeable: false });
        this.setTitle('Main');

        $('<button>View Subscriptions</button>').appendTo(this._ec).click(
            () => {
                this._subs = new SubscriptionsWidget(app);
                app.insertAfterWidget(this._subs, this.element);
            }
        );
    }
}

export class SubscriptionsWidget extends Widget {
    constructor(app: App) {
        super(app);
        this.setTitle('Subscriptions');

        this._asyncDoSubscriptions().catch(this.errorHandler);
    }

    private async _asyncDoSubscriptions() {
        let tube = this._app.ytApi;
        let w = this._ew;

        let ul = $('<ul class="subscriptions"/>');
        ul.css('border', 'solid 2px red');
        w.append(ul);

        let loading = $('<li><span class="loading">loading...</span></li>');
        ul.append(loading);

        for await (let chan of tube.subscriptions) {
            let li = $('<li />');
            let t = $('<span class="subs-title" />');
            t.text(chan.title);
            t.appendTo(li);
            let id = $('<span class="subs-id" />');
            id.text(chan.id);
            id.appendTo(li);
            li.hide();
            li.insertBefore(loading);
            li.slideDown('fast');
        }

        // Loading is finished
        ul.animate({'border-color': 'rgb(255,0,0,0)' }, {duration: 1200});
        loading.slideUp(() => {
            loading.remove();

            // Include a count
            let p = $('<p/>');
            p.text(`There are ${$('li', ul).length} subscribed channels.`);
            p.insertBefore(ul);
        });
    }
}

interface ErrorWidgetArgs extends WidgetArgs {
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

interface YtErrorWidgetArgs extends ErrorWidgetArgs {
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
