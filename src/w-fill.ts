import $ from 'jquery';

import { App, countVidsToAdd, removeVidToAdd, getOneRemovalVidForBin } from './app';
import LS from './lstor';
import { AppWidget } from './w-app';
import { WidgetArgs } from './widget';

export class FillBinsWidget extends AppWidget {
    private _stopped = false;

    constructor(app : App, wargs? : WidgetArgs) {
        super(app, wargs);
        this.setTitle('Fill the Bins (with videos!)');

        this._doAsyncBinFilling().catch(this.errorHandler);
    }

    async _doAsyncBinFilling() {
        let vidsToAdd = LS.vidsToAdd;
        let vidsToRemove = LS.vidsToRemove;
        let no = this._no;
        let ec = this._ec;
        let tube = this._app.ytApi;

        if (vidsToAdd === undefined) {
            // How did we open this widget in the first place?
            $('<p>No videos to add.</p>').appendTo(no);
            return;
        }

        let stopBtn = $('<button>Stop</button>').appendTo(no);
        stopBtn.click( () => { this._stopped = true; } );

        let addP = $('<p style="display: none">Adding video <span></span>/<span></span>...</p>').appendTo(no);
        let numer = $($('span', addP)[0]);
        let denom =  $($('span', addP)[1]);
        let interP = $('<p style="display: none">Interrupted! <span></span> videos remaining to be added next time.</p>').appendTo(no);
        let remainP = $($('span', interP)[0]);

        let vidCount = countVidsToAdd(vidsToAdd);
        denom.text(vidCount);

        // Oldest first
        let c = 1;
        let names = LS.bins? LS.bins['pl-names'] : {};
        let sorter = (a : string, b :string) => ((new Date(a)).valueOf() - (new Date(b)).valueOf());
        try {
            outLoop: for (let ds of Object.keys(vidsToAdd).sort(sorter)) {
                for (let vid of vidsToAdd[ds]) {
                    if (this._stopped) {
                        $('<p>STOPPED by user.</p>').appendTo(no);
                        break outLoop;
                    }
                    for (let bin of vid.destBins) {
                        let p = $('<p class="loading-desc">&nbsp<span>Attempting to add</span> video<br /><strong></strong> (<span class="yt-id"></span>) from channel <br /><strong></strong> (<span class="yt-id"></span>) to bin <br /><strong></strong> (<span></span>)</p>');
                        p.prependTo(ec);
                        let binName = names[bin];

                        let status = $($('span', p).get(0) as HTMLElement);
                        $($('strong', p).get(0) as HTMLElement).text(vid.vidName);
                        $($('span', p).get(1) as HTMLElement).text(vid.vidId);
                        $($('strong', p).get(1) as HTMLElement).text(vid.chanName);
                        $($('span', p).get(2) as HTMLElement).text(vid.chanId);
                        $($('strong', p).get(2) as HTMLElement).text(binName);
                        $($('span', p).get(3) as HTMLElement).text(bin);
                        $('<span class="isoDate"></span>').text(ds).prependTo(p);

                        numer.text(c);
                        addP.removeAttr('style');

                        let rmVid = getOneRemovalVidForBin(vidsToRemove, bin);
                        if (rmVid !== undefined && vidsToRemove !== undefined) {
                            // Before every video we wish to add, we
                            // must first remove a video from the
                            // destination "bin" channel, to make space
                            // (if necessary).
                            //
                            // HERE'S A NETWORK CALL
                            let rmResponse : any = await tube.removeVideo(rmVid.rec.plItemId);
                            removeVidToAdd(vidsToRemove[bin], rmVid.ds, rmVid.rec);
                        }

                        // HERE'S A NETWORK CALL
                        // NOTE: If we add multiplexed network calls
                        // here, make sure the Stop button lets
                        // currently-in-flight network calls finish up
                        let response : any = await tube.addVideo(bin, vid.vidId);
                        if (response.snippet.resourceId.videoId !== vid.vidId) {
                            this._app.addError(
                                'Video Insert: RESPONSE UNRECOGNIZED',
                                "Video insert request succeeded, but the response did not confirm the video's id",
                                JSON.stringify(response,null,2)
                            );

                            return; // No more processing when we get weird
                                    // results
                        }

                        // Indicate the task is done
                        status.text('Successfully added');
                        p.removeClass('loading-desc');

                        ++c;
                    } // bin
                } // vid

                // Delete this timestamp action, so we don't do it again
                // if interrupted
                delete vidsToAdd[ds];
                // Update the minimum date
                LS.minDate = new Date(new Date(ds).valueOf() + 1);
            } // datestamp
        }
        finally {
            // Ensure our progress is saved to localStorage.
            LS.vidsToAdd = vidsToAdd;
            LS.vidsToRemove = vidsToRemove;

            interP.removeAttr('style');
            remainP.text(vidCount - c + 1);
        }
    }
}
