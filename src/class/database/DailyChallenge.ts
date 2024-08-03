import { Filter, ObjectId } from "mongodb"
import { db } from "./Main"
import { Multiplayer } from "../api/osu/class/Multiplayer"



export class DailyChallenge extends Multiplayer.GetRooms {
    public _id: ObjectId
    public index: number
    public fetchedScores: boolean
    public total: number

    constructor(data: DailyChallenge | Multiplayer.GetRooms) {
        super(data)

        if ((data as DailyChallenge)._id) {
            this.index = (data as DailyChallenge).index
            this._id = (data as DailyChallenge)._id
            this.fetchedScores = (data as DailyChallenge).fetchedScores || false
            this.total = (data as DailyChallenge).total || 0
        } else {
            this.index = 0
            this.fetchedScores = false
            this.total = 0
        }
    }

    public async Save() {
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

    public async GetDailyChallenges(query: Filter<DailyChallenge>) {
        const dc = await db.collection("dailychallenge").find<DailyChallenge>(query).toArray()
        if (!dc) return false
        return dc.map<DailyChallenge>(x => new DailyChallenge(x))
    }

    public async GetCount(filter: Filter<DailyChallenge>) {
        return db.collection("dailychallenge").countDocuments(filter)
    }
}

export const DailyChallengeFactory = new cDailyChallangeFactory()