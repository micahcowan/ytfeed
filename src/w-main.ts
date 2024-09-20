import $ from 'jquery'

import { App } from './app'
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

    _doSubsView() {
        let app = this._app;
        let tube = this._app.ytApi;
        $('<div class="widget-section-heading">Subscriptions</div>').appendTo(this._ec);

        this._cacheP.appendTo(this._ec);
        let inv = $('<button>Delete Cache</button>').appendTo(this._ec)
            .click(() => { tube.subscriptions.invalidateCache(); });

        let button = $('<button>View (Cached?) Subscriptions</button>')
            .appendTo(this._ec);
        this.makeSingleSpawner(button, () => new SubscriptionsWidget(app));

        let update = $('<button>View Subscriptions (<strong>Update Cache</strong>)</button>')
            .appendTo(this._ec);
        this.makeSingleSpawner(update, () => new SubscriptionsWidget(app, 'update'));

        this._cacheUpdated();
        tube.subscriptions.addEventListener(
            'cacheUpdated',
            () => { this._cacheUpdated(); },
        )
    }

    _doBinsView() {
        let ec = this._ec;
        $('<div class="widget-section-heading">Bins</div>').appendTo(ec);

        let bins = $('<button>Edit Subscription Bins (JSON)</button>')
            .appendTo(this._ec);
        this.makeSingleSpawner(bins, () => new BinsEditWidget(this._app));

        let binsView = $('<button><strong>View Bin Contents</strong></button>')
            .appendTo(this._ec);
        this.makeSingleSpawner(binsView, () => new BinsViewWidget(this._app));
    }

    _doCalcFeeds() {
        let ec = this._ec;
        $('<div class="widget-section-heading">Playlist Feeder</div>').appendTo(ec);

        let calcBtn = $('<button>Find New Videos</button>')
            .appendTo(this._ec);
        this.makeSingleSpawner(calcBtn, () => new GetChanVidsWidget(this._app));

        let vidsToAdd = LS.vidsToAdd
        if (vidsToAdd !== undefined) {
            let filterBtn = $('<button>Filter Found Videos</button>')
                .appendTo(this._ec);
            this.makeSingleSpawner(filterBtn, () => new FilterVidsWidget(this._app));

            let sortBtn = $('<button>Preview Binning</button>')
                .appendTo(this._ec);
            this.makeSingleSpawner(sortBtn, () => new SortVidsWidget(this._app));

            let fillBtn = $('<button><strong>Fill the Bins!!!</strong></button>')
                .appendTo(this._ec);
            this.makeSingleSpawner(fillBtn, () => new FillBinsWidget(this._app));
        }
    }
}
