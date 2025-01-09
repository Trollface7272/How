


export namespace RespektiveScoreAPI {
    export class RankHighest {
        public rank: number
        public updated_at: Date
        constructor(rank_highest: RankHighest) {
            Object.assign(this, rank_highest)
            this.updated_at = new Date(this.updated_at)
        }

    }

    export class RankHistory {
        public rank: number
        public date: Date

        constructor(history: RankHistory) {
            Object.assign(this, history)
            this.date = new Date(this.date)
        }
    }

    export class NeighbouringUser {
        username: string
        user_id: number
        score: number

        constructor(neighbouring_user: NeighbouringUser) {
            Object.assign(this, neighbouring_user)
        }
    }

    export class GetRank {
        rank: number
        user_id: number
        username: string
        score: number
        rank_highest: RankHighest
        rank_history: RankHistory[]

        public get UserUrl() {
            return `https://osu.ppy.sh/u/${this.user_id}`
        }

        constructor(get_rank: GetRank) {
            Object.assign(this, get_rank)
            this.rank_highest = new RankHighest(this.rank_highest)
            this.rank_history = this.rank_history.map(el => new RankHistory(el))
        }

    }

    export class Profile {
        rank: number
        user_id: number
        username: string
        score: number
        rank_highest: RankHighest
        rank_history: RankHistory[]
        prev: NeighbouringUser
        next: NeighbouringUser

        constructor(profile: Profile) {
            Object.assign(this, profile)
            this.rank_history = this.rank_history?.map(el => new RankHistory(el)) || []
            this.rank_highest = new RankHighest(this.rank_highest)
            this.prev = new NeighbouringUser(this.prev)
            this.next = new NeighbouringUser(this.next)
        }
    }
}