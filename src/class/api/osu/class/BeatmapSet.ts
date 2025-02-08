import { Beatmap as _Beatmap } from "./Beatmap"
import { Mods } from "./Mods"
import { Score } from "./Score"

export namespace BeatmapSet {
    //Helper Types
    export interface Covers {
        "cover": string
        "cover@2x": string
        "card": string
        "card@2x": string
        "list": string
        "list@2x": string
        "slimcover": string
        "slimcover@2x": string
    }
    export interface Availability {
        download_disabled: boolean
        more_information?: string
    }
    export interface Hype {
        current: number
        required: number
    }
    export interface Nominations {
        current: number
        required: number
    }

    //BeatmapSet Types
    export class Compact {
        artist: string
        artist_unicode: string
        covers: Covers
        creator: string
        favourite_count: number
        id: number
        nsfw: boolean
        play_count: number
        preview_url: string
        source: string
        status: string
        title: string
        title_unicode: string
        user_id: number
        video: boolean
        track_id: number
        constructor(set: Compact) {
            Object.assign(this, set)
        }
    }
    export class Base extends Compact {
        availability: Availability
        bpm: number
        can_be_hyped: boolean
        discussion_enabled: boolean
        discussion_locked: boolean
        hype: Hype
        is_scoreable: boolean
        last_updated: Date
        legacy_thread_url: string
        nominations?: Nominations
        nominations_summary?: Nominations
        ranked: -2 | -1 | 0 | 1 | 2 | 3 | 4
        ranked_date: Date
        storyboard: boolean
        submitted_date: Date
        tags: string

        public get RankedDate() {
            return new Date(this.ranked_date)
        }

        public FixTypes() {
            this.ranked_date = new Date(this.ranked_date)
            this.last_updated = new Date(this.last_updated)
            this.submitted_date = new Date(this.submitted_date)
        }

        constructor(set: Base) {
            super(set)
            Object.assign(this, set)
            this.FixTypes()
        }
    }
    //Beatmapset types for Beatmap endpoints
    export namespace Beatmap {
        export class FromId extends Base {
            ratings: [number, number, number, number, number, number, number, number, number, number]
            constructor(set: FromId) {
                super(set)
                Object.assign(this, set)
            }
        }
        export class FromIds extends Compact {
            ratings: [number, number, number, number, number, number, number, number, number, number]
            constructor(set: FromIds) {
                super(set)
                Object.assign(this, set)
            }
        }
        export type Lookup = FromId
    }
    export class SearchSet extends Base {
        beatmaps: _Beatmap.Base[]

        public get Url() {
            return `https://osu.ppy.sh/s/${this.id}`
        }

        public get CreatorUrl() {
            return `https://osu.ppy.sh/u/${this.user_id}`
        }

        public get Download() {
            return this.availability.download_disabled ? null : `https://osu.ppy.sh/d/${this.id}`
        }

        public get DownloadNovid() {
            return this.availability.download_disabled ? null : `https://osu.ppy.sh/d/${this.id}n`
        }

        public get DifficultyEmojis() {
            return this.beatmaps.map(map => map.DifficultyEmoji).join(" ")
        }

        public get BgPreview() {
            return `https://b.ppy.sh/thumb/${this.id}l.jpg`
        }

        constructor(set: SearchSet) {
            super(set)
            Object.assign(this, set)
            
            this.FixTypes()
        }

        public FixTypes(): void {
            super.FixTypes()
            this.beatmaps = this.beatmaps.sort((a, b) => a.difficulty_rating - b.difficulty_rating).map(map => {
                return new _Beatmap.Base(map, new Mods.ModList([]))
            })
        }
    }
    export class Search {
        beatmapsets: SearchSet[]
        cursor_string: string
        cursor: {
            approved_date: string
            _id: string
        }
        search: {
            sort: "string"
        }
        recommended_difficulty?: number
        error?: string
        total: number
        constructor(sets: Search) {
            Object.assign(this, sets)
            this.beatmapsets = this.beatmapsets.map(map => {
                return new SearchSet(map)
            })
        }
    }
    export class FromId extends Base {
        beatmaps: _Beatmap.Compact[]
        constructor(set: FromId) {
            super(set)
            Object.assign(this, set)
            this.FixTypes()
        }

        public FixTypes(): void {
            super.FixTypes()
            this.beatmaps = this.beatmaps.map(map => {
                return new _Beatmap.Compact(map)
            })
            this.beatmaps = this.beatmaps.sort((a, b) => a.difficulty_rating - b.difficulty_rating).map(map => {
                return new _Beatmap.Compact(map)
            })
        }
    }
}