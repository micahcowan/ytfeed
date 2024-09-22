import $ from 'jquery';
import LS from './lstor';
import * as YT from './youtube';
import { App } from './app';

(window as any).LS = LS;
let outer = $('<div id="outer"/>').appendTo($('body'));
let main = $('<div id="main"/>').appendTo(outer);
let app = new App(main, new YT.Api);

let w = (window as any);
w.LS = LS;
w.app = app;
w.ytApi = app.ytApi;

$( document ).ready(() => app.run());
