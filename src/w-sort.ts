import $ from 'jquery';

import LS from './lstor';
import { PlaylistItem } from './youtube';

import { App, BinsStruct } from './app';
import { AppWidget } from './w-app';
import { WidgetArgs } from './widget';

async function getFirstVid(list : AsyncIterable<PlaylistItem>) : Promise<PlaylistItem | undefined> {
    let first = undefined;
    for await (let o of list) {
        first = o;
        break;
    }
    return first;
}

export class SortBinsWidget extends AppWidget {
    constructor(app : App, wargs? : WidgetArgs) {
        super(app, wargs);
        this.setTitle('Sort the Bins (by newest top video)');

        this._doAsyncSortBins().catch(this.errorHandler);
    }

    async _doAsyncSortBins() {
        let yt = this._app.ytApi;
        let bins_s = LS.bins;
        let names = bins_s? bins_s['pl-names'] : {};
        let sorted : [number, JQuery<HTMLElement>][] = [];
        // For each bin,
        for (let bin in ( bins_s? bins_s.bins: {} )) {
            let nm = names[bin];
            if (nm === undefined) continue;
            if (nm == 'IGNORE') continue;

            // fetch the first video it contains
            let time = 0;
            let name = '';
            let timeStr = '';
            let plItems = yt.getPlaylistItems(bin);
            let vid : PlaylistItem | undefined = undefined;
            try {
                vid = await getFirstVid(plItems);
            } catch (err) {
                this.errorHandler(err); // process error, but continue
                name = '!! ERROR !!';
            }

            if (vid === undefined) {
                // let time remain as 0
            }
            else {
                name = vid.snippet.title;
                if (vid.snippet.publishedAt !== undefined) {
                    timeStr = vid.snippet.publishedAt;
                    time = new Date(timeStr).getTime();
                }
            }

            // Create a display element
            let el = $('<div/>');
            let elb = $('<strong/>').appendTo(el);
            let elv = $('<span/>').appendTo(el);
            let elt = $('<span style="font-variant: italic"/>').appendTo(el);

            elb.text(nm);
            elv.text(` ${name} `);
            elt.text(`(${timeStr})`);

            // Record the bin to the display, sorting it where it should go
            let inserted = false;
            for (let i = 0; i != sorted.length; ++i) {
                let item = sorted[i];

                if (time >= item[0]) {
                    inserted = true;
                    sorted.splice(i, 0, [time, el]);
                    item[1].before(el);
                    break;
                }
            }
            if (!inserted) {
                this._no.append(el);
                sorted.push([time, el]);
            }
        }
    }
}
