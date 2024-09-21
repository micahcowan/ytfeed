import $ from 'jquery'

import { App } from './app'
import { Widget, WidgetArgs } from './widget'

// App-aware widget.
export class AppWidget extends Widget {
    protected _app : App;

    constructor(app : App, args? : WidgetArgs) {
        super(args);
        this._app = app;
    }

    // Generate an error handling function, suitable as an argument to
    //  a Promise's .catch()
    protected get errorHandler() {
        let app = this._app;
        return (err : any) => app.handleError(err);
    };

    protected makeSingleSpawner(button : JQuery<HTMLElement>,
                                makeFn : () => Widget,
                                handle? : symbol) : symbol {
        return super.makeSingleSpawner(button, () => {
            let subW = makeFn();
            this._app.insertAfterWidget(subW, this.element);
            return subW;
        }, handle);
    }
}
