import { EmbedBuilder } from "discord.js"

export class ErrorRenderer {
    public constructor() { }

    protected RenderApiError() {

        const embed = this.GetBaseEmbed()
            .setTitle(`Error contacting osu!api`)
        return {
            embeds: [embed]
        }
    }

    protected RenderNoUserError() {
        const embed = this.GetBaseEmbed()
            .setDescription(`**Please link your osu! account using /link**`)
        return {
            embeds: [embed]
        }
    }

    protected GetBaseEmbed(): EmbedBuilder {
        return new EmbedBuilder()
            .setColor("Random")
    }

    protected RenderNoBeatmapError() {
        const embed = this.GetBaseEmbed()
            .setDescription(`**No beatmap found**`)
        return {
            embeds: [embed]
        }
    }

    protected RenderBeatmapUnscoreable() {
        const embed = this.GetBaseEmbed()
            .setDescription(`**Beatmap does not have leaderboards**`)
        return {
            embeds: [embed]
        }
    }

    protected RenderNoScores() {
        const embed = this.GetBaseEmbed()
            .setDescription(`**No scores found**`)
        return {
            embeds: [embed]
        }
    }

    protected RenderNoBeatmapsFound() {
        const embed = this.GetBaseEmbed()
            .setDescription(`**No beatmaps found**`)
        return {
            embeds: [embed]
        }
    }
}