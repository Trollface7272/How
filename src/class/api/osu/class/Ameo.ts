export namespace OsuTrack {
    export class HighScore {
        beatmap_id: string
        score_id: string
        score: string
        maxcombo: string
        count50: string
        count100: string
        count300: string
        countmiss: string
        countkatu: string
        countgeki: string
        perfect: string
        enabled_mods: string
        user_id: string
        date: Date
        rank: string
        pp: string
        replay_available: "0"|"1"
        ranking: number

        constructor(score: HighScore) {
            Object.assign(this, score)
            this.date = new Date(score.date)
        }
    }
    export class Update {
        username: string
        mode: number
        playcount: number
        pp_rank: number
        pp_raw: number
        accuracy: number
        total_score: number
        ranked_score: number
        count300: number
        count50: number
        count100: number
        level: number
        count_rank_a: number
        count_rank_s: number
        count_rank_ss: number
        levelup: boolean // whether or not the user leveled up since the last update
        first: boolean // whether this is the first update for the user, meaning that there was no previous update to compare to
        exists: boolean // whether the user exists or not; if this is false, check the user ID you provided
        // an array of new hiscores for the user
        newhs: HighScore[]

        constructor(update: Update) {
            Object.assign(this, update)
            this.newhs = update.newhs.map(hs => new HighScore(hs))
        }
    }
}