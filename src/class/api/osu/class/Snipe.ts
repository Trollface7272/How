import { Dictionary } from "../types/MiscTypes"


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

    export class Profile {
        uid: number
        user_id: number
        country: string
        count_total: number
        count_ranked: number
        count_loved: number
        weighted_pp: number
        average_pp: number
        average_sr: number
        average_acc: number
        average_score: number
        total_score: number
        bonus_pp: number
        most_recent_history_value: number
        recent_history_difference: number
        player_hash: string
        donator: number
        oldest_date: Date
        oldest_date_map_id: number
        rank_count: number
        rank_weighted_pp: number
        rank_average_pp: number
        rank_average_sr: number
        rank_average_acc: number
        rank_average_score: number
        rank_total_score: number
        rank_oldest_date: number
        username: string
        discord_id: string
        mods_count: Dictionary<number>
        favourite_mods_count: Dictionary<number>
        dates_ranked: Dictionary<number>
        dates_set: Dictionary<number>
        sr_spread: Dictionary<number>


        public get URL() {
            return `https://snipe.huismetbenen.nl/player/${this.country}/osu/${this.user_id}`
        }

        constructor(data: Profile) {
            Object.assign(this, data)
            this.oldest_date = new Date(data.oldest_date)
        }
    }
    export class SnipedScore {
        index: number
        uid: string
        map_id: number
        sniped_id: number
        sniped_name: string
        sniper_id: number
        sniper_name: string
        accuracy: number
        count_300: number
        count_100: number
        count_50: number
        count_miss: number
        country: string
        max_combo: number
        mods: string
        pp: number
        score: number
        sr: number
        ar: number
        artist: string
        bpm: number
        count_normal: number
        count_slider: number
        count_spinner: number
        cs: number
        date_ranked: Date
        date_set: Date
        date_submitted: Date
        diff_name: string
        hit_length: number
        hp: number
        od: number
        osu_score_id: number
        player_id: number
        title: string
        total_length: number

        constructor(data: SnipedScore) {
            Object.assign(this, data)
            this.date_ranked = new Date(data.date_ranked)
            this.date_set = new Date(data.date_set)
            this.date_submitted = new Date(data.date_submitted)
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