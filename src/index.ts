import $ from 'jquery';
import * as YT from './youtube';
import App from './ui';

let app = new App($('body'), new YT.Api);
$( document ).ready(() => app.run());
