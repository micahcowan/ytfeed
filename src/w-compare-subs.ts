import $ from 'jquery'

import { App } from './app'
import { AppWidget } from './w-app'
import * as YT from './youtube'

export class CompareBinsSubsWidget extends AppWidget {
    _update : boolean;

    constructor(app: App, update? : 'update') {
        super(app);
        this.setTitle('Compare Bins/Subscriptions');
        this._update = update === 'update';

        this._asyncDoSubscriptions().catch(this.errorHandler);
    }

    private async _asyncDoSubscriptions() {
        let tube = this._app.ytApi;
        let w = this._ec;

        let loading = $('<div class="loading">loading...</div>');
        w.append(loading);

        let x;
        x = $('<details open="open"><summary>UNKNOWN subscriptions</summary></details>')
            .appendTo(w);
        let unkSubsUl = $('<ul class="subscriptions"/>').appendTo(x);
        x = $('<details open="open"><summary>IGNORED subscriptions</summary></details>')
            .appendTo(w);
        let ignSubsUl = $('<ul class="subscriptions"/>').appendTo(x);
        x = $('<details><summary>ALL subscriptions</summary></details>')
            .appendTo(w);
        let allSubsUl = $('<ul class="subscriptions"/>').appendTo(x);

        let assign = this._app.getAssignedBins();
        let iter : AsyncIterable<YT.SubscriptionItem> = tube.subscriptions;
        if (this._update) {
            iter = tube.subscriptions.getAsyncUpdatedIterator();
        }
        for await (let chan of iter) {
            let li = $('<li />');
            let t = $('<span class="subs-title" />');
            t.text(chan.snippet.title);
            t.appendTo(li);
            let id = $('<span class="subs-id" />');
            id.text(chan.snippet.resourceId.channelId);
            id.appendTo(li);
            li.hide();
            li.appendTo(allSubsUl);
            li.slideDown('fast');

            let a = assign[chan.snippet.resourceId.channelId];
            if (a === undefined) {
                li.clone().appendTo(unkSubsUl);
            }
            else if (a.bins.has('IGNORE')) {
                li.clone().appendTo(ignSubsUl);
            }
        }

        // Loading is finished
        // Include a count
        let p = $('<p/>');
        p.text(`There are ${$('li', allSubsUl).length} subscribed channels:
               ${$('li', unkSubsUl).length} unknown, and ${$('li', ignSubsUl).length} ignored.`);
        p.insertBefore(loading);

        loading.remove();
    }
}
