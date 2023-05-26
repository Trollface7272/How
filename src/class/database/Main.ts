import { Db, MongoClient } from "mongodb";



export const mongo = new MongoClient(process.env.DATABASE_URL, { })
export let db: Db

export const Connect = async () => {
    await mongo.connect()
    db = mongo.db(process.env.DATABASE_NAME)
}  