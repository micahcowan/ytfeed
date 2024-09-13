import $ from 'jquery';
import 'jquery-color';
import * as YT from './youtube';

export default class App {
    private _yt : YT.Api;

    constructor(yt : YT.Api) {
        this._yt = yt;
    }

    async run() {
        let tube = this._yt;

        let body = $('body');
        body.append('<h1>Hello, lurdo!</h1>');

        let ul = $('<ul />');
        ul.css('border', 'solid 2px red');
        body.append(ul);

        let loading = $('<li><em>loading...</en></li>');
        ul.append(loading);

        for await (let chan of tube.subscriptions) {
            let li = $('<li />');
            li.text(`${chan.title} (${chan.id})`);
            li.hide();
            li.insertBefore(loading);
            li.slideDown('fast');
        }

        // Loading is finished
        loading.slideUp(() => { loading.remove(); });
        ul.animate({'border-color': 'white'}, {duration: 1200});

        // Include a count
        let p = $('<p/>');
        p.text(`There are ${$('li', ul).length} subscribed channels.`);
        p.insertBefore(ul);
    }
}
