import { randomBytes } from "crypto"
import { EmbedBuilder } from "discord.js"
import { CommandData } from "./CommandData"
import { MessageEventData } from "../partials/MessageEvent"
import { ErrorRenderer } from "./ErrorRenderer"

export class CommandBase extends ErrorRenderer {
    public constructor() { super() }

    protected RenderBeatmapPP(pps: { normal: { total: number } }[], accs: number[]) {
        return pps.map((el, idx) => {
            const acc = accs[idx]
            const perf = el.normal.total
            return `○ **${Math.round(acc * 100) / 100}%-**${perf.roundFixed(2)}`
        }).reverse().join(" ")
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