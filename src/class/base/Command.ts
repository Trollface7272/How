import { randomBytes } from "crypto"
import { CommandData } from "./CommandData"
import { MessageEventData } from "../partials/MessageEvent"
import { ErrorHandler } from "./ErrorHandler"

export class CommandBase extends ErrorHandler {
    public constructor() { super() }

    protected RenderBeatmapPP(pps: { normal: { total: number } }[], accs: number[]) {
        return pps.map((el, idx) => {
            const acc = accs[idx]
            const perf = el.normal.total
            return `○ **${Math.round(acc * 100) / 100}%-**${perf.roundFixed(2)}`
        }).reverse().join(" ")
    }

    protected NormalizeDatedData(values: { start_date: string, count: number }[], options: {start?: Date, end?: Date, yearly?: boolean}={}): [number[], string[]] {
        const {start, end, yearly} = options
        if (yearly) return this.NormalizeYearlyDatedData(values, options)
        const from = start ?? new Date(values[0].start_date)
        const to = end ?? new Date(values[values.length - 1].start_date)
        from.setHours(0)
        to.setHours(0)
        const months = (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth() + 1
        const data: {date: Date, count: number}[] = []
        for(let i = 0; i <= months; i++) {
            const date = new Date(from)
            date.setMonth(date.getMonth() + i)
            const pc = values.find(x => {
                const d = new Date(x.start_date)
                d.setHours(0)
                return d.getTime() === date.getTime()
            })
            data.push({
                date: date,
                count: pc ? pc.count : 0
            })
        }

        const playcountNums = data.map(x => x.count)
        const labels = data.map(x => x.date.getMonth() + 1 + "/" + x.date.getFullYear())
        return [playcountNums, labels]
    }

    private NormalizeYearlyDatedData(values: { start_date: string, count: number }[], {start, end, yearly}: {start?: Date, end?: Date, yearly?: boolean}): [number[], string[]] {
        const from = start ?? new Date(values[0].start_date)
        const to = end ?? new Date(values[values.length - 1].start_date)

        const years = to.getFullYear() - from.getFullYear() + 1
        const data: {date: Date, count: number}[] = []
        for(let i = 0; i < years; i++) {
            const date = new Date(from)
            date.setFullYear(date.getFullYear() + i)
            const pc = values.find(x => {
                const d = new Date(x.start_date)
                return d.getFullYear() === date.getFullYear()
            })
            data.push({
                date: date,
                count: pc ? pc.count : 0
            })
        }

        const playcountNums = data.map(x => x.count)
        const labels = data.map(x => x.date.getFullYear().toString())
        return [playcountNums, labels]
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