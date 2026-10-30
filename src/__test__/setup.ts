import { vi, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';

const performanceBody = {
    rulesetId: 0,
    accuracy: 0.985,
    maxCombo: 1000,
    grade: 'S',
    statistics: { great: 500, ok: 10, meh: 2, miss: 0 },
    performance: {
        pp: 250,
        aim: 120,
        speed: 110,
        accuracy: 20,
        flashlight: 0,
        reading: 10,
        effective_miss_count: 0,
        speed_deviation: null,
        combo_based_estimated_miss_count: 0,
        score_based_estimated_miss_count: 0,
        aim_estimated_slider_breaks: 0,
        speed_estimated_slider_breaks: 0,
    },
    difficulty: {
        star_rating: 5.5,
        max_combo: 1000,
        aim_difficulty: 2.4,
        speed_difficulty: 2.1,
        reading_difficulty: 1.2,
        slider_factor: 0.9,
        aim_difficult_slider_count: 4,
        speed_note_count: 20,
        aim_top_weighted_slider_factor: 1,
        speed_top_weighted_slider_factor: 1,
        aim_difficult_strain_count: 1,
        speed_difficult_strain_count: 1,
        reading_difficult_note_count: 1,
        nested_score_per_object: 1,
        legacy_score_base_multiplier: 1,
        maximum_legacy_combo_score: 1000000,
    },
};

vi.mock('edge-js', () => ({
    func: vi.fn(() => (input: any, cb: (err: null, result: any) => void) => {
        const body = {
            ...performanceBody,
            accuracy: input?.accuracy ?? performanceBody.accuracy,
            maxCombo: input?.maxCombo ?? performanceBody.maxCombo,
        };
        cb(null, {
            ok: true,
            improvement: input?.improvement ?? 'auto',
            ...body,
            normal: body,
            fc: body,
            ss: body,
            improved: body,
        });
    }),
}));

Date.prototype.toDiscordToolTip = function (): string {
    return `<t:${Math.floor(this.getTime() / 1000)}:R>`;
};

Number.prototype.roundFixed = function (this: number, decimalPlaces: number): string {
    const multiplier = Math.pow(10, decimalPlaces);
    return (Math.round(this * multiplier) / multiplier).toFixed(decimalPlaces);
};

Number.prototype.round = function (this: number, decimalPlaces: number): number {
    const multiplier = Math.pow(10, decimalPlaces);
    return Math.round(this * multiplier) / multiplier;
};

const lookup = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "k" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "B" },
    { value: 1e12, symbol: "T" },
    { value: 1e15, symbol: "P" },
    { value: 1e18, symbol: "E" }
].reverse();

const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;

Number.prototype.asScientificNotation = function (this: number): string {
    const item = lookup.find((item) => this >= item.value);
    return item ? (this / item.value).toLocaleString(undefined, { maximumFractionDigits: 2 }).replace(rx, "$1") + item.symbol : "0";
};

Number.prototype.asTime = function (this: number): string {
    const minutes = Math.floor(this / 60);
    const seconds = this % 60;
    if (seconds < 10) return `${minutes}:0${seconds}`;
    return `${minutes}:${seconds}`;
};

Number.prototype.roundDynamicFixed = function (this: number, minDigits: number, maxDigits: number): string {
    const digits = Math.min(maxDigits, Math.max(minDigits, parseFloat(this.toPrecision(5)).toString().split(".")[1]?.length ?? 0));
    return this.roundFixed(digits);
};

String.prototype.isNumber = function (this: string): boolean {
    return /^\d+$/.test(this);
};

String.prototype.capitalize = function (this: string): string {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

Array.prototype.sum = function (this: Array<any>): number {
    return this.reduce((a, b) => a + b, 0);
};

const mockContext: Record<string, any> = { user: null };

vi.mock('node-execution-context', () => ({
    default: {
        get: vi.fn(() => mockContext),
        set: vi.fn((ctx: any) => {
            Object.assign(mockContext, ctx);
        }),
        create: vi.fn(() => mockContext),
        run: vi.fn((a: any, b?: any) => {
            if (typeof a === 'function') {
                if (b && typeof b === 'object') Object.assign(mockContext, b);
                return a();
            }
            if (typeof b === 'function') return b();
        }),
    },
}));

function valueAt(doc: any, path: string) {
    return path.split('.').reduce((current, key) => current?.[key], doc);
}

function sameId(a: any, b: any) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a === 'object' || typeof b === 'object') return String(a) === String(b);
    return false;
}

