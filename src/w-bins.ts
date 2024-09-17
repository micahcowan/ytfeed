import $ from 'jquery'
import { z } from 'zod';

import { App, BinsStruct } from './app'
import { WidgetArgs } from './widget'
import { AppWidget } from './w-app'
import LS from './lstor'
import * as YT from './youtube'

export class BinsEditWidget extends AppWidget {
    _ta : JQuery<HTMLElement>;
    _btn : JQuery<HTMLElement>;

    constructor(app: App, args?: WidgetArgs) {
        super(app, args);
        this.setTitle('Edit Bins (JSON)');

        let ec = this._ec;
        let ta = this._ta = $('<textarea></textarea>').appendTo(ec);
        let bins = LS.bins_json;
        if (bins !== undefined) {
            ta.val(bins);
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
                    let json = val;
                    LS.bins = BinsStruct.parse(JSON.parse(json));
                }
                catch(err : any) {
                    console.error(`Error while parsing Bins JSON: ${val}`);
                    this.errorHandler(err);
                }
            });
    }
}

type JQE = JQuery<HTMLElement>;
export class BinsViewWidget extends AppWidget {
    _binEls : Record<string, {count: JQE, ul: JQE, summ: JQE }> = {};
    _binNames : Record<string, string>;

    constructor(app: App, args?: WidgetArgs) {
        super(app, args);
        this.setTitle('View Bin Contents');

        let ec = this._ec;
        let binStruct = LS.bins;
        if (binStruct === undefined) {
            this.close();
            throw new Error("Can't view bins that haven't been defined!");
        }
        let bins = binStruct.bins;
        let binNames = this._binNames = binStruct['pl-names'];

        let loading = $('<div class="loading">loading...</div>');
        ec.append(loading);

        for (let bin in bins) {
            if (bin === 'IGNORE') continue;

            let deets = $('<details></details>').appendTo(ec);
            let summ = $('<summary></summary>').appendTo(deets);
            let p = $('<strong></strong>').appendTo(summ);

            let name = binNames[bin];
            if (name === undefined) name = `UNNAMED: ${bin}`;
            p.text(name);

            let follow = $('<span>&nbsp;&nbsp;&nbsp;</span>').appendTo(summ);
            let cnt = $('<span>0</span>').appendTo(summ);
            $('<span>&nbsp;videos</span>').appendTo(summ);
            let ul = $('<ul></ul>').appendTo(deets);

            this._binEls[bin] = { count: cnt, ul: ul, summ: summ };
        }

        this._asyncGetBinContents(loading).catch(this.errorHandler);
    }

    async _asyncGetBinContents(loading : JQE) {
        let tube = this._app.ytApi;

        let binEls = this._binEls;
        let remove = true;
        try {
            for (let bin in binEls) {
                let { count, ul, summ } = binEls[bin];

                let c = 0;
                for await (let item of tube.getPlaylistItems(bin)) {
                    let li = $('<li></li>').appendTo(ul);
                    let st = $('<strong></strong>').appendTo(li);
                    st.text(item.snippet.title);
                    $('<span>&nbsp;</span>').appendTo(li);
                    let chan = $('<span></span>').appendTo(li);
                    let title = item.snippet.videoOwnerChannelTitle;
                    if (title !== undefined) {
                        chan.text(title);
                    }
                    else {
                        console.log(`Video doesn't have owner! ${item.snippet.title} in bin ${this._binNames[bin]}`)
                    }

                    ++c;
                    count.text(c.toString());
                }
                if (c == 0) summ.addClass('de-emph');
            }
        } catch(err) {
            this.errorHandler(err);
            remove = false;
        }

        if (remove) loading.remove();
    }
}
