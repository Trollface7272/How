import { Guild } from "discord.js";

export class RawGuild {
    public get id() {
        return this.guild.id
    }
    constructor(
        private guild: Guild
    ) { }
}