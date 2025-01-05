import { ObjectId } from "mongodb"
import { db } from "./Main"

export enum EventType {
    News = "News",
    RankedBeatmaps = "Ranked Beatmaps",
    QualifiedBeatmaps = "Qualified Beatmaps",
}

interface trackingChannel {
    id: string,
    modes: number[]
}

export class Event {
    public _id: ObjectId
    public name: EventType
    public channels: trackingChannel[]
    public lastCheck: Date

    constructor(data: Event) {
        Object.assign(this, data)
    }

    public async Save() {
        const obj = { ...this }
        delete obj._id
        return db.collection("events").updateOne({
            _id: this._id
        }, {
            $set: obj
        }, { upsert: true })
    }
}

class cEventFactory {

    public async GetEvent(type: EventType) {
        const event = await db.collection("events").findOne<Event>({
            name: type
        })
        return new Event(event)
    }

    public async GetEvents(types: EventType[]) {
        const events = await db.collection("events").find<Event>({
            name: { $in: types }
        }).toArray()
        return events.map(e => new Event(e))
    }
}

export const EventFactory = new cEventFactory()