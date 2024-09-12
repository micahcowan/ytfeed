import $ from 'jquery';
import 'jquery-color';
import * as YT from './youtube';

async function asyncload() {
    let tube = new YT.Api;
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
}

$( document ).ready(asyncload);
