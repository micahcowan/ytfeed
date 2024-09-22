import $ from 'jquery'

import { App, netEmoji } from './app'
import { AppWidget } from './w-app'
import * as YT from './youtube'

export class CompareBinsSubsWidget extends AppWidget {
    constructor(app: App) {
        super(app);
        this.setTitle('Compare Bins/Subscriptions');

        this._asyncDoSubscriptions().catch(this.errorHandler);
    }

    private async _asyncDoSubscriptions(useCache : boolean = true) {
        let tube = this._app.ytApi;
        let ec = this._ec;

        ec.empty();

        let woCacheBtn;
        if (useCache && tube.subscriptions.cached) {
            let p = $('<p></p>').appendTo(ec);
            p.text('Using cached subscription data from '
                   + tube.subscriptions.cacheDate);
            woCacheBtn = $(`<button>Resync Subscriptions Data&nbsp;${netEmoji}</button>`);
            woCacheBtn.attr('disabled', 'disabled');
            woCacheBtn.click(() => { this._asyncDoSubscriptions(false).catch(this.errorHandler); });
            woCacheBtn.appendTo(ec);
        }

        let loading = $('<div class="loading">loading...</div>');
        ec.append(loading);

        let x;
        x = $('<details open="open"><summary>UNKNOWN subscriptions</summary></details>')
            .appendTo(ec);
        let unkSubsUl = $('<ul class="subscriptions"/>').appendTo(x);
        x = $('<details open="open"><summary>IGNORED subscriptions</summary></details>')
            .appendTo(ec);
        let ignSubsUl = $('<ul class="subscriptions"/>').appendTo(x);
        x = $('<details><summary>ALL subscriptions</summary></details>')
            .appendTo(ec);
        let allSubsUl = $('<ul class="subscriptions"/>').appendTo(x);

        let assign = this._app.getAssignedBins();
        let iter : AsyncIterable<YT.SubscriptionItem> = tube.subscriptions;
        if (!useCache) {
            console.log("not useCache");
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

        if (woCacheBtn !== undefined) {
            woCacheBtn.removeAttr('disabled');
        }
    }
}
