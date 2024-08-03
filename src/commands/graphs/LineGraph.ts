import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { HandleAsync } from "@src/Utils";
import { Gamemode } from "@src/class/api/osu/types/MiscTypes";
import { Logger } from "@src/class/Logger";
import { LineChart, ChartOptions, ChartPlugins } from "@src/class/graphs/Line";
import { Profile } from "@src/class/api/osu/class/Profile";

interface args {
    Username: string
    Gamemode: Gamemode
    Type: "playcount"|"rank"|"watchedreplays"
}

class LineGraphData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        const cmd = this.data.GetCommand()
        let type = ""
        switch (cmd) {
            case "pc":
            case "playcount":
                type = "playcount"
                break
            case "rank":
                type = "rank"
                break
            case "wr":
            case "watchedreplays":
                type = "watchedreplays"
                break
        }
        return {
            Gamemode: this.data.GetGamemode(),
            Type: type as args["Type"] ||this.data.GetString("type", ["-type", "-t", "t"]) as args["Type"],
            Username: this.data.GetUsername()
        }
    }
}

class Playcount extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["playcount", "pc", "wr", "watchedreplays", "rank", "graph"]
    private data: LineGraphData


    constructor(data: MessageEventData) {
        super()
        this.data = new LineGraphData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()
        const { Username: _username, Gamemode, Type } = this.data.args

        const Username = _username || user.osu?.username

        const fetcher = await Fetcher.Create(user.id)
        const [profile, profileError] = await HandleAsync(fetcher.GetProfile({Username, Gamemode: Gamemode}))
        if(profileError) {
            Logger.Error(profileError)
            return CommandResponseCodes.UnknownError
        }

        let data: [number[], string[]]
        switch (Type) {
            case "playcount":
                data = this.GetPlaycountData(profile)
                break
            case "rank":
                data = this.GetRankData(profile)
                break
            case "watchedreplays":
                data = this.GetWatchedReplaysData(profile)
                break
        }
        const [playcountNums, labels] = data

        const options: ChartOptions = {
            reverse: false, yLines: true, fill: "start", labels, data: playcountNums,
            yTitle: {
                display: true,
                text: "Playcount",
                color: "rgb(200, 200, 200)",
                font: {
                    size: 20
                }
            },
            plugins: [ChartPlugins.osuGraphBgColorPlugin]
        }

        if (Type === "rank") {
            options.reverse = true
            options.fill = null
            options.yTitle.text = "Rank"
        } else if (Type === "watchedreplays") {
            options.yTitle.text = "Replays watched"
        }

        const chart = new LineChart(options)

        const chartBuffer = await chart.Render()
        await this.data.Reply({ files: [{ attachment: chartBuffer, name: "chart.png" }] })

        return CommandResponseCodes.OK
    }

    private GetPlaycountData(profile: Profile.FromId): [number[], string[]] {
        return this.NormalizeDatedData(profile.monthly_playcounts)
    }

    private GetRankData(profile: Profile.FromId): [number[], string[]] {
        return [profile.rank_history.data, null]
    }

    private GetWatchedReplaysData(profile: Profile.FromId): [number[], string[]] {
        return this.NormalizeDatedData(profile.replays_watched_counts)
    }

    private NormalizeDatedData(values: { start_date: string, count: number }[]): [number[], string[]] {
        const from = new Date(values[0].start_date)
        const to = new Date(values[values.length - 1].start_date)
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
}

CommandEmitterInstance.AddCommand(Playcount, Playcount.names)