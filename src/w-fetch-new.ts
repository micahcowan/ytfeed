import $ from 'jquery'
import { z } from 'zod'

import { App, BinsStruct, VidsToAdd } from './app'
import * as YT from './youtube'
import LS from './lstor'
import { WidgetArgs } from './widget'
import { AppWidget } from './w-app'

type JQHE = JQuery<HTMLElement>;

export class GetChanVidsWidget extends AppWidget {
    _stopped : boolean = false;
    _stopBtn : JQHE;
    _loading : JQHE;
    _pCached : JQHE;
    _pToFetch : JQHE;
    _pFetched : JQHE;
    _pVidsFetched : JQHE
    _chanMap : BinsRevMapping;

    constructor(app : App, args? : WidgetArgs) {
        super(app, args);
        this.setTitle('Find Vids');

        this._stopBtn = $('<button>Cancel</button>').appendTo(this._no);
        this._stopBtn.click( () => { this._stopped = true; } );

        let ec = this._ec
        let loading = $('<div class="loading">loading...</div>').appendTo(ec);
        this._loading = loading;

        this._pCached = $('<p></p>').appendTo(ec);
        this._pToFetch = $('<p></p>').appendTo(ec);
        this._pFetched = $('<p></p>').appendTo(ec);
        this._pVidsFetched = $('<p></p>').appendTo(ec);

        this._chanMap = getBinsRevMapping();

        this._doAsyncStuff().catch(this.errorHandler);
    }

    async _doAsyncStuff() {
        await this._doAsyncUpdateUploadListsMap();
        await this._doAsyncGatherVideos();
        this._loading.remove();
    }

    async _doAsyncUpdateUploadListsMap() {
        let tube = this._app.ytApi;
        let ec = this._ec;
        let chanMap = this._chanMap;
	let chanToUp = LS.chanToUploadList;
        let missing = new Set<string>;

        // Give a message about how many channel upload lists are cached
        this._pCached.text(`channel uploads-list cache has data for ${Object.keys(chanToUp).length} channels.`);

        // Ensure we have up-to-date channel-to-uploads-list mapping
        for (let chanName of Object.keys(chanMap).sort()) {
            for (let chanId in chanMap[chanName]) { // usually just one
                if (!(chanId in chanToUp)) {
                    missing.add(chanId);
                }
            }
        }

        // Give a message about how many channel upload lists need fetching
        this._pToFetch.text(`there are ${missing.size} channels that are missing "uploads" list information.`);

        if (missing.size > 0) {
            // Now fetch 'em!
            let channels = tube.getChannels(Array.from(missing.values()));
            let origLoading = this._loading.text();
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

            this._loading.text(origLoading);
        }
    }

    async _doAsyncGatherVideos() {
        // Now find all the (potentially) new videos
        let ec = this._ec;
        let tube = this._app.ytApi;
        let chanMap = this._chanMap;
        let chanToUp = LS.chanToUploadList;
        let totalVids = 0;
        let chanCnt = 0;

        let vidsToAdd : VidsToAdd = {};
        for (let chanName of Object.keys(chanMap).sort()) {
            for (let chanId in chanMap[chanName]) { // usually just one
                if (this._stopped) {
                    $('<p>CANCELLED by user.</p>').appendTo(this._no);
                    return; // without saving to cache:
                            // bc we won't have gotten to the oldest
                            // vids yet, and channels will be lopsided
                }
                ++chanCnt;
                let uploads = chanToUp[chanId];

                // Create a drop-down for this channel
                let deets = $('<details></details>').appendTo(ec);
                let summ = $('<summary></summary>').appendTo(deets);
                let p = $('<strong></strong>').appendTo(summ);

                p.text(chanName);

                $('<span>&nbsp;</span>').appendTo(summ);
                let subsId = $('<span class="subs-id"></span>').appendTo(summ);
                subsId.text(chanId);
                $('<span>&nbsp;&nbsp;&nbsp;</span>').appendTo(summ);
                let count = $('<span>0</span>').appendTo(summ);
                $('<span>&nbsp;videos</span>').appendTo(summ);
                let ul = $('<ul></ul>').appendTo(deets);

                let { maxCount, minDate } = LS.getChannelLimits(chanId);

                try {
                    let uploadsItems = tube.getPlaylistItems(uploads);
                    let c = 0;
                    for await (let video of uploadsItems) {
                        let vidDateStr = video.snippet.publishedAt;
                        if (vidDateStr === undefined) {
                            continue;
                        }
                        let vidDate = new Date(vidDateStr);
                        if (vidDate.valueOf() < minDate.valueOf()) {
                            // We're into older videos now:
                            //  done with this channel!
                            break;
                        }

                        let id = video.snippet.resourceId.videoId;
                        if (!(vidDateStr in vidsToAdd)) {
                            vidsToAdd[vidDateStr] = [];
                        }
                        vidsToAdd[vidDateStr].push({
                            vidId: id,
                            vidName: video.snippet.title,
                            chanId: chanId,
                            chanName: chanName,
                            destBins: chanMap[chanName][chanId],
                        });

                        let li = $('<li></li>').appendTo(ul);
                        let st = $('<strong></strong>').appendTo(li);
                        st.text(video.snippet.title);
                        $('<span>&nbsp;</span>').appendTo(li);
                        let date = $('<span></span>').appendTo(li);
                        date.text(vidDateStr);

                        ++c;
                        ++totalVids;
                        count.text(c.toString());
                        this._pVidsFetched.text(`Found ${totalVids} videos to add to bins.`);
                        //totalVidsEl.text(c.toString());

                        if (maxCount !== undefined && c >= maxCount)
                            break; // done processing vids for this chan
                    }
                }
                catch(err) {
                    if (err instanceof YT.Exception && err.ytError.error.code == 404) {
                        // Flag the channnel, but keep processing
                        this._app.addError('No such channel', `YouTube says the channel ${chanName} <https://www.youtube.com/channel/${chanId}/> has no "uploads" playlist.`);
                        summ.addClass('error-occurred');
                    }
                    else {
                        this._app.handleError(err);
                        return;
                    }
                }
            }
        }

        // Cache our results!
        LS.vidsToAdd = vidsToAdd;
    }
}

type BinsRevMapping =
    Record<string, Record<string, Set<string>>>;
function getBinsRevMapping() : BinsRevMapping {
    /*
        "Bins" are mapped
            destination playlist => channel whose vids will go to that playlist
        which is optimal for ease of specification.

        But we want
            channel => destination playlist
        so that we have a unique mapping of a one channel to one key

        Actually, we really want
            [channel_name]: {
                [channel_id] : "bins": Set<bin_id>,
                ...
            }
        where `channel_info` includes destination playlist, and channel id.
	That way we have a mapping whose keys can be sorted more
	naturally for human consumption.

        Note that a given channel id may appear in multiple "bins".
    */

    let binStruct = LS.bins;
    if (binStruct === undefined) return {};
    let revMap : BinsRevMapping = {};
    let bins = binStruct.bins;
    let curBin;

    for (let bin of Object.keys(bins)) {
        if (bin === 'IGNORE') continue; // SKIP ignored channels
        for (let chan of bins[bin]) {
            if (!(chan.name in revMap)) {
                revMap[chan.name] = {};
            }
            let idRec = revMap[chan.name];
            if (!(chan.id in idRec)) {
                idRec[chan.id] = new Set<string>;
            }
            idRec[chan.id].add(bin);
        }
    }

    return revMap;
}
