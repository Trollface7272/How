import { Guild } from "@src/class/database/Guild"
import { User } from "@src/class/database/User"

export interface Context {
    command: string
    user: User
    guild: Guild
}