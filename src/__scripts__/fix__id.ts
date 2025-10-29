import { Connect, db } from "@src/class/database/Main"
import { ObjectId } from "mongodb"




export const fix__id = async () => {
    await Connect()
    const col = db.collection("users")
    const users = await col.find().toArray()
    const toUpdate = users.filter(user => typeof user._id === "string")
    console.log(toUpdate.length)
    for (const user of toUpdate) {
        await col.deleteOne({ _id: user._id })
        user._id = new ObjectId()
        await col.insertOne(user)
    }
}
