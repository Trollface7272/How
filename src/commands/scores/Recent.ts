import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command"
import { MessageEventData } from "@src/class/partials/MessageEvent"
import { CommandData } from "@src/class/base/CommandData"
import { CommandEmitterInstance } from "@src/class/CommandEmitter"
import { Score } from "@src/class/api/osu/Score"
import { Fetcher } from "@src/class/api/osu/Fetcher"
import { Gamemode } from "@src/class/api/osu/MiscTypes"
import { GamemodeNames, GamemodeNumToStr } from "@src/class/api/osu/Consts"
import { EmojiFactory } from "@src/class/Emojis"
import { ButtonEmojis, FormatCombo, FormatHits, FormatProgress, GetFlag, HandleAsync } from "@src/Utils"
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, InteractionReplyOptions, MessageReplyOptions } from "discord.js"
import { TextRenderer } from "@src/class/renderer/Text"
import NodeCache from "node-cache"
import { randomBytes } from "crypto"
import { CalculateProgress } from "@src/class/api/osu/Utils"

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
    Scores?: Score.Recent[] | Score.Best[]
    OD?: number
}

const componentCache = new NodeCache({
    stdTTL: 60 * 60 * 24 * 7,
    checkperiod: 60 * 60 * 24,
    maxKeys: 10000, useClones: false
})

class RecentData extends CommandData implements CommandDataAbstract {
    constructor(data: MessageEventData) { super(data) }

    public GetComandArgs(): args {
        const Gamemode = this.data.GetGamemode()
        const Specific = this.data.GetSpecific()
        const Page = 0
        const Id = this.data.GetNumber("id", ["id", "-id"]) ?? undefined
        const Best = this.data.GetBoolean("best", ["b", "best", "-b", "-best"]) ?? false
        const Fails = !(this.data.GetBoolean("fails", ["pass", "p", "-pass", "-p"]) ?? false)
        const List = this.data.GetBoolean("list", ["l", "list", "-l", "-list"]) ?? false
        const Count = this.data.GetBoolean("count", ["c", "count", "-c", "-count"]) ?? false
        const Map = this.data.GetBoolean("map", ["m", "map", "-m", "-map"]) ?? false
        const OD = this.data.GetNumber("od", ["od", "-od"]) ?? undefined
        const Username = this.data.GetUsername()
        return {
            Gamemode, Specific, Page, Id, Best, Fails, List, Count, Map, OD, Username
        }
    }

    public GetOldComponentId(): string {
        if (!this.IsInteraction()) return
        const interaction = this.data.GetInteraction()
        if (interaction.isChatInputCommand()) return null
        if (interaction.isMessageComponent()) return interaction.customId.split(";")[1]
    }
}

class Recent implements CommandAbstract {
    public static readonly names: string[] = ["recent", "r", "rs", "recents", "recentscores", "recentscore"]
    private data: RecentData
    private args: args
    private componentId: string
    private oldComponentId: string

    constructor(data: MessageEventData) {
        this.componentId = randomBytes(16).toString("hex")
        this.data = new RecentData(data)
        this.args = this.data.GetComandArgs()
        this.oldComponentId = this.data.GetOldComponentId()
        if (this.oldComponentId) this.args = componentCache.get<args>(this.oldComponentId)
        componentCache.set(this.componentId, this.args)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()
        const response: InteractionReplyOptions | MessageReplyOptions = {}
        const { Username, Id, Gamemode, Specific, Best, Count, Fails, List, Map, OD, Page: _Page, Scores } = this.args
        const listPageSize = 5
        let Page = _Page
        if (Specific?.length == 1) {
            Page = Specific[0]
            this.args.Page = Page
        }
        if (this.data.IsInteraction()) {
            const interaction = this.data.GetInteraction()
            if (interaction.isButton()) {
                const [action, componentId, page] = interaction.customId.split(";")
                Page = parseInt(page)
            }
        }

        const fetcher = await Fetcher.Create(user.id)
        if (Best) {
            const [allScores, err] = Scores?.length > 0 ? [Scores as Score.Best[], null] : await HandleAsync(fetcher.GetUserScores({ Username: Username, Gamemode: Gamemode, Type: "best", Limit: 100 }))
            this.args.Scores = allScores
            allScores.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            if (List) {
                const scores =
                    (Specific?.length > 0 ?
                        Specific.slice(Page * listPageSize, Page * listPageSize + listPageSize).map(i => allScores[i]) :
                        allScores.slice(Page * listPageSize, Page * listPageSize + listPageSize)) as Score.Best[]

                if (scores.length == 0) return this.noScoresFound(Username, response)

                const performanceLoading = scores.map(score => Promise.all([score.fetchPerformance(), score.fetchPosition(user.id)]))
                await Promise.all(performanceLoading)

                this.data.Reply(this.renderMultipleBestScores({ scores, page: Page, maxPages: Math.ceil(allScores.length / listPageSize) }))
                return CommandResponseCodes.OK
            }

            const score = allScores[Page]
            if (!score) return this.noScoresFound(Username, response)
            const loading = Promise.all([score.fetchPerformance(), score.fetchPosition(user.id)])
            await loading
            this.data.Reply(this.renderSingleBestScore({ score, page: Page, maxPages: allScores.length }))
            return CommandResponseCodes.OK
        }
        const allScores = await fetcher.GetUserScores({ Username: Username, Gamemode: Gamemode, Type: "recent", Limit: 100, Fails: Fails })
        this.args.Scores = allScores

        if (allScores.length == 0) return this.noScoresFound(Username, response)

        if (List) {
            const scores = (Specific?.length > 0 ?
                Specific.slice(Page * listPageSize, Page * listPageSize + listPageSize).map(i => allScores[i]) :
                allScores.slice(Page * listPageSize, Page * listPageSize + listPageSize))
            if (scores.length == 0) return this.noScoresFound(Username, response)

            const performanceLoading = scores.map(score => Promise.all([score.fetchPerformance(), score.fetchPosition(user.id)]))
            await Promise.all(performanceLoading)
            this.data.Reply(this.renderMultipleScores({ scores, page: Page, maxPages: Math.ceil(allScores.length / listPageSize) }))
            return CommandResponseCodes.OK
        }

        const score = allScores[Page]
        if (!score) return this.noScoresFound(Username, response)

        const loading = Promise.all([score.fetchPerformance(), score.fetchPosition(user.id)]);

        let tries = 0
        for (let i = Page; i < allScores.length; i++) {
            if (allScores[i].beatmap.id !== score.beatmap.id)
                break
            tries++
        }

        await loading

        this.data.Reply(this.renderSingleScore({ score, page: Page, maxPages: allScores.length, tries }))
        return CommandResponseCodes.OK
    }

