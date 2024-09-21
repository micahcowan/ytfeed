import $ from 'jquery'
import { z } from 'zod';

import { App, BinsStruct, VidsToAdd, VidsToAddRec, mergeVidToAdd, countVidsToAdd } from './app'
import { WidgetArgs } from './widget'
import { AppWidget } from './w-app'
import LS from './lstor'

type JQHE = JQuery<HTMLElement>;
type SortVidsElems = {
    cntNewTotal: JQHE,
    cntPres: JQHE,
    cntKept: JQHE,
    cntRem: JQHE,
    cntAdd: JQHE,
    cntNoAdd: JQHE,
    ulNoAdd: JQHE,
    ulMixed: JQHE,
    ulRemove: JQHE,
    summ: JQHE
};
export class PreviewAddRmWidget extends AppWidget {
    _binEls : Record<string, SortVidsElems> = {};
    _binNames : Record<string, string>;

    constructor(app: App, args?: WidgetArgs) {
        super(app, args);
        this.setTitle('Preview Additions/Removals');

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

            $('<span>&nbsp;&nbsp;&nbsp;</span>').appendTo(summ);
            let follow = $('<span><span>0</span> videos - <span>0</span> present (<span>0</span> rm, <span>0</span> kept), <span>0</span> added, <snap>0</snap> omit</span>').appendTo(summ);
            let spans = $('span', follow);

            let cntNewTotal = $(spans[0]);
            let cntPres     = $(spans[1]);
            let cntRem      = $(spans[2]);
            let cntKept     = $(spans[3]);
            let cntAdd      = $(spans[4]);
            let cntNoAdd    = $(spans[5]);

            let ulA = $('<ul class="sort-vids-not-adding"></ul>').appendTo(deets);
            let ulB = $('<ul class="sort-vids-mixed"></ul>').appendTo(deets);
            let ulC = $('<ul class="sort-vids-removing"></ul>').appendTo(deets);

            this._binEls[bin] = {
                cntNewTotal: cntNewTotal,
                cntPres: cntPres,
                cntKept: cntKept,
                cntRem: cntRem,
                cntAdd: cntAdd,
                cntNoAdd: cntNoAdd,
                ulNoAdd: ulA,
                ulMixed: ulB,
                ulRemove: ulC,
                summ: summ };
        }

        this._asyncGetBinContents(loading).catch(this.errorHandler);
    }

    async _asyncGetBinContents(loading : JQHE) {
        let tube = this._app.ytApi;

        let binEls = this._binEls;
        let remove = true;
        try {
            for (let bin in binEls) {
                let {
                    cntNewTotal, cntPres, cntKept, cntRem, cntAdd, cntNoAdd,
                    ulNoAdd, ulMixed, ulRemove, summ
                } = binEls[bin];

                // Grep out just the vids that apply to this bin
                let vidsToAdd = LS.vidsToAdd;
                let vidsMixed : VidsToAdd = {};
                let vidsNoAdd : VidsToAdd = {};
                let vidsRemove : VidsToAdd = {};
                let c = 0;
                for (let dateStr in vidsToAdd) {
                    for (let vid of vidsToAdd[dateStr]) {
                        if (vid.destBins.has(bin)) {
                            mergeVidToAdd(vidsMixed, dateStr, vid);
                            ++c;
                        }
                    }
                }

                // Get the vids already in this bin (fetch!)
                let cPres = 0;
                for await (let item of tube.getPlaylistItems(bin)) {
                    let dateStr = item.snippet.publishedAt as string;
                    let vid : VidsToAddRec = {
                        present: true,
                        vidId: item.snippet.resourceId.videoId,
                        vidName: item.snippet.title,
                        chanId: item.snippet.videoOwnerChannelId as string,
                        chanName: item.snippet.videoOwnerChannelTitle as string,
                        destBins: new Set<string>,
                    };
                    mergeVidToAdd(vidsMixed, dateStr, vid);
                    ++c;
                    ++cPres;
                }
                if (c == 0) summ.addClass('de-emph');

                let { maxCount } = LS.getBinLimits(bin);
                if (c == 0) {
                }
                if (c > maxCount) {
                    // We need to weed some out. Throw things out
                    //  until we reach our target.
                }

                // Update counts
                cntNewTotal.text(countVidsToAdd(vidsMixed));
                cntPres.text(cPres);
                cntKept.text(countVidsToAdd(vidsMixed, (x) => !!x.present));
                cntRem.text(countVidsToAdd(vidsRemove));
                cntAdd.text(countVidsToAdd(vidsMixed, (x) => !x.present));
                cntNoAdd.text(countVidsToAdd(vidsNoAdd));

                // Add to <ul>s
                for (let ds in vidsNoAdd) {
                    for (let vid of vidsNoAdd[ds]) {
                        makeListItem(vid).appendTo(ulNoAdd);
                    }
                }
                // Add to <ul>s
                for (let ds in vidsMixed) {
                    for (let vid of vidsMixed[ds]) {
                        makeListItem(vid).appendTo(ulMixed);
                    }
                }
                // Add to <ul>s
                for (let ds in vidsRemove) {
                    for (let vid of vidsRemove[ds]) {
                        makeListItem(vid).appendTo(ulRemove);
                    }
                }

            }
        } catch(err) {
            this.errorHandler(err);
            remove = false;
        }

        if (remove) loading.remove();
    }
}

function makeListItem(vid : VidsToAddRec) : JQHE {
    let li = $('<li></li>')
    let st = $('<strong></strong>').appendTo(li);
    st.text(vid.vidName);
    $('<span>&nbsp;</span>').appendTo(li);
    let chan = $('<span></span>').appendTo(li);
    let title = vid.chanName
    chan.text(title);
    if (vid.present)
        li.addClass('present');

    return li;
}
