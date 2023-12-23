import { EmbedBuilder } from "discord.js"

export class CommandBase {
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

    protected RenderBeatmapPP(pps: { normal: { total: number } }[], accs: number[]) {
        return pps.map((el, idx) => {
            const acc = accs[idx]
            const perf = el.normal.total
            return `○ **${Math.round(acc * 100) / 100}%-**${perf.roundFixed(2)}`
        }).reverse().join(" ")
    }

    protected GetBaseEmbed(): EmbedBuilder {
        return new EmbedBuilder()
            .setColor("Random")
    }
}