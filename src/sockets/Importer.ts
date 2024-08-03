import { io } from "socket.io-client"

const client = io("http://localhost:3010")

const lastImportTimes = {

}

const importing = {}

export const importScores = (userId: string, force: boolean) => {
    if (!force && ((Date.now() - lastImportTimes[userId]) < 1000 * 60 * 60 * 24)) return `You can only import scores once per day.`
    lastImportTimes[userId] = new Date()
    client.emit("import", userId)
    console.log(`Importing -> ${userId}`)
    return new Promise((resolve, reject) => {
        importing[userId] = [resolve, reject]
    })
}

client.on("import-finish", (msg) => {
    const [id, type, text] = msg.split(";")
    const [resolve, reject] = importing[id]
    if (type === "Success") resolve(text)
    else reject(text)
    delete importing[id]
})