function matches(doc: any, filter: any): boolean {
    if (!filter) return true;
    for (const [key, expected] of Object.entries(filter)) {
        if (key === '$or') {
            if (!(expected as any[]).some((part) => matches(doc, part))) return false;
            continue;
        }
        if (key === '$and') {
            if (!(expected as any[]).every((part) => matches(doc, part))) return false;
            continue;
        }
        const actual = valueAt(doc, key);
        if (expected && typeof expected === 'object' && !(expected instanceof Date) && !Array.isArray(expected) && !(expected as any)._bsontype) {
            const ops = expected as Record<string, any>;
            if ('$lte' in ops && !(actual <= ops.$lte)) return false;
            if ('$lt' in ops && !(actual < ops.$lt)) return false;
            if ('$gte' in ops && !(actual >= ops.$gte)) return false;
            if ('$gt' in ops && !(actual > ops.$gt)) return false;
            if ('$eq' in ops && !sameId(actual, ops.$eq) && actual !== ops.$eq) return false;
            if ('$ne' in ops && (actual === ops.$ne || sameId(actual, ops.$ne))) return false;
            if ('$in' in ops && !ops.$in.some((item: any) => item === actual || sameId(item, actual))) return false;
            if ('$nin' in ops && ops.$nin.some((item: any) => item === actual || sameId(item, actual))) return false;
            if ('$exists' in ops && (actual != null) !== Boolean(ops.$exists)) return false;
            const known = ['$lte', '$lt', '$gte', '$gt', '$eq', '$ne', '$in', '$nin', '$exists', '$all', '$size', '$not'];
            if (!known.some((op) => op in ops) && JSON.stringify(actual) !== JSON.stringify(expected)) return false;
            continue;
        }
        if (expected instanceof Date || actual instanceof Date) {
            if (new Date(actual as any).getTime() !== new Date(expected as any).getTime()) return false;
            continue;
        }
        if (actual !== expected && !sameId(actual, expected)) return false;
    }
    return true;
}

const collections = new Map<string, any[]>();

function collection(name: string) {
    if (!collections.has(name)) collections.set(name, []);
    const docs = collections.get(name)!;

    return {
        async findOne(filter: any) {
            return docs.find((doc) => matches(doc, filter)) ?? null;
        },
        find(filter: any = {}) {
            const cursor = {
                _limit: Number.POSITIVE_INFINITY,
                _skip: 0,
                _sort: null as Record<string, number> | null,
                limit(n: number) { this._limit = n; return this; },
                skip(n: number) { this._skip = n; return this; },
                sort(spec: Record<string, number>) { this._sort = spec; return this; },
                async toArray() {
                    let rows = docs.filter((doc) => matches(doc, filter));
                    if (this._sort) {
                        const [key, dir] = Object.entries(this._sort)[0];
                        rows = [...rows].sort((a, b) => {
                            const av = valueAt(a, key);
                            const bv = valueAt(b, key);
                            if (av < bv) return -1 * dir;
                            if (av > bv) return 1 * dir;
                            return 0;
                        });
                    }
                    return rows.slice(this._skip, this._skip + this._limit);
                },
            };
            return cursor;
        },
        async updateOne(filter: any, update: any, options: { upsert?: boolean } = {}) {
            const index = docs.findIndex((doc) => matches(doc, filter));
            const set = update?.$set ?? {};
            if (index >= 0) {
                docs[index] = { ...docs[index], ...set };
                return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
            }
            if (options.upsert) {
                docs.push({ ...filter, ...set });
                return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
            }
            return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
        },
        async insertOne(doc: any) {
            docs.push({ ...doc });
            return { acknowledged: true, insertedId: doc._id };
        },
        async deleteOne(filter: any) {
            const index = docs.findIndex((doc) => matches(doc, filter));
            if (index >= 0) docs.splice(index, 1);
            return { deletedCount: index >= 0 ? 1 : 0 };
        },
        async deleteMany(filter: any) {
            const before = docs.length;
            const kept = docs.filter((doc) => !matches(doc, filter));
            docs.splice(0, docs.length, ...kept);
            return { deletedCount: before - docs.length };
        },
        async countDocuments(filter: any = {}) {
            return docs.filter((doc) => matches(doc, filter)).length;
        },
        async distinct(field: string, filter: any = {}) {
            return [...new Set(docs.filter((doc) => matches(doc, filter)).map((doc) => valueAt(doc, field)))];
        },
    };
}

export function __resetDb() {
    collections.clear();
}

vi.mock('../class/database/Main', () => ({
    Connect: vi.fn().mockResolvedValue(undefined),
    Disconnect: vi.fn().mockResolvedValue(undefined),
    db: { collection },
    __resetDb,
}));

beforeEach(() => {
    __resetDb();
});

import * as OsuUtils from '../class/api/osu/Utils';
import { EmojiFactory } from '../class/Emojis';

vi.spyOn(OsuUtils, 'DownloadWithQueue').mockImplementation(async (_url: string, path: string) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, 'osu file format v14\n');
});

vi.spyOn(EmojiFactory, 'GetEmoji').mockImplementation((name?: string) => name ? '⭐' : '');
vi.spyOn(EmojiFactory, 'GetDifficultyEmoji').mockReturnValue('⭐');
