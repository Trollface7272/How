import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { Score } from "@src/class/api/osu/Score";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { Gamemode } from "@src/class/api/osu/MiscTypes";
import { GamemodeNumToStr } from "@src/class/api/osu/Consts";
import { EmojiFactory } from "@src/class/Emojis";
import { Escape, FormatCombo, FormatHits, FormatProgress } from "@src/Utils";
import { InteractionReplyOptions, MessageReplyOptions } from "discord.js";

interface args {
    Gamemode?: Gamemode
    Specific?: number[]
    Page?: number
    Id?: number
    Username?: string
    Best?: boolean
    Fails?: boolean
    List?: boolean
    Count?: boolean
    Map?: boolean
    Scores?: Score.Recent[]
    OD?: number
}

class RecentData extends CommandData implements CommandDataAbstract {
    constructor(data: MessageEventData) { super(data) }

    public GetComandArgs(): args {
        let Gamemode = this.data.GetString("gamemode", ["m", "mode", "-m", "-mode"]) as Gamemode ?? "osu"
        if (!isNaN(Number(Gamemode)))
            Gamemode = GamemodeNumToStr[Number(Gamemode)] ?? "osu"

        const Specific = this.data.GetSpecific()
        const Page = 0
        const Id = this.data.GetNumber("id", ["id", "-id"]) ?? undefined
        const Best = this.data.GetBoolean("best", ["b", "best", "-b", "-best"]) ?? false
        const Fails = this.data.GetBoolean("fails", ["pass", "p", "-pass", "-p"]) ?? false
        const List = this.data.GetBoolean("list", ["l", "list", "-l", "-list"]) ?? false
        const Count = this.data.GetBoolean("count", ["c", "count", "-c", "-count"]) ?? false
        const Map = this.data.GetBoolean("map", ["m", "map", "-m", "-map"]) ?? false
        const OD = this.data.GetNumber("od", ["od", "-od"]) ?? undefined
        const Username = this.data.GetUsername()
        return {
            Gamemode, Specific, Page, Id, Best, Fails, List, Count, Map, OD, Username
        }
    }
}

class Recent implements CommandAbstract {
    public static readonly names: string[] = ["recent", "r", "rs", "recents", "recentscores", "recentscore"]
    private data: RecentData

    constructor(data: MessageEventData) {
        this.data = new RecentData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const client = this.data.GetClient()
        const user = this.data.GetUser()
        const response: InteractionReplyOptions | MessageReplyOptions = {}
        const { Username, Id, Gamemode, Specific, Best, Count, Fails, List, Map, OD, Page: _Page, Scores } = this.data.GetComandArgs()
        let Page = _Page
        if (Specific.length == 1) {
            Page = Specific[0]
            Specific.shift()
        }

        const fetcher = await Fetcher.Create(user.id)
        const allScores = await fetcher.GetUserScores({ Username: Username, Gamemode: Gamemode, Type: "recent" })

        if (allScores.length == 0) return this.noScoresFound(Username, response)

        if (List) {
            const scores = Specific.map(i => allScores[i])
            if (scores.length == 0) return this.noScoresFound(Username, response)

            this.renderMultipleScores(scores, response)
        }

        await this.data.Reply(response)
        return CommandResponseCodes.OK
    }

    private async noScoresFound(username: string, resp: InteractionReplyOptions | MessageReplyOptions) {
        resp.content = `${username} has no recent scores.`
        await this.data.Reply(resp)
        return CommandResponseCodes.OK
    }

    private renderSingleScore(score: Score.Recent, response: InteractionReplyOptions | MessageReplyOptions) {
        const { rank, pp, accuracy, score: total_score, max_combo, beatmap, mode, statistics, created_at } = score
        const { max_combo: beatmap_max_combo } = score
        const description = [
            `▸ ${EmojiFactory.GetEmoji(`Ranking${rank}`)} ▸ **${pp}pp**/${pp}pp ▸ ${accuracy.roundFixed(2)}%`,
            `▸ ${total_score.toLocaleString("en-US")} ▸ ${FormatCombo(max_combo, beatmap_max_combo, mode)} ▸ ${FormatHits(statistics, mode)}`,
            `▸ Score set ${new Date(created_at).toDiscordToolTip()}`
        ]
        if (rank == "F")
            description.push(`**Map Completion:** ${FormatProgress(mode, statistics, beatmap)}`)
    }

    private renderMultipleScores(scores: Score.Recent[], response: InteractionReplyOptions | MessageReplyOptions, {rank}: {rank?: number}) {
        scores.map(score => {
            const { index, rank, pp, accuracy, replay, statistics, score: score_num, beatmapset: { title }, beatmap: {version, url, difficulty_rating} } = score
            const mods = score.mods.length == 0 ? `No Mod` : score.mods.join("")
            const description = [
                `**${index + 1}. [${Escape(title)} [${Escape(version)}]](${url}) +${mods}** [${difficulty_rating.roundFixed(2)}★]\n`,
                `▸ ${EmojiFactory.GetEmoji(`Ranking${rank}`)} ▸ **${pp.toFixed(3)}pp**/${pp.roundFixed(3)}pp ▸ ${(accuracy * 100).roundFixed(2)}%${rank ? ` ▸ ${formatRank(rank, replay, score.best_id, score.mode)}` : ""}\n`,
                `▸ ${score_num.toLocaleString()} ▸ ${GetCombo(score.max_combo, attributes.max_combo, score.mode_int)} ▸ [${GetHits(statistics, score.mode_int)}]\n`,
                `▸ Score Set ${new Date(score.created_at).toDiscordToolTip()}`
            ]

            if (score.rank === "F") description += `\n**▸ Map Completion:** ${CalculateProgress(score.statistics, { circles: score.beatmap.count_circles, sliders: score.beatmap.count_sliders, spinners: score.beatmap.count_spinners }, score.mode_int)}%`
            return description
        })
    }
}

CommandEmitterInstance.AddCommand(Recent, Recent.names)