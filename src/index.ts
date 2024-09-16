import $ from 'jquery';
import * as YT from './youtube';
import { App } from './ui';

let outer = $('<div id="outer"/>').appendTo($('body'));
let main = $('<div id="main"/>').appendTo(outer);
let app = new App(main, new YT.Api);
$( document ).ready(() => app.run());
