import $ from 'jquery'

import { App } from './app'
import { WidgetArgs } from './widget'
import { AppWidget } from './w-app'
import * as YT from './youtube'

const lsBins = 'ytfeed-bins';

export class BinsWidget extends AppWidget {
    _ta : JQuery<HTMLElement>;
    _btn : JQuery<HTMLElement>;

    constructor(app: App, args?: WidgetArgs) {
        super(app, args);
        this.setTitle('Bins');

        let ec = this._ec;
        let ta = this._ta = $('<textarea></textarea>').appendTo(ec);
        if (localStorage[lsBins] !== undefined) {
            ta.val(localStorage[lsBins]);
        }
        let btn = this._btn = $('<button>Update</button>').appendTo(ec)
            .click( () => {
                let val = ta.val();
                if (val === undefined) {
                    val = ''
                } else if (typeof val !== 'string') {
                    val = val.toString();
                }
                try {
                    let json = JSON.stringify(JSON.parse(val),null,2);
                    localStorage[lsBins] = json;
                }
                catch(err : any) {
                    err.message += `\nJSON: ${val}`;
                    this.errorHandler(err);
                }
            });
    }
}
