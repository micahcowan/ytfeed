import $ from 'jquery';
import moment from 'moment';

import { App, VidsToAddRec, countVidsToAdd, removeVidToAdd } from './app';
import LS from './lstor';
import { WidgetArgs } from './widget';
import * as YT from './youtube';

import { AppWidget } from './w-app';

export class FilterVidsWidget extends AppWidget {
    constructor(app : App, args? : WidgetArgs) {
        super(app, args);
        this.setTitle('Filter Fetched Videos');

        this._doAsyncFiltering().catch(this.errorHandler);
    }

    async _doAsyncFiltering() {
        let ec = this._ec;
        let no = this._no;
        let vidsToAdd = LS.vidsToAdd;

        if (vidsToAdd === undefined) {
            $('</p>No vids fetched: nothing to filter.</p>').appendTo(ec);
            return;
        }
        let vidCount = countVidsToAdd(vidsToAdd);

        let loading = $('<p class="loading">filtering by duration...</p>').appendTo(no);

        let c = 0;
        let filterP = $('<p>Filtering video <span></span>/<span></span> for duration</p>').appendTo(no);
        let numer = $($('span',filterP)[0]);
        numer.text(c);
        $($('span',filterP)[1]).text(vidCount);

        let deetsP = $('<p><span></span> too short<br /><span></span> too long<br /><span></span> just right</p>').appendTo(no);
        let tooShortSp = $($('span',deetsP)[0]);
        let tooLongSp = $($('span',deetsP)[1]);
        let justRightSp = $($('span',deetsP)[2]);

        let tooShort = 0;
        let tooLong = 0;
        let justRight = 0;

        // First weed out by durations
        //  this has to be before we filter by shorts,
        //  bc this way we restrict ourselves to only filtering for shorts
        //  if they're short enough for us to care

        // vv FIXME: should get these values from LS.
        let maxDur = moment.duration({minutes: 35});
        let minDur = moment.duration({minutes: 1, seconds: 2});
        let requestBatcher = new RequestBatcher(
            this._app.ytApi,
            (ds : string, vidToAdd: VidsToAddRec, vid : YT.Video) => {
                let dur = moment.duration(vid.contentDetails.duration);
                if (dur === undefined || dur < minDur) {
                    // XXX
                    removeVidToAdd(vidsToAdd, ds, vidToAdd);
                    tooShortSp.text(++tooShort);
                }
                else if (dur > maxDur) {
                    // XXX
                    removeVidToAdd(vidsToAdd, ds, vidToAdd);
                    tooLongSp.text(++tooLong);
                }
                else {
                    justRightSp.text(++justRight);
                }
            }
        );
        for (let ds in vidsToAdd) {
            for (let vid of vidsToAdd[ds]) {
                ++c;
                numer.text(c);
                await requestBatcher.add(ds, vid);
            }
        }
        await requestBatcher.finish();
        loading.remove();
        $(`<p>To-add videos reduced to ${countVidsToAdd(vidsToAdd)}</p>`).appendTo(no);
        LS.vidsToAdd = vidsToAdd; // Update!
    }
}

type ContainerRec = {
    ds: string,
    vta: VidsToAddRec,
}
class RequestBatcher {
    protected _ytApi : YT.Api;
    protected _handler : (ds : string, vta : VidsToAddRec, vid : YT.Video) => void;
    protected _count = 0;
    protected _vids : Record<string, ContainerRec> = {};

    constructor(yt : YT.Api, handler : typeof this._handler) {
        this._ytApi = yt;
        this._handler = handler;
    }

    async add(ds : string, vid : VidsToAddRec) {
        let vidbin = this._vids
        if (vid.vidId in vidbin) {
            throw new Error(`Duplicate video entry ${JSON.stringify(vid,null,2)}`);
        }
        vidbin[vid.vidId] = { ds: ds, vta: vid };

        if (++this._count == 50) { // max per page in YouTube API
            await this._doRequest();
        }
    }

    async finish() {
        await this._doRequest();
    }

    protected async _doRequest() {
        let tube = this._ytApi;
        let vidbin = this._vids;
        let handler = this._handler;

        // Flush out the container and begin again.
        // Do this before we process anything asynchronous, 
        // so someone can't call .add() on us while we're processing
        // (async fns are synchronous up to the first `await`)
        this._count = 0;
        this._vids = {};

        // NETWORK CALL HERE
        let rspVids = tube.getVideos(Object.keys(vidbin));
        for await (let vidItem of rspVids) {
            let vid = vidbin[vidItem.id];
            if (vid === undefined) {
                console.error("Got a video response object that we didn't request!");
                console.log(vidItem);
                console.log("requested vids:");
                console.log(Object.keys(vidbin));
            }

            delete vidbin[vidItem.id];
            handler(vid.ds, vid.vta, vidItem);
        }

        let vals = Object.values(vidbin);
        if (vals.length != 0) {
            throw new Error(`A number of requested videos were not handled in the YouTube response: ${Object.keys(vidbin).join()}`);
        }
    }
}
