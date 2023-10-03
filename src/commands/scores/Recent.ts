import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { Score } from "@src/class/api/osu/Score";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { Gamemode } from "@src/class/api/osu/MiscTypes";
import { GamemodeNames, GamemodeNumToStr } from "@src/class/api/osu/Consts";
import { EmojiFactory } from "@src/class/Emojis";
import { Escape, FormatCombo, FormatHits, FormatProgress, GetFlag, HandleAsync } from "@src/Utils";
import { EmbedBuilder, InteractionReplyOptions, MessageReplyOptions } from "discord.js";
import { TextRenderer } from "@src/class/renderer/Text";
import NodeCache from "node-cache";
import { AxiosError } from "axios";

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

const componentCache = new NodeCache({
    stdTTL: 60 * 60 * 24 * 7,
    checkperiod: 60 * 60 * 24,
    maxKeys: 10000
})

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
        const listPageSize = 5
        let Page = _Page
        if (Specific.length == 1) {
            Page = Specific.shift()
        }

        const fetcher = await Fetcher.Create(user.id)

        if (Best) {
            const [allScores, err] = await HandleAsync(fetcher.GetUserScores({ Username: Username, Gamemode: Gamemode, Type: "best", Limit: 100 }))
            allScores.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            if (List) {
                const scores =
                    (Specific?.length > 0 ?
                        Specific.slice(Page * listPageSize, Page * listPageSize + listPageSize).map(i => allScores[i]) :
                        allScores.slice(Page * listPageSize, Page * listPageSize + listPageSize)) as Score.Best[]

                if (scores.length == 0) return this.noScoresFound(Username, response)

                const performanceLoading = scores.map(score => Promise.all([score.fetchPerformance(), score.fetchPosition(user.id)]))
                await Promise.all(performanceLoading)

                this.data.Reply(this.renderMultipleBestScores({ scores }))
                return CommandResponseCodes.OK
            }

            const score = allScores[Page]
            if (!score) return this.noScoresFound(Username, response)

            const loading = Promise.all([score.fetchPerformance(), score.fetchPosition(user.id)])
            await loading
            this.data.Reply(this.renderSingleBestScore({score}))
            return CommandResponseCodes.OK
        }
        const allScores = await fetcher.GetUserScores({ Username: Username, Gamemode: Gamemode, Type: "recent" })

        if (allScores.length == 0) return this.noScoresFound(Username, response)

        if (List) {
            const scores = Specific.map(i => allScores[i])
            if (scores.length == 0) return this.noScoresFound(Username, response)

            //this.renderMultipleScores(scores, response)
        }

        await this.data.Reply(response)
        return CommandResponseCodes.OK
    }

    private async noScoresFound(username: string, resp: InteractionReplyOptions | MessageReplyOptions) {
        resp.content = `${username} has no recent scores.`
        await this.data.Reply(resp)
        return CommandResponseCodes.OK
    }

    private renderSingleBestScore({ score }: { score: Score.Best }) {
        const data = this.renderMultipleBestScores({ scores: [score] })

        const embed = data.embeds[0]
        embed.setAuthor({
            name: `Recent Top ${GamemodeNames[score.mode]} Play for ${score.user.username}`,
            url: `https://osu.ppy.sh/users/${score.user.id}`,
            iconURL: GetFlag(score.user.country_code)
        })
        embed.setFooter({
            text: `Beatmap by ${score.beatmapset.creator}`,
        })

        return data
    }

    private renderMultipleBestScores({ scores }: { scores: Score.Best[] }) {
        const embed = new EmbedBuilder()
            .setColor(this.data.GetEmbedColor())

        const description = scores.map(score => {
            //console.log(score)
            const { index, mods, rank: grade, max_combo: combo, accuracy, beatmapset: { title }, beatmap: { version, url, max_combo }, performance, performance: { normal: { total: pp } } } = score
            const fcpp = performance.improved ? performance.improved.total : undefined
            let rank: string = ""
            if (score.position) {
                if (score.replay) {
                    rank = `[#${score.position}](https://osu.ppy.sh/scores/osu/${score.id}/download)`
                } else {
                    rank = `#${score.position}`
                }
            }
            return TextRenderer.render(`recent/best/list`, {
                index: index + 1, title: title, difficulty: version, beatmapUrl: url, mods: mods.length == 0 ? "NoMod" : mods.join(""), starRating: score.beatmap.difficulty_rating.roundFixed(2),
                grade: EmojiFactory.GetEmoji(`Ranking${grade}`), pp: pp.roundFixed(3), fcpp: fcpp ? `/${fcpp.roundFixed(3)}pp` : "", accuracy: (accuracy * 100).roundFixed(2), rank: rank,
                score: score.score.toLocaleString("en-US"), combo: FormatCombo(combo, max_combo, score.mode), hits: FormatHits(score.statistics, score.mode),
                timestamp: new Date(score.created_at).toDiscordToolTip()
            })
        }).join("\n")

        embed.setAuthor({
            name: `Recent Top ${GamemodeNames[scores[0].mode]} Plays for ${scores[0].user.username}`,
            url: `https://osu.ppy.sh/users/${scores[0].user.id}`,
            iconURL: GetFlag(scores[0].user.country_code)
        })
        embed.setDescription(description)
        embed.setThumbnail(`https://b.ppy.sh/thumb/${scores[0].beatmapset.id}l.jpg`)

        return { embeds: [embed] }
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

    private renderMultipleScores(scores: Score.Recent[], response: InteractionReplyOptions | MessageReplyOptions, { rank }: { rank?: number }) {
        //scores.map(score => {
        //    const { index, rank, pp, accuracy, replay, statistics, score: score_num, beatmapset: { title }, beatmap: { version, url, difficulty_rating } } = score
        //    const mods = score.mods.length == 0 ? `No Mod` : score.mods.join("")
        //    const description = [
        //        `**${index + 1}. [${Escape(title)} [${Escape(version)}]](${url}) +${mods}** [${difficulty_rating.roundFixed(2)}★]\n`,
        //        `▸ ${EmojiFactory.GetEmoji(`Ranking${rank}`)} ▸ **${pp.toFixed(3)}pp**/${pp.roundFixed(3)}pp ▸ ${(accuracy * 100).roundFixed(2)}%${rank ? ` ▸ ${formatRank(rank, replay, score.best_id, score.mode)}` : ""}\n`,
        //        `▸ ${score_num.toLocaleString()} ▸ ${GetCombo(score.max_combo, attributes.max_combo, score.mode_int)} ▸ [${GetHits(statistics, score.mode_int)}]\n`,
        //        `▸ Score Set ${new Date(score.created_at).toDiscordToolTip()}`
        //    ]
        //
        //    if (score.rank === "F") description += `\n**▸ Map Completion:** ${CalculateProgress(score.statistics, { circles: score.beatmap.count_circles, sliders: score.beatmap.count_sliders, spinners: score.beatmap.count_spinners }, score.mode_int)}%`
        //    return description
        //})
    }
}

CommandEmitterInstance.AddCommand(Recent, Recent.names)