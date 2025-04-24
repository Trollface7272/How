import { Guild } from "@src/class/database/Guild"
import { User } from "@src/class/database/User"
import { TextChannel } from "discord.js"

export interface Context {
    command: string
    user: User
    guild: Guild
    channel: TextChannel
}