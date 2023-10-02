import { EmbedBuilder } from "discord.js"

export class CommandBase {
    public constructor() { }

    protected RenderApiError() {
        

        const embed = new EmbedBuilder()
            .setTitle(`Error contacting osu!api`)
        return {
            embeds: [embed]
        }
    }
}