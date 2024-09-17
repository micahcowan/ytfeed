import $ from 'jquery'

import { App, BinsStruct } from './app'
import LS from './lstor'
import { WidgetArgs } from './widget'
import { AppWidget } from './w-app'

type JQHE = JQuery<HTMLElement>;

export class GetChanVidsWidget extends AppWidget {
    _loading : JQHE;
    _pCached : JQHE;
    _pToFetch : JQHE;
    _pFetched : JQHE;

    constructor(app : App, args? : WidgetArgs) {
        super(app, args);
        this.setTitle('Find Vids');

        let ec = this._ec
        let loading = $('<div class="loading">loading...</div>').appendTo(ec);
        this._loading = loading;

        this._pCached = $('<p></p>').appendTo(ec);
        this._pToFetch = $('<p></p>').appendTo(ec);
        this._pFetched = $('<p></p>').appendTo(ec);

        this._doAsyncStuff().then(() => undefined);
    }

    async _doAsyncStuff() {
        let chanMap = getBinsRevMapping();
	let chanToUp = LS.chanToUploadList;
        let missing = [];

        // Give a message about how many channel upload lists are cached
        this._pCached.text(`channel uploads-list cache has data for ${Object.keys(chanToUp).length} channels.`);

        // Ensure we have up-to-date channel-to-uploads-list mapping
        for (let chanName of Object.keys(chanMap).sort()) {
            for (let chanInfo of chanMap[chanName]) { // usually just one
                if (!(chanInfo.id in chanToUp)) {
                    missing.push(chanInfo.id);
                }
            }
        }

        // Give a message about how many channel upload lists need fetching
        this._pToFetch.text(`there are ${missing.length} channels that are missing "uploads" list information.`);

        if (missing.length > 0) {
            // Now fetch 'em!
            let tube = this._app.ytApi;
            let channels = tube.getChannels(missing);
            this._loading.text('Updating cached upload-lists...');
            try {
                for await (let chan of channels) {
                    let id = chan.id;
                    let uploads = chan.contentDetails.relatedPlaylists.uploads;

                    chanToUp[id] = uploads;
                }
            }
            catch(err) {
                this._app.handleError(err);
                return;
            }

            LS.chanToUploadList = chanToUp; // update the cache!

            // Now go double check that none of the missing channels are
            // still lacking uploads-list info
            let still_missing = [];
            let names = (LS.bins as BinsStruct)["pl-names"];
            for (let m in missing) {
                if (!(m in chanToUp)) {
                    still_missing.push(`${names[m]} (${m})`);
                }
            }

            // Give a message about the final results
            let c = still_missing.length;
            this._pFetched.text(`After cache update, ${c} channels are still unaccounted-for.`);
            if (c !== 0) {
                this._app.addError('Channels Missing',
                   'YouTube failed to provide channel info for some needed channels (maybe they were deleted?)', JSON.stringify(still_missing,null,2));
                return;
            }
        }

        // Now find all the (potentially) new videos
        for (let chanName of Object.keys(chanMap).sort()) {
            for (let chanInfo of chanMap[chanName]) { // usually just one
                //
            }
        }
    }
}

type BinsRevMapping = Record<string, ChanInfo[]>;
type ChanInfo = {
    id: string,
    binId: string,
};
function getBinsRevMapping() : BinsRevMapping {
    /*
        "Bins" are mapped
            destination playlist => channel whose vids will go to that playlist
        which is optimal for ease of specification.

        But we want
            channel => destination playlist
        so that we have a unique mapping of a one channel to one key

        Actually, we really want
            channel_name => [channel_info],
        where `channel_info` includes destination playlist, and channel id.
	That way we have a mapping whose keys can be sorted more
	naturally for human consumption.

        Why an array? Well, more than one channel might wind up having
        the same fucking name, mightn't it?
    */

    let binStruct = LS.bins;
    if (binStruct === undefined) return {};
    let revMap : BinsRevMapping = {};
    let bins = binStruct.bins;
    let curBin;

    for (let bin of Object.keys(bins)) {
        for (let chan of bins[bin]) {
            if (!(chan.name in revMap)) {
                revMap[chan.name] = [];
            }
            revMap[chan.name].push({
                id: chan.id,
                binId: bin,
            });
        }
    }

    return revMap;
}
