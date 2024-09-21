import $ from 'jquery'

import { App, countVidsToAdd } from './app'
import LS from './lstor'
import { Widget, WidgetArgs } from './widget'
import { AppWidget } from './w-app'
import { SubscriptionsWidget } from './w-compare-subs'
import { BinsEditWidget } from './w-edit-bins'
import { GetChanVidsWidget } from './w-fetch-new'
import { FilterVidsWidget } from './w-filter'
import { SortVidsWidget } from './w-preview-binning'
import { FillBinsWidget  }from './w-fill'

let netEmoji = '\u{1F310}';

export class MainWidget extends AppWidget {
    private _cacheP : JQuery<HTMLElement>;
    private _feederDiv : JQuery<HTMLElement>;

    constructor(app: App, args?: WidgetArgs) {
        super(app, { closeable: false });
        this.setTitle('Main');

        this._cacheP = $('<div></div>');

        this._doCacheView();
        this._doBinAssignsView();
        $('<div class="widget-section-heading">Playlist Feeder</div>').appendTo(this._no);
        this._feederDiv = $('<div></div>').appendTo(this._no);
        this._doFeederView();
    }

    _cacheUpdated() {
        let p = this._cacheP;
        let tube = this._app.ytApi;

        if (tube.subscriptions.cached) {
            p.text('Subscriptions data was cached on '
                   + tube.subscriptions.cacheDate);
        }
        else {
            p.text('Subscriptions data is NOT cached.')
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

        let calcBtn = $(`<button>Fetch New Videos to Bin&nbsp;${netEmoji}</button>`)
            .appendTo(fd);
        this.makeSingleSpawner(calcBtn, () => new GetChanVidsWidget(this._app), Symbol.for('fetch new vids'));

        if (vidsToAdd !== undefined) {
            let filterBtn = $(`<button>Filter Found Videos&nbsp;${netEmoji}</button>`)
                .appendTo(fd);
            this.makeSingleSpawner(filterBtn, () => new FilterVidsWidget(this._app), Symbol.for('filter-vids'));

            let sortBtn = $(`<button>Preview Video Additions/Removals&nbsp;${netEmoji}</button>`)
                .appendTo(fd);
            this.makeSingleSpawner(sortBtn, () => new SortVidsWidget(this._app), Symbol.for('preview binning'));

            let fillBtn = $(`<button><strong>Fill the Bins!!!&nbsp;${netEmoji}</strong></button>`)
                .appendTo(fd);
            this.makeSingleSpawner(fillBtn, () => new FillBinsWidget(this._app), Symbol.for('do the fills'));
        }

        let infoP = $('<p></p>').appendTo(fd);
        if (vidsToAdd === undefined) {
            infoP.text('No fetched videos cache - fetch more.');
        } else {
            let cnt = countVidsToAdd(vidsToAdd);
            if (cnt === 0) {
                LS.vidsToAdd = undefined;
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
        this._cacheP.appendTo(no);

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

        let update = $(`<button>Compare Bin Assignments with Subscriptions&nbsp;${netEmoji}</button>`)
            .appendTo(no);
        this.makeSingleSpawner(update, () => new SubscriptionsWidget(app, 'update'));

        let button = $('<button>Show cached Bin Assignments/Subscriptions</button>')
            .appendTo(no);
        this.makeSingleSpawner(button, () => new SubscriptionsWidget(app));

        this._cacheUpdated();
        LS.addEventListener(
            'cacheUpdated',
            () => { this._cacheUpdated(); },
        )
    }
}