    private async noScoresFound(username: string, resp: InteractionReplyOptions | MessageReplyOptions) {
        resp.content = `${username} has no recent scores.`
        await this.data.Reply(resp)
        return CommandResponseCodes.OK
    }

    private renderSingleBestScore({ score, page, maxPages }: { score: Score.Best, page: number, maxPages: number }) {
        const data = this.renderMultipleBestScores({ scores: [score], page, maxPages })

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

    private renderSingleScore({ score, page, maxPages, tries }: { score: Score.Recent, page: number, maxPages: number, tries: number }) {
        const { mods, rank: grade, mode, replay, mode_int, max_combo: combo, accuracy, statistics, user: { avatar_url }, beatmapset: { title }, beatmap: { version, difficulty_rating, url, max_combo, count_circles, count_sliders, count_spinners }, performance: { normal: { total: pp }, improved }, position: _rank } = score
        const embed = new EmbedBuilder()
        const buttons = this.renderNavigationButtons({ curentPage: page, maxPage: maxPages })

        let rank: string = ""
        if (_rank) {
            if (replay) {
                rank = `[#${_rank}](https://osu.ppy.sh/scores/osu/${score.id}/download)`
            } else {
                rank = `#${_rank}`
            }
        }

        const description = TextRenderer.render(`recent/single`, {
            grade: EmojiFactory.GetEmoji(`Ranking${grade}`), pp: pp.roundFixed(3), fcpp: improved ? `/${improved.total.roundFixed(3)}pp` : "", accuracy: (accuracy * 100).roundFixed(2), rank,
            score: score.score.toLocaleString("en-US"), combo: FormatCombo(combo, max_combo, mode), hits: FormatHits(statistics, mode),
            timestamp: new Date(score.created_at).toDiscordToolTip(),
            completion: rank == "F" ? `\n▸ **Map Completion:** ${CalculateProgress(statistics, { circles: count_circles, sliders: count_sliders, spinners: count_spinners }, mode_int)}%` : ""
        })

        embed.setAuthor({
            name: `${title} [${version}] +${mods.join("")} [${difficulty_rating.roundFixed(2)}★]`,
            url: url,
            iconURL: avatar_url
        })
        embed.setFooter({
            text: `Try #${tries} | Page ${page + 1}/${maxPages} | Beatmap by ${score.beatmapset.creator}`,
        })
        embed.setThumbnail(`https://b.ppy.sh/thumb/${score.beatmapset.id}l.jpg`)
        embed.setDescription(description)

        return { embeds: [embed], components: [buttons] }
    }

    private renderMultipleScores({ scores, page, maxPages }: { scores: Score.Recent[], page: number, maxPages: number }) {
        const resp = this.renderMultipleBestScores({ scores, page, maxPages })
        const embed = resp.embeds[0]

        embed.setAuthor({
            name: `Recent Plays for ${scores[0].user.username}`,
            url: `https://osu.ppy.sh/users/${scores[0].user.id}`,
            iconURL: GetFlag(scores[0].user.country_code)
        })
        return resp
    }

    private renderMultipleBestScores({ scores, page, maxPages }: { scores: Score.Recent[], page: number, maxPages: number }) {
        const embed = new EmbedBuilder()
            .setColor(this.data.GetEmbedColor())
        const buttons = this.renderNavigationButtons({ curentPage: page, maxPage: maxPages })

        const description = scores.map(score => {
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
            return TextRenderer.render(`recent/score`, {
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
        embed.setFooter({
            text: `Page ${page + 1}/${maxPages}`
        })

        return { embeds: [embed], components: [buttons] }
    }

    private renderNavigationButtons({ curentPage, maxPage }: { curentPage: number, maxPage: number }) {
        const row = new ActionRowBuilder<ButtonBuilder>()
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`recent;${this.componentId};0;${randomBytes(4)}`)
                .setLabel(ButtonEmojis.Start)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(curentPage == 0),
            new ButtonBuilder()
                .setCustomId(`recent;${this.componentId};${curentPage - 1};${randomBytes(4)}`)
                .setLabel(ButtonEmojis.Left)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(curentPage == 0),
            new ButtonBuilder()
                .setCustomId(`recent;${this.componentId};${curentPage + 1};${randomBytes(4)}`)
                .setLabel(ButtonEmojis.Right)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(curentPage == maxPage),
            new ButtonBuilder()
                .setCustomId(`recent;${this.componentId};${maxPage-1};${randomBytes(4)}`)
                .setLabel(ButtonEmojis.End)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(curentPage == maxPage)
        )
        return row
    }
}

CommandEmitterInstance.AddCommand(Recent, Recent.names)