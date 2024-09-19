import $ from 'jquery';
import z from 'zod';
import 'jquery-color';

import LS from './lstor';
import * as YT from './youtube';
import "./main.sass";

import { Widget, WidgetArgs } from './widget'
import { AppWidget } from './w-app'
import { MainWidget } from './w-main'
import { ErrorWidget, YtErrorWidget, ErrorWidgetArgs } from './w-error'

type BinAssignments = Record<string, {
    name: string,
    bins: Set<string>
}>;

export const VidsToAddRec = z.object({
    present: z.optional( z.boolean() ),
    vidId: z.string(),
    vidName: z.string(),
    chanId: z.string(),
    chanName: z.string(),
    destBins: z.array( z.string() ).transform((val) => new Set<string>(val)),
});
export type VidsToAddRec = z.infer<typeof VidsToAddRec>;

export const VidsToAdd =
    z.record( z.string(), z.array( VidsToAddRec ));
export type VidsToAdd = z.infer<typeof VidsToAdd>;

export function mergeVidToAdd(v : VidsToAdd, dateStr : string, vid : VidsToAddRec) {
    if (!(dateStr in v)) {
        v[dateStr] = [];
    }
    v[dateStr].push(vid);
}

export function removeVidToAdd(v : VidsToAdd, dateStr : string, vid : VidsToAddRec) {
    let vids = v[dateStr];
    if (vids === undefined) {
        return; // nothing to remove
    }
    for (let i = 0; i != vids.length; ++i) {
        if (vids[i].vidId === vid.vidId) {
            vids.splice(i, 1); // remove
            if (vids.length == 0) {
                delete v[dateStr];
            }
            break;
        }
    }
}

export type VtaFilter = (v : VidsToAddRec) => boolean;
export function countVidsToAdd(v : VidsToAdd, filter: VtaFilter = (x) => true) {
    let c = 0;
    for (let ds in v) {
        for (let vid of v[ds]) {
            if (filter(vid))
                ++c;
        }
    }
    return c;
}

export const BinsStruct = z.object({
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
export type BinsStruct = z.infer<typeof BinsStruct>;

export class App {
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
        let bins = LS.bins;
        if (bins === undefined)
            return val;
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
