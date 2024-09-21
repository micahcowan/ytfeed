import $ from 'jquery'

export interface WidgetArgs {
    title?: string | JQuery<HTMLElement>,
    contents?: JQuery<HTMLElement>,
    closeable?: boolean,
}

export class WidgetCloseEvent {
    /*
    // No! Don't make it cancellable, bc
    // then people would handle the "removal" with cleanup,
    // and then the removal gets cancelled afterwards? Can't work.

    //protected targetWidget
    protected preventDefault : () => void;

    get cancellable() {
        return true;
    }

    constructor(prevDfltHandler : () => void) {
        this.preventDefault = prevDfltHandler;
    }
    */
}

export class Widget {
    private _openSubs : Record<symbol, { widget: Widget, button: JQuery<HTMLElement> }> = {};
    protected _ew : JQuery<HTMLElement>;
    protected _cb? : JQuery<HTMLElement>;
    protected _sum : JQuery<HTMLElement>;
    protected _et : JQuery<HTMLElement>;
    protected _no : JQuery<HTMLElement>;
    protected _ec : JQuery<HTMLElement>;
    private _evListeners : ( (ev? : WidgetCloseEvent) => void )[] = [];

    get element() : JQuery<HTMLElement> {
        return this._ew;
    }

    get title() : JQuery<HTMLElement> {
        return this._et;
    };
    setTitle(title: string | JQuery<HTMLElement>) {
        this._et.empty();
        if (typeof title == "string") {
            this._et.text(title);
        }
        else {
            this._et.append(title);
        }
    }

    get contents() : JQuery<HTMLElement> {
        return this._ec;
    };
    setContents(contents: JQuery<HTMLElement>) {
        this._ec.empty();
        this._ec.append(contents);
    }

    close() {
        /*
        let cancelled = false;
        let fn = () => { cancelled = true; }
        ...
        if (cacnelled) return;
        */

        let ew = this._ew;
        let listeners = this._evListeners;
        let ev = new WidgetCloseEvent(/*fn*/);
        ew.slideUp(() => {
            ew.remove();
            for (let listener of listeners) {
                listener(ev);
            }
        });
    }

    addEventListener(evType: 'close',
                     handler: (ev? : WidgetCloseEvent) => void) {
        this._evListeners.push(handler);
    }

    protected _closeReceived(handle : symbol) {
        this._openSubs[handle].button.removeAttr('disabled');
        delete this._openSubs[handle];
    }

    protected makeSingleSpawner(button : JQuery<HTMLElement>,
                                makeFn : () => Widget,
                                handle : symbol = Symbol(),
                                closeHandler? : () => void) : symbol {
        if (handle in this._openSubs) {
            button.attr('disabled','disabled');
            this._openSubs[handle].button = button;
        }

        if (closeHandler === undefined) {
            closeHandler = () => {
                button.removeAttr('disabled');
            };
        }

        button.click(
            () => {
                closeHandler();
                let subW = makeFn();
                this._openSubs[handle] = { widget: subW, button: button };
                subW.addEventListener('close', () => { this._closeReceived(handle); });
            }
        );
        return handle;
    }

    constructor(args?: WidgetArgs) {
        this._ew = $('<div class="widget" />');
        let dt = $('<details open="open"></details>').appendTo(this._ew);
        this._sum = $('<summary class="widget-top"></summary>').appendTo(dt);
        let whp = $('<div class="widget-heading-parent"></div>').appendTo(this._sum);
        this._et = $('<span class="widget-heading"></span>').appendTo(whp);
        //let cbp = $('<div class="widget-close-button-parent" />').appendTo(this._ew);
        if (args === undefined ||args.closeable === undefined
            || args.closeable) {
            this._cb = $('<button class="widget-close-button">X</button>').appendTo(whp);
            this._cb.click( () => this.close() );
        }
        this._no = $('<div class="widget-contents-no-overflow" />').appendTo(dt);
        this._ec = $('<div class="widget-contents" />').appendTo(dt);

        if (args !== undefined) {
            let { title, contents} = args;

            if (title !== undefined) this.setTitle(title);
            if (contents !== undefined) this.setContents(contents);
        }
    }
}
