import $ from 'jquery';
import * as YT from './youtube';

function load() : void {
    let tube = new YT.Api;
    let body = $('body');
    body.append('<h1>Hello, lurdo!</h1>');
    let ul = $('<ul />');
    body.append(ul);
    let loading = $('<li><em>loading...</en></li>');
    ul.append(loading);
    let iter = tube.subscriptions.getAsyncIter();
    let harvester = (result : IteratorResult<YT.Channel>) => {
        let li = $('<li />');
        li.text(`${result.value.title} (${result.value.id})`);
        li.insertBefore(loading);
        if (result.done) {
            loading.remove();
        }
        else {
            iter.next().then(harvester);
        }
    };
    iter.next().then(harvester);
}

$( document ).ready(load);
