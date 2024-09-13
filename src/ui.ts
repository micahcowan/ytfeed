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

        let body = this.prependNewWidget();

        let ul = $('<ul />');
        ul.css('border', 'solid 2px red');
        body.append(ul);

        let loading = $('<li><em>loading...</en></li>');
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
            // Loading is finished
            loading.slideUp(() => { loading.remove(); });
            ul.animate({'border-color': 'rgb(255,0,0,0)' }, {duration: 1200});
        }

        // Include a count
        let p = $('<p/>');
        p.text(`There are ${$('li', ul).length} subscribed channels.`);
        p.insertBefore(ul);
    }

    private _handleError(err : object) {
        if (err instanceof YT.Exception) {
            console.error(err);
            this._addYoutubeError(err);
        }
    }

    private _addYoutubeError(x : YT.Exception) {
        let err = x.ytError.error;
        let html = $(`
            <div class="error-widget-header">YouTube API Error</div>
            <div class="yt-error-cs">
                <span class="yt-error-code">[${err.code}]</span>
                <span class="yt-error-status">${err.status}</span>
            </div>
            <div class="yt-error-message">${err.message}</div>
        `);
        let el = this.addError(html);
        el.addClass('yt-error');
        return el;
    }

    addError(msg : string | JQuery<HTMLElement>) : JQuery<HTMLElement> {
        let el = this.prependNewWidget(msg, this._errsElem);
        this._errsOuter.slideDown();
        return el;
    }

    prependNewWidget(contents : string | JQuery<HTMLElement> = '',
                 container = this._widgetsElem) : JQuery<HTMLElement> {
        let w = $('<div/>');
        w.addClass('widget');
        w.append(contents);
        w.hide();
        w.prependTo(container);
        w.slideDown();
        return w;
    }
}
