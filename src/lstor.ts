// lstor: convenient management of localStorage items
import { z } from 'zod'

import { BinsStruct, VidsToAdd } from './app'
import * as YT from './youtube'

export default class LS {
    private static _listeners : (() => void)[] = [];

    private static _fireUpdated() {
        for (let li of this._listeners) {
            li();
        }
    }

    static addEventListener(kind : 'cacheUpdated', handler : () => void) {
        this._listeners.push(handler);
    }

    static get token() : string | undefined {
        return localStorage['ytfeed-access-token'];
    }
    static set token(s : string | undefined) {
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
        return LS.token === undefined || LS.tokenExpireDate_ms <= Date.now();
    }

    static get subsCache() : YT.SubscriptionItem[] {
        let raw = localStorage['ytfeed-subs-cache'];
        if (raw === undefined) return [];
        let json = JSON.parse(raw);
        return z.array( YT.SubscriptionItem ).parse(json);
    }
    static set subsCache(subs : YT.SubscriptionItem[]) {
        localStorage['ytfeed-subs-cache'] = JSON.stringify(subs);
        LS._fireUpdated();
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
        LS._fireUpdated();
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

    static getBinLimits(binId : string) {
        // For now, just return "global" defaults
        return {
            maxCount: 250,
            minDate: new Date(0),
        };
    }

    static getChannelLimits(chanId : string) {
        // For now, just return "global" defaults
        //                                v  thirty days
        let dflDate = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
        let dflMs = dflDate.valueOf();
        let minDateStr = localStorage['yt-feed-mindate'];
        let minDate = new Date(0);
        if (minDateStr !== undefined) {
            minDate = new Date(minDateStr);
        }
        let minMs = minDate.valueOf();
        let date = (minMs > dflMs)? minDate : dflDate;

        return {
            maxCount: 100,
            minDate:  date
        };
    }

    static get vidsToAdd() : VidsToAdd | undefined {
        let ls = localStorage['ytfeed-cached-vids-to-add'];
        if (ls === undefined)
            return ls;
        return VidsToAdd.parse(JSON.parse(ls));
    }
    static set vidsToAdd(vidsToAdd : VidsToAdd | undefined) {
        if (vidsToAdd === undefined) {
            delete localStorage['ytfeed-cached-vids-to-add'];
        } else {
            let replacer = (key : any, val : any) => {
                if (val instanceof Set) {
                    return Array.from(val);
                }
                return val;
            };
            localStorage['ytfeed-cached-vids-to-add']
                = JSON.stringify(vidsToAdd,replacer,1);
        }
        LS._fireUpdated();
    }

    static set minDate(d : Date) {
        localStorage['yt-feed-mindate'] = d.toISOString();
    }
}
