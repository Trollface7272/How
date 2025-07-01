import { ObjectId } from "mongodb";
import { db } from "./Main";

export class DBReminder {
    public _id: ObjectId;
    public userId: string;
    public channelId: string;
    public messageId: string;
    public message: string;
    public remindAt: Date;

    public constructor(data: Partial<DBReminder>) {
        Object.assign(this, data);
        this.remindAt = new Date(this.remindAt);
    }

    public save() {
        const obj = { ...this };
        delete obj._id;
        return db.collection("reminders").updateOne({
            _id: this._id
        }, {
            $set: obj
        }, { upsert: true });
    }

    public static async GetDueReminders() {
        const reminders = await db.collection<DBReminder>("reminders").find<DBReminder>({
            remindAt: {
                $lte: new Date()
            }
        }).toArray();

        return reminders.map(r => new DBReminder(r));
    }

    public static async DeleteReminder(id: ObjectId) {
        return db.collection("reminders").deleteOne({
            _id: id
        });
    }
}
