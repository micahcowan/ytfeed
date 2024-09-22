import $ from 'jquery'

import { App, countVidsToAdd, netEmoji } from './app'
import LS from './lstor'
import { Widget, WidgetArgs } from './widget'
import { AppWidget } from './w-app'
import { CompareBinsSubsWidget } from './w-compare-subs'
import { BinsEditWidget } from './w-edit-bins'
import { FetchVidsWidget } from './w-fetch-new'
import { FilterVidsWidget } from './w-filter'
import { PreviewAddRmWidget } from './w-preview-binning'
import { FillBinsWidget  }from './w-fill'

export class MainWidget extends AppWidget {
    private _feederDiv : JQuery<HTMLElement>;
    private _compareEmoji = $('<span></span>');

    constructor(app: App, args?: WidgetArgs) {
        super(app, { closeable: false });
        this.setTitle('Main');

        this._doCacheView();
        this._doBinAssignsView();
        $('<div class="widget-section-heading">Playlist Feeder</div>').appendTo(this._no);
        this._feederDiv = $('<div></div>').appendTo(this._no);
        this._doFeederView();
    }

    _cacheUpdated() {
        let tube = this._app.ytApi;

        if (tube.subscriptions.cached) {
            this._compareEmoji.empty();
        }
        else {
            this._compareEmoji.append( $(`<span>&nbsp;${netEmoji}</span>`) );
        }
    }

    _doCacheView() {
        $('<div class="widget-section-heading">Cached Data</div>').appendTo(this._no);
        let rmTokBtn = $('<button>Clear Access Token (refreshed app creds?)</button>').appendTo(this._no);
        rmTokBtn.click(() => {
            this._app.ytApi.clearToken();
        })
    }

    _doFeederView() {
        LS.addEventListener('cacheUpdated', () => { this._refreshFeederView(); });
        this._refreshFeederView();
    }

    _refreshFeederView() {
        let vidsToAdd = LS.vidsToAdd;
        let fd = this._feederDiv;
        fd.empty();

        let flex = $('<div class="yt-feeder-buttons"></div>').appendTo(fd);

        let calcBtn = $(`<button>Fetch New Videos to Bin&nbsp;${netEmoji}</button>`)
            .appendTo(flex);
        this.makeSingleSpawner(calcBtn, () => new FetchVidsWidget(this._app), Symbol.for('fetch new vids'));
        $('<div class="arrow">&#x2193;</div>').appendTo(flex);

        let makeEnabler = (button : JQuery<HTMLElement>) => {
            return () => {
                if (LS.vidsToAdd === undefined) {
                    // leave disabled
                    button.attr('disabled', 'disabled');
                }
                else {
                    // enable
                    button.removeAttr('disabled');
                }
            }
        }

        let enabler;
        let filterBtn = $(`<button>Filter Found Videos&nbsp;${netEmoji}</button>`)
            .appendTo(flex);
        enabler = makeEnabler(filterBtn);
        enabler();
        this.makeSingleSpawner(filterBtn, () => new FilterVidsWidget(this._app), Symbol.for('filter-vids'), enabler);
        $('<div class="arrow">&#x2193;</div>').appendTo(flex);

        let sortBtn = $(`<button>Preview Video Additions/Removals&nbsp;${netEmoji}</button>`)
            .appendTo(flex);
        enabler = makeEnabler(sortBtn);
        enabler();
        this.makeSingleSpawner(sortBtn, () => new PreviewAddRmWidget(this._app), Symbol.for('preview binning'), enabler);
        $('<div class="arrow">&#x2193;</div>').appendTo(flex);

        let fillBtn = $(`<button><strong>Fill the Bins!!!&nbsp;${netEmoji}</strong></button>`)
            .appendTo(flex);
        enabler = makeEnabler(fillBtn);
        enabler();
        this.makeSingleSpawner(fillBtn, () => new FillBinsWidget(this._app), Symbol.for('do the fills'), enabler);

        let infoP = $('<p></p>').appendTo(fd);
        if (vidsToAdd === undefined) {
            infoP.text('No fetched videos cache - fetch more.');
        } else {
            let cnt = countVidsToAdd(vidsToAdd);
            if (cnt === 0) {
                LS.vidsToAdd = undefined;
                LS.vidsToRemove = undefined;
                this._refreshFeederView(); // restart
                return
            }

            infoP.text(`There are ${cnt} cached videos ready to bin.`);

            let keys = Object.keys(vidsToAdd).sort();
            let ds = keys[0];
            let vid = vidsToAdd[ds][0];

            let p = $('<p>&nbsp<span>Oldest video (next to be added:)</span> video<br /><strong></strong> (<span class="yt-id"></span>) from channel <br /><strong></strong> (<span class="yt-id"></span>)</p>');
            p.appendTo(fd);

            let status = $($('span', p).get(0) as HTMLElement);
            $($('strong', p).get(0) as HTMLElement).text(vid.vidName);
            $($('span', p).get(1) as HTMLElement).text(vid.vidId);
            $($('strong', p).get(1) as HTMLElement).text(vid.chanName);
            $($('span', p).get(2) as HTMLElement).text(vid.chanId);
            $('<span class="isoDate"></span>').text(ds).prependTo(p);

            ds = keys[keys.length-1];
            vid = vidsToAdd[ds][vidsToAdd[ds].length-1];

            p = $('<p>&nbsp<span>Newest video (last to be added:)</span> video<br /><strong></strong> (<span class="yt-id"></span>) from channel <br /><strong></strong> (<span class="yt-id"></span>)</p>');
            p.appendTo(fd);

            status = $($('span', p).get(0) as HTMLElement);
            $($('strong', p).get(0) as HTMLElement).text(vid.vidName);
            $($('span', p).get(1) as HTMLElement).text(vid.vidId);
            $($('strong', p).get(1) as HTMLElement).text(vid.chanName);
            $($('span', p).get(2) as HTMLElement).text(vid.chanId);
            $('<span class="isoDate"></span>').text(ds).prependTo(p);
        }
    }

    _doBinAssignsView() {
        let app = this._app;
        let tube = this._app.ytApi;
        let no = this._no;

        $('<div class="widget-section-heading">Bin Assignments</div>').appendTo(no);
        let bins = $('<button>Edit Bin Assignments (JSON)</button>')
            .appendTo(no);
        this.makeSingleSpawner(bins, () => new BinsEditWidget(this._app));

        $('<br />').appendTo(no);
        /*
        let binsView = $('<button><strong>View Bin Contents</strong></button>')
            .appendTo(no);
        this.makeSingleSpawner(binsView, () => new BinsViewWidget(this._app));
        */
        /*
        let inv = $('<button>Delete Cache</button>').appendTo(no)
            .click(() => { tube.subscriptions.invalidateCache(); });
        */

        let compare = $(`<button>Compare Bin Assignments with Subscriptions</button>`)
            .appendTo(no);
        this._compareEmoji.empty();
        this._compareEmoji.appendTo(compare);
        this.makeSingleSpawner(compare, () => new CompareBinsSubsWidget(app));
        this._cacheUpdated();

        LS.addEventListener(
            'cacheUpdated',
            () => { this._cacheUpdated(); },
        )
    }
}
