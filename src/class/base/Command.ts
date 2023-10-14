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

    protected RenderBeatmapPP(pps: { normal: { total: number } }[], accs: number[]) {
        return pps.map((el, idx) => {
            const acc = accs[idx]
            const perf = el.normal.total
            return `○ **${Math.round(acc * 100) / 100}%-**${perf.roundFixed(2)}`
        }).reverse().join(" ")
    }
}