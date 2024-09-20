import $ from 'jquery'

import { App, countVidsToAdd } from './app'
import LS from './lstor'
import { Widget, WidgetArgs } from './widget'
import { AppWidget } from './w-app'
import { SubscriptionsWidget } from './w-subs'
import { BinsEditWidget, BinsViewWidget } from './w-bins'
import { GetChanVidsWidget } from './w-vids'
import { FilterVidsWidget } from './w-filter'
import { SortVidsWidget } from './w-sort'
import { FillBinsWidget  }from './w-fill'

export class MainWidget extends AppWidget {
    private _cacheP : JQuery<HTMLElement>;

    constructor(app: App, args?: WidgetArgs) {
        super(app, { closeable: false });
        this.setTitle('Main');

        this._cacheP = $('<div></div>');

        this._doTopView();
        this._doSubsView();
        this._doBinsView();
        this._doCalcFeeds();
        this._doDetailsView();
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

    _doTopView() {
        let rmTokBtn = $('<button>Clear Access Token (refreshed app creds?)</button>').appendTo(this._no);
        rmTokBtn.click(() => {
            this._app.ytApi.clearToken();
        })
    }

    _doDetailsView() {
        let vidsToAdd = LS.vidsToAdd;
        let infoP = $('<p></p>').appendTo(this._no);
        if (vidsToAdd === undefined) {
            infoP.text('No fetched videos cache - fetch more.');
        } else {
            let cnt = countVidsToAdd(vidsToAdd);
            infoP.text(`There are ${cnt} cached videos ready to bin.`);

            let keys = Object.keys(vidsToAdd).sort();
            let ds = keys[0];
            let vid = vidsToAdd[ds][0];

            let p = $('<p>&nbsp<span>Oldest video (next to be added:)</span> video<br /><strong></strong> (<span class="yt-id"></span>) from channel <br /><strong></strong> (<span class="yt-id"></span>)</p>');
            p.appendTo(this._no);

            let status = $($('span', p).get(0) as HTMLElement);
            $($('strong', p).get(0) as HTMLElement).text(vid.vidName);
            $($('span', p).get(1) as HTMLElement).text(vid.vidId);
            $($('strong', p).get(1) as HTMLElement).text(vid.chanName);
            $($('span', p).get(2) as HTMLElement).text(vid.chanId);
            $('<span class="isoDate"></span>').text(ds).prependTo(p);

            ds = keys[keys.length-1];
            vid = vidsToAdd[ds][vidsToAdd[ds].length-1];

            p = $('<p>&nbsp<span>Newest video (last to be added:)</span> video<br /><strong></strong> (<span class="yt-id"></span>) from channel <br /><strong></strong> (<span class="yt-id"></span>)</p>');
            p.appendTo(this._no);

            status = $($('span', p).get(0) as HTMLElement);
            $($('strong', p).get(0) as HTMLElement).text(vid.vidName);
            $($('span', p).get(1) as HTMLElement).text(vid.vidId);
            $($('strong', p).get(1) as HTMLElement).text(vid.chanName);
            $($('span', p).get(2) as HTMLElement).text(vid.chanId);
            $('<span class="isoDate"></span>').text(ds).prependTo(p);
        }
    }

    _doSubsView() {
        let app = this._app;
        let tube = this._app.ytApi;
        $('<div class="widget-section-heading">Subscriptions</div>').appendTo(this._no);

        this._cacheP.appendTo(this._no);
        let inv = $('<button>Delete Cache</button>').appendTo(this._no)
            .click(() => { tube.subscriptions.invalidateCache(); });

        let button = $('<button>View (Cached?) Subscriptions</button>')
            .appendTo(this._no);
        this.makeSingleSpawner(button, () => new SubscriptionsWidget(app));

        let update = $('<button>View Subscriptions (<strong>Update Cache</strong>)</button>')
            .appendTo(this._no);
        this.makeSingleSpawner(update, () => new SubscriptionsWidget(app, 'update'));

        this._cacheUpdated();
        tube.subscriptions.addEventListener(
            'cacheUpdated',
            () => { this._cacheUpdated(); },
        )
    }

    _doBinsView() {
        let no = this._no;
        $('<div class="widget-section-heading">Bins</div>').appendTo(no);

        let bins = $('<button>Edit Subscription Bins (JSON)</button>')
            .appendTo(this._no);
        this.makeSingleSpawner(bins, () => new BinsEditWidget(this._app));

        let binsView = $('<button><strong>View Bin Contents</strong></button>')
            .appendTo(this._no);
        this.makeSingleSpawner(binsView, () => new BinsViewWidget(this._app));
    }

    _doCalcFeeds() {
        let no = this._no;
        $('<div class="widget-section-heading">Playlist Feeder</div>').appendTo(no);

        let calcBtn = $('<button>Find New Videos</button>')
            .appendTo(this._no);
        this.makeSingleSpawner(calcBtn, () => new GetChanVidsWidget(this._app));

        let vidsToAdd = LS.vidsToAdd
        if (vidsToAdd !== undefined) {
            let filterBtn = $('<button>Filter Found Videos</button>')
                .appendTo(this._no);
            this.makeSingleSpawner(filterBtn, () => new FilterVidsWidget(this._app));

            let sortBtn = $('<button>Preview Binning</button>')
                .appendTo(this._no);
            this.makeSingleSpawner(sortBtn, () => new SortVidsWidget(this._app));

            let fillBtn = $('<button><strong>Fill the Bins!!!</strong></button>')
                .appendTo(this._no);
            this.makeSingleSpawner(fillBtn, () => new FillBinsWidget(this._app));
        }
    }
}
