import $ from 'jquery'

import { App } from './app'
import { Widget, WidgetArgs } from './widget'
import { AppWidget } from './w-app'
import { SubscriptionsWidget } from './w-subs'
import { BinsWidget } from './w-bins'

export class MainWidget extends AppWidget {
    private _cacheP : JQuery<HTMLElement>;

    constructor(app: App, args?: WidgetArgs) {
        super(app, { closeable: false });
        this.setTitle('Main');

        this._cacheP = $('<div></div>');

        this._doSubsCache();
        this._doSubsView();
    }

    _doSubsCache() {
        let ec = this._ec;
        let tube = this._app.ytApi;

        $('<div class="widget-section-heading">Cached data</div>').appendTo(ec);
        let p = this._cacheP;
        p.appendTo(ec);

        let inv = $('<button>Delete Cache</button>').appendTo(ec)
            .click(() => { tube.subscriptions.invalidateCache(); });

        this._cacheUpdated();
        tube.subscriptions.addEventListener(
            'cacheUpdated',
            () => { this._cacheUpdated(); },
        )

        let bins = $('<button>Edit Subscription Bins (JSON)</button>')
            .appendTo(this._ec);
        this.makeSingleSpawner(bins, () => new BinsWidget(this._app));
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

    _doSubsView() {
        let app = this._app;
        $('<div class="widget-section-heading">Subscriptions</div>').appendTo(this._ec);
        let button = $('<button>View Subscriptions</button>')
            .appendTo(this._ec);
        this.makeSingleSpawner(button, () => new SubscriptionsWidget(app));

        let update = $('<button>View Subscriptions (<strong>Updated</strong>)</button>')
            .appendTo(this._ec);
        this.makeSingleSpawner(update, () => new SubscriptionsWidget(app, 'update'));
    }
}
