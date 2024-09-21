import $ from 'jquery'
import { z } from 'zod';

import { App, BinsStruct } from './app'
import { WidgetArgs } from './widget'
import { AppWidget } from './w-app'
import LS from './lstor'
import * as YT from './youtube'

export class BinsEditWidget extends AppWidget {
    _ta : JQuery<HTMLElement>;
    _btn : JQuery<HTMLElement>;

    constructor(app: App, args?: WidgetArgs) {
        super(app, args);
        this.setTitle('Edit Bin Assignments (JSON)');

        let ec = this._ec;
        let ta = this._ta = $('<textarea></textarea>').appendTo(ec);
        let bins = LS.bins_json;
        if (bins !== undefined) {
            ta.val(bins);
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
                    let json = val;
                    LS.bins = BinsStruct.parse(JSON.parse(json));
                }
                catch(err : any) {
                    console.error(`Error while parsing Bins JSON: ${val}`);
                    this.errorHandler(err);
                }
            });
    }
}
