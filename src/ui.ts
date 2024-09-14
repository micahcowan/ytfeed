import $ from 'jquery';
import 'jquery-color';
import * as YT from './youtube';
import "./main.sass";

export default class App {
    private _yt : YT.Api;
    private _bodyElem: JQuery<HTMLElement>;
    private _errsOuter: JQuery<HTMLElement>;
    private _errsElem: JQuery<HTMLElement>;
    private _widgetsElem: JQuery<HTMLElement>;

    constructor(body : JQuery<HTMLElement>, yt : YT.Api) {
        this._bodyElem = body;
        this._yt = yt;

        let errs = this._errsOuter = $('<div id="errors-container"/>');
        errs.prependTo(this._bodyElem);
        errs.html('<div id="errors-container-title">Errors</div>');
        this._errsElem = $('<div id="errors-container-inner"/>')
            .appendTo(errs);

        let w = this._widgetsElem = $('<div id="widgets-container"/>');
        w.appendTo(this._bodyElem);
    }

    run() {
        this._run().catch((err) => this._handleError(err));
    }

    private async _run() {
        let tube = this._yt;

        let widget = new Widget(this, { title: 'Subscriptions' });
        this.prependWidget(widget);
        let w = widget.element;

        let ul = $('<ul />');
        ul.css('border', 'solid 2px red');
        w.append(ul);

        let loading = $('<li><span class="loading">loading...</span></li>');
        ul.append(loading);

        try {
            for await (let chan of tube.subscriptions) {
                let li = $('<li />');
                li.text(`${chan.title} (${chan.id})`);
                li.hide();
                li.insertBefore(loading);
                li.slideDown('fast');
            }
        }
        finally {
        }
        // Loading is finished
        loading.slideUp(() => { loading.remove(); });
        ul.animate({'border-color': 'rgb(255,0,0,0)' }, {duration: 1200});

        // Include a count
        let p = $('<p/>');
        p.text(`There are ${$('li', ul).length} subscribed channels.`);
        p.insertBefore(ul);
    }

    private _handleError(err : object) {
        if (err instanceof YT.Exception) {
            console.error(err);
            this._addYoutubeError(err);
            //throw err;
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
             msg : string = '') {
        let w = new ErrorWidget(this, {title: title, message: msg});
        let el = this.prependWidget(w);
        return el;
    }

    prependWidget(w : Widget, parent?: JQuery<HTMLElement>) {
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
        el.prependTo(parent);
        el.slideDown();
    }
}

interface WidgetArgs {
    title?: string | JQuery<HTMLElement>,
    contents?: JQuery<HTMLElement>
}

export class Widget {
    protected _ew : JQuery<HTMLElement>;
    protected _et : JQuery<HTMLElement>;
    protected _ec : JQuery<HTMLElement>;

    get element() : JQuery<HTMLElement> {
        return this._ew;
    }

    get title() : JQuery<HTMLElement> {
        return this._et;
    };
    setTitle(title: string | JQuery<HTMLElement>) {
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
        this._ec.append(contents);
    }

    constructor(app: App, args?: WidgetArgs) {
        this._ew = $('<div class="widget" />');
        this._et = $('<div class="widget-header" />').appendTo(this._ew);
        this._ec = $('<div class="widget-contents" />').appendTo(this._ew);

        if (args !== undefined) {
            let { title, contents} = args;

            if (title !== undefined) this.setTitle(title);
            if (contents !== undefined) this.setContents(contents);
        }
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
