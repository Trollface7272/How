import { Client } from "@src/class/Client";


(async () => {
    new Client().Start(process.env.DISCORD_TOKEN)
})()