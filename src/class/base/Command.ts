import { randomBytes } from "crypto"
import { EmbedBuilder } from "discord.js"
import { CommandData } from "./CommandData"
import { MessageEventData } from "../partials/MessageEvent"

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

export class CommandWithComponentsBase extends CommandBase {
    protected componentId: string
    protected oldComponentId: string
    protected data: CommandData

    constructor(data: MessageEventData) {
        super()
        this.data = new CommandData(data)
        this.componentId = randomBytes(16).toString("hex")
        this.oldComponentId = this.data.GetOldComponentId()
    }
}