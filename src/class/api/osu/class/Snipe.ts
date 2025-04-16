import { Dictionary } from "../types/MiscTypes"
import { Mods } from "./Mods"


export namespace Snipe {
    export class OldestSnipe {
        map_id: number
        map: string
        rank: number
        date: Date

        constructor(data: OldestSnipe) {
            Object.assign(this, data)
            this.date = new Date(data.date)
        }
    }

    export interface Dates {
        year: number
        count: number
    }

    export class Profile {
        user: {
            id: number
            username: string
        }
        count_total: number
        count_ranked: number
        count_loved: number
        weighted_pp: number
        average_pp: number
        average_sr: number
        average_accuracy: number
        average_score: number
        average_legacy_score: number
        total_score: number
        total_legacy_score: number
        oldest_topscore: {
            map_id: number
            set_id: number
            artist: string
            title: string
            version: string
            date_set: string
            mods: Mods.ModList
        }
        bonus_pp: number
        ranks: {
            average_score: number
            oldest_topscore: number
            count_total: number
            weighted_pp: number
            average_legacy_score: number
            total_score: number
            average_sr: number
            total_legacy_score: number
            average_pp: number
            average_accuracy: number
        }
        star_ratings: {
            min: number
            max: number
            count: number
        }[]
        dates_ranked: Dates[]
        dates_set: Dates[]

        public country: string


        public get URL() {
            return `https://snipe.huismetbenen.nl/player/${this.country}/osu/${this.user.id}`
        }

        constructor(data: Profile | { data: Profile, user: any }, country: string) {
            if ("data" in data) {
                this.user = data.user
                data = data.data
            }

            Object.assign(this, data)

            this.oldest_topscore.mods = new Mods.ModList(data.oldest_topscore.mods)
            this.country = country
        }
    }

    export class SnipeScore {
        accuracy: number
        ar: number
        bpm: number
        cs: number
        date_set: Date
        hp: number
        is_lazer_score: boolean
        legacy_score: number
        legacy_score_id: number
        max_combo: number
        mods: Mods.ModList
        od: number
        pp: number
        rank: string
        score: number
        score_id: number
        sr: number
        statistics: {
            ok: number
            meh: number
            miss: number
            great: number
            ignore_hit: number
            ignore_miss: number
            large_bonus: number
            small_bonus: number
            large_tick_hit: number
            slider_tail_hit: number
        }
        total_length: number
        user: {
            id: number
            username: string
        }

        constructor(data: SnipeScore) {
            Object.assign(this, data)
            this.date_set = new Date(data.date_set)
            this.mods = new Mods.ModList(data.mods)
        }
    }

    export class SnipeInfo {
        beatmap: {
            artist: string
            title: string
            id: number
            set_id: number
            version: string
        }
        country: string
        gamemode: 0 | 1 | 2 | 3
        new_topscore: SnipeScore
        old_topscore: SnipeScore

        constructor(data: SnipeInfo) {
            Object.assign(this, data)
        }
    }

    export class History {
        user_id: number
        history_date: Date
        count_total: number
        country: string
        weighted_pp: number
        average_pp: number
        average_sr: number
        average_acc: number
        average_score: number
        total_score: number
        count_difference: number

        constructor(data: History) {
            Object.assign(this, data)
            this.history_date = new Date(data.history_date)
        }
    }
}