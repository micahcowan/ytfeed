import $ from 'jquery'

import { App } from './app'
import { Widget, WidgetArgs } from './widget'

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
        super(args);

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
