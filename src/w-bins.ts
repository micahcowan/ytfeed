import $ from 'jquery'
import { z } from 'zod';

import { App, BinsStruct } from './app'
import { WidgetArgs } from './widget'
import { AppWidget } from './w-app'
import * as YT from './youtube'

const lsBins = 'ytfeed-bins';

export class BinsEditWidget extends AppWidget {
    _ta : JQuery<HTMLElement>;
    _btn : JQuery<HTMLElement>;

    constructor(app: App, args?: WidgetArgs) {
        super(app, args);
        this.setTitle('Edit Bins (JSON)');

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

type JQE = JQuery<HTMLElement>;
export class BinsViewWidget extends AppWidget {
    _binEls : Record<string, {count: JQE, ul: JQE}> = {};
    _binNames : Record<string, string>;

    constructor(app: App, args?: WidgetArgs) {
        super(app, args);
        this.setTitle('View Bin Contents');

        let ec = this._ec;
        let binStruct = BinsStruct.parse(JSON.parse(localStorage[lsBins]))
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

            this._binEls[bin] = { count: cnt, ul: ul };
        }

        this._asyncGetBinContents(loading);
    }

    async _asyncGetBinContents(loading : JQE) {
        let tube = this._app.ytApi;

        let pgParams = {
            path: 'playlistItems',
            params: {
                playlistId: '',
                part: 'snippet,contentDetails',
                maxResults: '50',
            }
        };

        let binEls = this._binEls;
        let remove = true;
        try {
            for (let bin in binEls) {
                pgParams.params.playlistId = bin;
                let pager = new YT.PagedRequestIterator(tube, pgParams);
                let { count, ul } = binEls[bin];

                let c = 0;
                for await (let page of pager) {
                    for (let _item of page.items) {
                        let item = PagelistItem.parse(_item);
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
                    }
                    count.text(c.toString());
                }
            }
        } catch(err) {
            this.errorHandler(err);
            remove = false;
        }

        if (remove) loading.remove();
    }
}

const PagelistItem = z.object({
    snippet: z.object({
        title: z.string(),
        videoOwnerChannelTitle: z.optional(z.string()),
        /*
        thumbnails: z.object({
            default: z.object({
                url: z.string(),
                width: z.number(),
                height: z.number(),
            }),
        }),
        */
        resourceId: z.object({
            videoId: z.string(),
        }),
    }),
    contentDetails: z.object({
        videoId: z.string(),
        videoPublishedAt: z.optional(z.string().datetime()),
    }),
});
type PagelistItem = z.infer<typeof PagelistItem>;
