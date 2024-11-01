import { Filter, ObjectId, Sort } from "mongodb"
import { db } from "./Main"
import { Mods } from "../api/osu/class/Mods"

interface ScoreData {
    room_id: number
    score_id: number
    score: number
    accuracy: number
    rank: string
    max_combo: number
    pp: number
    mods: Mods.BaseMod[]
    position: number
    positionPercent: number
}

export class DailyChallengeProfile {
    public _id: ObjectId
    public id: number
    public username: string
    public country: string
    public averagePlacement: number
    public averagePlacementPercent: number
    public dataIncludesChallenges: number[]
    public top10Percent: {
        rooms: number[]
        count: number
    }
    public top50Percent: {
        rooms: number[]
        count: number
    }
    public played: {
        rooms: number[]
        count: number
    }
    public scoreData: ScoreData[]

    constructor(data: DailyChallengeProfile, id?: number) {
        if (data) {
            Object.assign(this, data)
        } else {
            this.id = id
            this.username = ""
            this.country = ""
            this.dataIncludesChallenges = []
            this.top10Percent = {
                rooms: [],
                count: 0
            }
            this.top50Percent = {
                rooms: [],
                count: 0
            }
            this.played = {
                rooms: [],
                count: 0
            }
            this.scoreData = []
            this.averagePlacement = 0
            this.averagePlacementPercent = 0
        }
    }

    public async Save() {
        const obj = {...this}
        delete obj._id
        return db.collection("dailychallengeprofile").updateOne({
            $or: [
                { id: this.id }
            ]
        }, {
            $set: obj
        }, { upsert: true })
    }
}

class cDailyChallangeProfileFactory {

    public async GetDailyChallengeProfile(id: number) {
        const dc = await db.collection("dailychallengeprofile").findOne<DailyChallengeProfile>({
            id: id
        })
        if (!dc) return new DailyChallengeProfile(null, id)
        return new DailyChallengeProfile(dc)
    }

    public async GetDailyChallengeProfilesById(id: number[]) {
        const dc = await db.collection("dailychallengeprofile").find<DailyChallengeProfile>({
            id: { $in: id }
        }).toArray()
        
        const players = dc.map<DailyChallengeProfile>(x => new DailyChallengeProfile(x))
        const missing = id.filter(x => !players.find(y => y.id === x))
        missing.forEach(el => {
            players.push(new DailyChallengeProfile(null, el))
        })
        return players
    }

    public async GetDailyChallengeProfiles(query: Filter<DailyChallengeProfile>, sort: Sort={}, limit: number=50, offset: number=0) {
        const dc = await db.collection("dailychallengeprofile").find<DailyChallengeProfile>(query).sort(sort).limit(limit).skip(offset).toArray()
        
        return dc.map<DailyChallengeProfile>(x => new DailyChallengeProfile(x))
    }
}

export const DailyChallengeProfileFactory = new cDailyChallangeProfileFactory()