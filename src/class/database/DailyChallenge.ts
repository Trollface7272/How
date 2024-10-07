import { Filter, ObjectId, Sort } from "mongodb"
import { db } from "./Main"
import { Multiplayer } from "../api/osu/class/Multiplayer"

interface Threshold {
    position: number
    score: number
}
interface TopThresholds {
    date: Date
    rank1: Threshold
    top10: Threshold
    top50: Threshold
    total: number
}

export class DailyChallenge extends Multiplayer.GetRooms {
    public _id: ObjectId
    public index: number
    public fetchedScores: boolean
    public total: number
    public lastUpdated: Date
    public thresholds: TopThresholds[]

    public get URL() {
        return `https://osu.ppy.sh/multiplayer/rooms/${this.id}`
    }

    constructor(data: DailyChallenge | Multiplayer.GetRooms) {
        super(data)

        if ((data as DailyChallenge)._id) {
            this.index = (data as DailyChallenge).index
            this._id = (data as DailyChallenge)._id
            this.fetchedScores = (data as DailyChallenge).fetchedScores || false
            this.total = (data as DailyChallenge).total || 0
            this.lastUpdated = (data as DailyChallenge).lastUpdated || null
            this.thresholds = (data as DailyChallenge).thresholds || []
        } else {
            this.index = 0
            this.fetchedScores = false
            this.total = 0
            this.lastUpdated = null
            this.thresholds = []
        }
    }

    public async Save() {
        this.lastUpdated = new Date()
        const obj = {...this}
        delete obj._id
        return db.collection("dailychallenge").updateOne({
            $or: [
                { id: this.id }
            ]
        }, {
            $set: obj
        }, { upsert: true })
    }
}

class cDailyChallangeFactory {

    public async GetDailyChallenge(id: number) {
        const dc = await db.collection("dailychallenge").findOne<DailyChallenge>({
            id: id
        })
        if (!dc) return false
        return new DailyChallenge(dc)
    }

    public async GetDailyChallenges(query: Filter<DailyChallenge>, limit?: number, offset?: number, sort?: Sort) {
        const q = db.collection("dailychallenge").find<DailyChallenge>(query)
        if (limit) q.limit(limit)
        if (offset) q.skip(offset)
        if (sort) q.sort(sort)
        const dc = await q.toArray()
        if (!dc) return false
        return dc.map<DailyChallenge>(x => new DailyChallenge(x))
    }

    public async GetCurrentChallenge() {
        const dc = await db.collection("dailychallenge").findOne<DailyChallenge>({
            fetchedScores: false
        })
        if (!dc) return false
        return new DailyChallenge(dc)
    }

    public async GetCount(filter: Filter<DailyChallenge>) {
        return db.collection("dailychallenge").countDocuments(filter)
    }
}

export const DailyChallengeFactory = new cDailyChallangeFactory()