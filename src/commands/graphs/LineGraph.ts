import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { CommandGroup, CommandHelp } from "@src/class/help/CommandHelp";
import { GamemodeArg, UsernameArg } from "@src/utils/discord/help";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { HandleAsync } from "@src/Utils";
import { Gamemode } from "@src/class/api/osu/types/MiscTypes";
import { Logger } from "@src/class/Logger";
import { LineChart, ChartOptions, ChartPlugins } from "@src/class/graphs/Line";
import { Profile } from "@src/class/api/osu/class/Profile";
import { DailyChallengeFactory } from "@src/class/database/DailyChallenge";
import { ChartDataset } from "chart.js";
import { CommandHelpArg } from "@src/class/help/CommandHelpArg";

enum Types {
    Playcount,
    Rank,
    WatchedReplays,
    DailyChallengeThresholds
}

enum TopTypes {
    First="first",
    Top10="top10",
    Top50="top50",
    All="all"
}

interface args {
    Username: string
    Gamemode: Gamemode
    Type: Types
    Ranks: boolean
    Top: TopTypes
}

class LineGraphData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        const cmd = this.data.GetCommand()
        let top: TopTypes = TopTypes.All
        let type: Types
        switch (cmd) {
            case "dctg":
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
        
        if (this.data.GetBoolean("top10", ["-top10", "-t10", "top10", "t10"])) 
            top = TopTypes.Top10
        else if (this.data.GetBoolean("top50", ["-top50", "-t50", "top50", "t50"]))
            top = TopTypes.Top50
        else if (this.data.GetBoolean("first", ["-first", "-f", "first", "f"]))
            top = TopTypes.First

        return {
            Gamemode: this.data.GetGamemode(),
            Type: type as Types ?? this.data.GetNumber("type", ["-type", "-t", "t"]) as Types,
            Ranks: this.data.GetBoolean("ranks", ["-ranks", "-rank", "ranks", "rank"]),
            Top: top,
            Username: this.data.GetRemaining()
        }
    }
}

class Playcount extends CommandBase implements CommandAbstract {
    public static readonly name: string = "graph"
    public static readonly names: string[] = [this.name, "playcount", "pc", "wr", "watchedreplays", "rank", "dctg"]
    public static readonly helpData = new CommandHelp()
    private data: LineGraphData


    constructor(data: MessageEventData) {
        super()
        this.data = new LineGraphData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()
        const { Username: _username, Gamemode, Type, Ranks } = this.data.args

        const Username = _username || user?.osu?.username

        if (!Username) {
            await this.data.Reply(this.RenderNoUserError())
            return CommandResponseCodes.USER_ERROR
        }

        const fetcher = await Fetcher.Create(user.id)
        const [profile, profileError] = await HandleAsync(fetcher.GetProfile({ Username, Gamemode: Gamemode }))
        if (profileError) {
            Logger.Error("LineGraph profile error:", profileError)
            const errorReply = this.HandleProfileError(profileError, Username)
            await this.data.Reply(errorReply)
            return CommandResponseCodes.ERROR
        }

        try {
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
                default:
                    await this.data.Reply({
                        content: "Invalid graph type specified.",
                        ephemeral: true
                    })
                    return CommandResponseCodes.USER_ERROR
            }
            const [playcountNums, labels] = data

            if (!playcountNums && !datasets) {
                await this.data.Reply({
                    content: "No data available to generate graph.",
                    ephemeral: true
                })
                return CommandResponseCodes.USER_ERROR
            }

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
        } catch (error) {
            Logger.Error("LineGraph rendering error:", error)
            await this.data.Reply({
                content: "Failed to generate graph. Please try again later.",
                ephemeral: true
            })
            throw error
        }
    }
    public async GetDailyChallengeThresholdsData(profile: Profile.FromId): Promise<[ChartDataset<"line">[], string[]]> {
        try {
            const challenge = await DailyChallengeFactory.GetCurrentChallenge()
            if (!challenge || !challenge.thresholds || challenge.thresholds.length === 0) {
                return [[], []]
            }
            const datasets: ChartDataset<"line">[] = []
            const labels: string[] = []
            const data = {
                top10: [],
                top50: [],
                first: []
            }
            const thresholds = challenge.thresholds.slice(1)
            for (const threshold of thresholds) {
                if (threshold.date.getMinutes() < 10) labels.push(`${threshold.date.getHours()}:00`)
                else labels.push("")
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
            const Top = this.data.args.Top
            if (Top === TopTypes.All || Top === TopTypes.Top10) 
                datasets.push({
                    data: data.top10,
                    borderColor: "rgb(0, 255, 0)",
                    showLine: true,
                    tension: 0,
                    label: "Top 10%"
                })
            if (Top === TopTypes.All || Top === TopTypes.Top50) 
                datasets.push({
                    data: data.top50,
                    borderColor: "rgb(255, 0, 0)",
                    showLine: true,
                    tension: 0,
                    label: "Top 50%"
                })
            if (!this.data.args.Ranks && (Top === TopTypes.All || Top === TopTypes.First)) 
                datasets.push({
                    data: data.first,
                    borderColor: "rgb(0, 0, 255)",
                    showLine: true,
                    tension: 0,
                    label: "1st"
                })
            return [datasets, labels]
        } catch (error) {
            Logger.Error("Error fetching daily challenge thresholds:", error)
            return [[], []]
        }
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

Playcount.helpData
    .setCommand(Playcount.name)
    .setAliases(Playcount.names.filter(el => el !== Playcount.name))
    .setDescription("Render line graphs for playcount, rank, watched replays, or daily challenge thresholds.")
    .setUsage("graph|playcount|rank|wr|dctg [options] [username]")
    .setGroup(CommandGroup.Graphs)
    .addArg(UsernameArg)
    .addArg(GamemodeArg)
    .addArg(new CommandHelpArg()
        .setName("type")
        .setAliases(["-type", "-t", "t"])
        .setDescription("Graph type when using the graph alias (or use playcount/rank/wr/dctg)")
        .setUsage("type 0"))
    .addArg(new CommandHelpArg()
        .setName("ranks")
        .setAliases(["-ranks", "-rank", "ranks", "rank"])
        .setDescription("For dctg: show rank lines instead of score thresholds")
        .setUsage("-ranks"))
    .addArg(new CommandHelpArg()
        .setName("top")
        .setAliases(["-top10", "-t10", "-top50", "-t50", "-first", "-f"])
        .setDescription("For dctg: limit which threshold lines are drawn")
        .setUsage("-top10"))

CommandEmitterInstance.AddCommand(Playcount, Playcount.names)

export default Playcount;
