import "./Prestart"
import { Client } from "@src/class/Client"
import {DBReminder} from "@database/Reminder"

export const client: Client = new Client();

(async () => {
    client.Start(process.env.DISCORD_TOKEN)
})()

import "./Server"