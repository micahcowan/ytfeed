import { App } from './app'
import { WidgetArgs } from './widget'
import { AppWidget } from './w-app'

export class GetChanVidsWidget extends AppWidget {
    constructor(app : App, args? : WidgetArgs) {
        super(app, args);
    }
}
