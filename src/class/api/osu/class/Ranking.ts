import { HandleAsync } from "@src/Utils"
import { Fetcher } from "../Fetcher"
import { Dictionary } from "../types/MiscTypes"
import { Profile } from "./Profile"
import { Logger } from "@src/class/Logger"


export namespace Ranking {

    export class UserStatistics {
        public index: number

        public count_100: number
        public count_300: number
        public count_50: number
        public count_miss: number
        public country_rank: number
        public grade_counts: {
            a: number
            s: number
            sh: number
            ss: number
            ssh: number
        }
        public hit_accuracy: number
        public is_ranked: boolean
        public level: {
            current: number
            progress: number
        }
        public maximum_combo: number
        public play_count: number
        public play_time: number
        public pp: number
        public pp_exp: number
        public global_rank: number
        public global_rank_exp: number
        public ranked_score: number
        public replays_watched_by_others: number
        public total_hits: number
        public total_score: number

        public user: Profile.Base

        public constructor(statistics: UserStatistics, index: number) {
            Object.assign(this, statistics)
            this.user = new Profile.Base(this.user)
            this.index = index
        }
    }


    export class Rankings {
        private fetch_params: any
        private page_forward: number
        private page_backwards: number

        public cursor: { page: number }
        public ranking: UserStatistics[]
        public total: number

        public constructor(ranking: Rankings, fetch_params: any) {
            Object.assign(this, ranking)
            this.ranking = this.ranking.map((el, i) => new UserStatistics(el, i))
            this.fetch_params = fetch_params

            if (!this.cursor?.page) {
                this.cursor = {
                    page: 2
                }
            }

            this.page_backwards = this.cursor.page - 2
            if (this.page_backwards < 1) this.cursor.page = -1
            this.page_forward = this.cursor.page
            if (this.page_forward > this.total / 50) this.page_forward = -1
        }

        public reindex() {
            this.ranking.forEach((el, i) => el.index = i)
        }


        public async fetchBack(fetcher: Fetcher) {
            if (this.page_backwards === -1) return false

            const params = structuredClone(this.fetch_params)
            params["cursor[page]"] = this.page_backwards

            const [rankings, err] = await HandleAsync(fetcher.GetRankings(params))

            if (err) {
                Logger.Error(err)
                return false
            }

            this.page_backwards--
            if (this.page_backwards < 1) this.cursor.page = -1

            this.ranking.unshift(...rankings.ranking)
            this.reindex()
        }

        public async fetchForward(fetcher: Fetcher) {
            if (this.page_forward === -1) return false

            const params = structuredClone(this.fetch_params)
            params["cursor[page]"] = this.page_forward

            const [rankings, err] = await HandleAsync(fetcher.GetRankings(params))

            if (err) {
                Logger.Error(err)
                return false
            }

            this.page_forward++
            if (this.page_forward > this.total / 50) this.page_forward = -1

            this.ranking.push(...rankings.ranking)
            this.reindex()
        }
    }
}