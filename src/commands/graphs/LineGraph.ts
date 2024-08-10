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
import { DailyChallengeFactory } from "@src/class/database/DailyChallenge";
import { ChartDataset } from "chart.js";

enum Types {
    Playcount,
    Rank,
    WatchedReplays,
    DailyChallengeThresholds
}
interface args {
    Username: string
    Gamemode: Gamemode
    Type: Types
    Ranks: boolean
}

class LineGraphData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        const cmd = this.data.GetCommand()
        let type: Types
        switch (cmd) {
            case "dcth":
                type = Types.DailyChallengeThresholds
                break
            case "pc":
            case "playcount":
                type = Types.Playcount
                break
            case "rank":
                type = Types.Rank
                break
            case "wr":
            case "watchedreplays":
                type = Types.WatchedReplays
                break
        }
        return {
            Gamemode: this.data.GetGamemode(),
            Type: type as Types || this.data.GetNumber("type", ["-type", "-t", "t"]) as Types,
            Ranks: this.data.GetBoolean("ranks", ["-ranks", "-rank", "ranks", "rank"]),
            Username: this.data.GetUsername()
        }
    }
}

class Playcount extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["playcount", "pc", "wr", "watchedreplays", "rank", "graph", "dcth"]
    private data: LineGraphData


    constructor(data: MessageEventData) {
        super()
        this.data = new LineGraphData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()
        const { Username: _username, Gamemode, Type, Ranks } = this.data.args

        const Username = _username || user.osu?.username

        const fetcher = await Fetcher.Create(user.id)
        const [profile, profileError] = await HandleAsync(fetcher.GetProfile({ Username, Gamemode: Gamemode }))
        if (profileError) {
            Logger.Error(profileError)
            return CommandResponseCodes.UnknownError
        }

        let data: [number[], string[]]
        let datasets: ChartDataset<"line">[]
        switch (Type) {
            case Types.Playcount:
                data = this.GetPlaycountData(profile)
                break
            case Types.Rank:
                data = this.GetRankData(profile)
                break
            case Types.WatchedReplays:
                data = this.GetWatchedReplaysData(profile)
                break
            case Types.DailyChallengeThresholds:
                const vals = await this.GetDailyChallengeThresholdsData(profile)
                datasets = vals[0]
                data = [null, vals[1]]
                break
        }
        const [playcountNums, labels] = data

        const options: ChartOptions = {
            reverse: false, yLines: true, fill: "start", labels, data: playcountNums, datasets: datasets,
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

        if (Type === Types.Rank) {
            options.reverse = true
            options.fill = null
            options.yTitle.text = "Rank"
        } else if (Type === Types.WatchedReplays) {
            options.yTitle.text = "Replays watched"
        } else if (Type === Types.DailyChallengeThresholds) {
            options.yTitle.text = "Top X% score"
            options.fill = null
            options.legend = true
            if (Ranks) {
                options.reverse = true
            options.yTitle.text = "Top X% rank"
        }
        }

        const chart = new LineChart(options)

        const chartBuffer = await chart.Render()
        await this.data.Reply({ files: [{ attachment: chartBuffer, name: "chart.png" }] })

        return CommandResponseCodes.OK
    }
    public async GetDailyChallengeThresholdsData(profile: Profile.FromId): Promise<[ChartDataset<"line">[], string[]]> {
        const challenge = await DailyChallengeFactory.GetCurrentChallenge()
        if (!challenge) return [[], []]
        const datasets: ChartDataset<"line">[] = []
        const labels: string[] = []
        const data = {
            top10: [],
            top50: [],
            first: []
        }
        for (const threshold of challenge.thresholds) {
            labels.push(threshold.date.toDateString())
            if (this.data.args.Ranks) {
                data.top10.push(threshold.top10.position)
                data.top50.push(threshold.top50.position)
                data.first.push(threshold.rank1.position)
            } else {
                data.top10.push(threshold.top10.score)
                data.top50.push(threshold.top50.score)
                data.first.push(threshold.rank1.score)
            }
        }
        datasets.push({
            data: data.top10,
            borderColor: "rgb(0, 255, 0)",
            showLine: true,
            tension: 0,
            label: "Top 10%"
        })
        datasets.push({
            data: data.top50,
            borderColor: "rgb(255, 0, 0)",
            showLine: true,
            tension: 0,
            label: "Top 50%"
        })
        if (!this.data.args.Ranks) 
            datasets.push({
                data: data.first,
                borderColor: "rgb(0, 0, 255)",
                showLine: true,
                tension: 0,
                label: "1st"
            })
        return [datasets, labels]
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


}

CommandEmitterInstance.AddCommand(Playcount, Playcount.names)