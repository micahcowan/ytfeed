// lstor: convenient management of localStorage items
import { z } from 'zod'

import { BinsStruct } from './app'
import * as YT from './youtube'

export default class LS {
    static get token() : string {
        return localStorage['ytfeed-access-token'] === undefined? ''
             : localStorage['ytfeed-access-token'];
    }
    static set token(s : string) {
        localStorage['ytfeed-access-token'] = s;
    }

    static set tokenExpiresIn_s(s : number | string) {
        if (typeof s === 'string') s = Number(s);
        localStorage['ytfeed-access-token-expire-ms'] = Date.now() + (s * 1000);
    }

    static get tokenExpireDate_ms() : number {
        if (localStorage['ytfeed-access-token-expire-ms'] === undefined)
            return 0;
        return Number(localStorage['ytfeed-access-token-expire-ms']);
    }

    static get tokenExpired() : boolean {
        return LS.tokenExpireDate_ms <= Date.now();
    }

    static get subsCache() : YT.SubscriptionItem[] {
        let raw = localStorage['ytfeed-subs-cache'];
        if (raw === undefined) return [];
        let json = JSON.parse(raw);
        return z.array( YT.SubscriptionItem ).parse(json);
    }
    static set subsCache(subs : YT.SubscriptionItem[]) {
        localStorage['ytfeed-subs-cache'] = JSON.stringify(subs);
    }

    static get subsCacheDate() : Date {
        let ls = localStorage['ytfeed-subs-cache-date'];
        if (ls === undefined) {
            return new Date(0);
        }
        return new Date(ls);
    }
    static set subsCacheDate(date : Date) {
        localStorage['ytfeed-subs-cache-date'] = date.toISOString();
    }

    static get bins_json() : string | undefined {
        return localStorage['ytfeed-bins'];
    }
    static set bins_json(json : string | undefined) {
        localStorage['ytfeed-bins'] = json;
    }

    static get bins() : BinsStruct | undefined {
        let ls = localStorage['ytfeed-bins'];
        if (ls === undefined)
            return ls;
        return BinsStruct.parse(JSON.parse(ls));
    }

    static set bins(bins : BinsStruct) {
        localStorage['ytfeed-bins'] = JSON.stringify(bins,null,2);
    }

    static get chanToUploadList() : Record<string, string> {
        let ls = localStorage['ytfeed-chan-to-uploads'];
        if (ls === undefined)
            return {};
        return JSON.parse(ls);
    }
    static set chanToUploadList(m : Record<string, string>) {
        localStorage['ytfeed-chan-to-uploads'] = JSON.stringify(m,null,1);
    }
}
