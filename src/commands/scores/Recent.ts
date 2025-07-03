import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command"
import { MessageEventData } from "@src/class/partials/MessageEvent"
import { CommandData } from "@src/class/base/CommandData"
import { CommandEmitterInstance } from "@src/class/CommandEmitter"
import { Score } from "@src/class/api/osu/class/Score"
import { Fetcher } from "@src/class/api/osu/Fetcher"
import { Gamemode } from "@src/class/api/osu/types/MiscTypes"
import { GamemodeNames } from "@src/class/api/osu/Consts"
import { EmojiFactory } from "@src/class/Emojis"
import { ButtonEmojis, FormatCombo, FormatHits, GetFlag, HandleAsync } from "@src/Utils"
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, InteractionReplyOptions, MessageReplyOptions, SlashCommandBuilder, escapeMarkdown } from "discord.js"
import { TextRenderer } from "@src/class/renderer/Text"
import NodeCache from "node-cache"
import { randomBytes } from "crypto"
import { CalculateProgress } from "@src/class/api/osu/Utils"
import { Beatmap } from "@src/class/api/osu/class/Beatmap"
import { BeatmapSet } from "@src/class/api/osu/class/BeatmapSet"
import { PerformanceCalculator } from "@src/class/api/osu/PerformanceCalculator"
import { CommandBase } from "@src/class/base/Command";
import { CommandHelp } from "@src/class/help/CommandHelp";
import { GamemodeArg, PageArg, UsernameArg } from "@src/utils/discord/help";
import { BeatmapStringOption, CONTEXT_FULL, GamemodeStringOption, IndexStringOption, ListBooleanOption, PageNumberOption, UsernameStringOption } from "@src/utils/discord/interaction"
import { InteractionRegistrerInstance } from "@src/class/InteractionRegisterer"
import { CommandHelpArg } from "@src/class/help/CommandHelpArg"

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
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        const command = this.data.GetCommand()


        
        const Gamemode = this.data.GetGamemode()
        const Specific = this.data.GetSpecific()
        const Page = 0
        const Id = this.data.GetNumber("id", ["id", "-id"]) ?? undefined
        const Best = this.data.GetBoolean("best", ["b", "best", "-b", "-best"]) ?? false
        const Fails = !(this.data.GetBoolean("exclude-fails", ["pass", "p", "-pass", "-p"]) ?? false)
        const List = this.data.GetBoolean("list", ["l", "list", "-l", "-list"]) ?? false
        const Count = this.data.GetBoolean("count", ["c", "count", "-c", "-count"]) ?? false
        const Map = this.data.GetBoolean("map", ["m", "map", "-m", "-map"]) ?? false
        const OD = this.data.GetNumber("od", ["od", "-od"]) ?? undefined
        const Username = this.data.GetRemaining()
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

class Recent extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["recent", "r", "rs", "recents", "recentscores", "recentscore", "mymostrecentsubmittedscore"]
    public static readonly interactionData: SlashCommandBuilder = new SlashCommandBuilder()
    public static readonly helpData = new CommandHelp()
    private data: RecentData
    private args: args
    private componentId: string
    private oldComponentId: string

    constructor(data: MessageEventData) {
        super()
        this.componentId = randomBytes(16).toString("hex")
        this.data = new RecentData(data)
        this.args = this.data.args
        this.oldComponentId = this.data.GetOldComponentId()
        if (this.oldComponentId) this.args = componentCache.get<args>(this.oldComponentId)
        componentCache.set(this.componentId, this.args)
    }

    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()
        const response: InteractionReplyOptions | MessageReplyOptions = {}
        //Map is unused here
        const { Username, Id: _id, Gamemode, Specific, Best, Count, Fails, List, Map, OD, Page: _Page, Scores } = this.args
        const Id = !Username && !_id ? user?.osu?.userId : _id

        this.args.Id = Id

        if (!Username && !Id) {
            await this.data.Reply(this.RenderNoUserError())
            return CommandResponseCodes.USER_ERROR
        }

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

        if (Count) {
            const profile = await fetcher.GetProfile({ Username: Username ?? Id, Gamemode: Gamemode })
            const scores = await fetcher.GetUserScores({ Username: Username ?? Id.toString(), Gamemode: Gamemode, Type: "recent", Limit: 100, Fails: true, Id: Id })

            const passes = profile.scores_recent_count
            const fails = scores.filter(score => !score.Passed).length
            const total = passes + fails
            const embed = this.renderCount({ passes, fails, total })
            this.data.Reply({ embeds: [embed] })
            return CommandResponseCodes.OK
        }

        if (Best) {
            const [allScores, err] = Scores?.length > 0 ? [Scores as Score.Best[], null] : await HandleAsync(fetcher.GetUserScores({ Username: Username ?? Id.toString(), Gamemode: Gamemode, Type: "best", Limit: 100 }))
            this.args.Scores = allScores
            allScores.sort((a, b) => b.EndedAt.getTime() - a.EndedAt.getTime())
            if (List) {
                const scores =
                    (Specific?.length > 0 ?
                        Specific.slice(Page * listPageSize, Page * listPageSize + listPageSize).map(i => allScores[i]) :
                        allScores.slice(Page * listPageSize, Page * listPageSize + listPageSize)) as Score.Best[]

                if (scores.length == 0) return this.noScoresFound(Username ?? Id.toString(), response)

                const performanceLoading = scores.map(score => Promise.all([score.fetchPerformance(), score.fetchPosition(user.id)]))
                await Promise.all(performanceLoading)

                this.data.Reply(this.renderMultipleBestScores({ scores, page: Page, maxPages: Math.ceil(allScores.length / listPageSize) }))
                return CommandResponseCodes.USER_ERROR
            }

            const score = allScores[Page]
            if (!score) return this.noScoresFound(Username ?? Id.toString(), response)
            const loading = Promise.all([score.fetchPerformance(), score.fetchPosition(user.id)])
            await loading
            this.data.Reply(await this.renderSingleBestScore({ score, page: Page, maxPages: allScores.length }))
            return CommandResponseCodes.USER_ERROR
        }
        const allScores = await fetcher.GetUserScores({ Username: Username ?? Id.toString(), Gamemode: Gamemode, Type: "recent", Limit: 100, Fails: Fails, Id: Id })
        this.args.Scores = allScores

        if (allScores.length == 0) return this.noScoresFound(Username ?? Id.toString(), response)

        if (List) {
            const scores = (Specific?.length > 0 ?
                Specific.slice(Page * listPageSize, Page * listPageSize + listPageSize).map(i => allScores[i]) :
                allScores.slice(Page * listPageSize, Page * listPageSize + listPageSize))
            if (scores.length == 0) return this.noScoresFound(Username, response)

            const performanceLoading = scores.map(score => Promise.all([score.fetchPerformance(), score.fetchPosition(user.id)]))
            await Promise.all(performanceLoading)
            this.data.Reply(this.renderMultipleScores({ scores, page: Page, maxPages: Math.ceil(allScores.length / listPageSize) }))
            return CommandResponseCodes.USER_ERROR
        }

        const score = allScores[Page]
        if (!score) return this.noScoresFound(Username, response)
        const loading = Promise.all([score.fetchPerformance(), score.fetchPosition(user.id)]);

        let tries = 0
        for (let i = Page; i < allScores.length; i++) {
            if (allScores[i].BeatmapId !== score.BeatmapId)
                break
            tries++
        }

        await loading

        this.data.Reply(await this.renderSingleScore({ score, page: Page, maxPages: allScores.length, tries }))
        return CommandResponseCodes.USER_ERROR
    }

    private renderCount({ fails, passes, total }: { passes: number, fails: number, total: number }) {
        const embed = this.GetBaseEmbed()
        embed.setDescription(TextRenderer.render("recent/count", {
            passes: passes, fails: fails, total: total
        }))
        return embed
    }

    private async noScoresFound(username: string, resp: InteractionReplyOptions | MessageReplyOptions) {
        resp.content = `${username} has no recent scores.`
        await this.data.Reply(resp)
        return CommandResponseCodes.USER_ERROR
    }

    private async renderMap({ beatmap, beatmapset }: { beatmap: Beatmap.Base, beatmapset: BeatmapSet.Compact }) {
        const calc = new PerformanceCalculator(beatmap, beatmap.mods)
        await calc.FetchAttributes()

        const embed = this.GetBaseEmbed()
        const pps = await Promise.all([
            calc.CalculateByAcc(100), calc.CalculateByAcc(99), calc.CalculateByAcc(98), calc.CalculateByAcc(95)
        ])

        const status = beatmap.status.charAt(0).toUpperCase() + beatmap.status.slice(1)
        const pp = this.RenderBeatmapPP(pps, [100, 99, 98, 95])

        const description = TextRenderer.render("beatmap/beatmap", {
            length: beatmap.total_length.asTime(), drain: beatmap.total_length != beatmap.drain ? ` (${beatmap.drain.asTime()})` : "", bpm: beatmap.bpm, mods: beatmap.mods.Formatted,
            setid: beatmapset.id, id: beatmap.id,
            difficulty: EmojiFactory.GetDifficultyEmoji(beatmap.difficulty_rating, beatmap.mode), version: beatmap.version,
            stars: beatmap.difficulty_rating.roundFixed(2), maxCombo: beatmap.max_combo,
            ar: beatmap.AR.roundDynamicFixed(1, 2), od: beatmap.OD.roundDynamicFixed(1, 2), hp: beatmap.HP.roundDynamicFixed(1, 2), cs: beatmap.CS.roundDynamicFixed(1, 2),
            pp: pp
        })
        embed.setFooter({
            text: `${status} | ${beatmapset.favourite_count} ❤︎`
        })
        embed.setDescription(description)
        return embed
    }

    private async renderSingleBestScore({ score, page, maxPages }: { score: Score.Best, page: number, maxPages: number }) {
        const data = this.renderMultipleBestScores({ scores: [score], page, maxPages })

        if (this.data.args.Map) data.embeds[1] = await this.renderMap({ beatmap: score.Beatmap, beatmapset: score.Beatmapset })

        const embed = data.embeds[0]
        embed.setAuthor({
            name: `Recent Top ${GamemodeNames[score.RulesetId]} Play for ${score.User.username}`,
            url: `https://osu.ppy.sh/users/${score.UserId}`,
            iconURL: GetFlag(score.User.country_code)
        })
        embed.setFooter({
            text: `Beatmap by ${score.Beatmapset.creator}`,
        })

        return data
    }

    private async renderSingleScore({ score, page, maxPages, tries }: { score: Score.Recent, page: number, maxPages: number, tries: number }) {
        const embed = this.GetBaseEmbed()
        const buttons = this.renderNavigationButtons({ curentPage: page, maxPage: maxPages })

        let mapEmbed: Promise<EmbedBuilder>


        if (this.data.args.Map) mapEmbed = this.renderMap({ beatmap: score.Beatmap, beatmapset: score.Beatmapset })

        let rank: string = ""
        if (score.RankGlobal) {
            if (score.HasReplay) {
                rank = `▸ [#${score.RankGlobal}](https://osu.ppy.sh/scores/${score.Id}/download)`
            } else {
                rank = `▸ #${score.RankGlobal}`
            }
        }

        let fcpp = score.performance.improved ? `/${score.performance.improved.total.roundFixed(3)}pp` : ""

        if (score.Accuracy === 1) fcpp = ""

        const description = TextRenderer.render(`recent/single`, {
            grade: score.Grade, pp: score.performance.normal.total.roundFixed(3), fcpp, accuracy: (score.Accuracy * 100).roundFixed(2), rank,
            score: score.ScoreFormatted, combo: FormatCombo(score.MaxCombo, score.Beatmap.max_combo, score.RulesetId), hits: FormatHits(score.Statistics, score.RulesetId),
            timestamp: score.EndedAt.toDiscordToolTip(),
            completion: !score.Passed ? `\n▸ **Map Completion:** ${CalculateProgress(score.Statistics, { circles: score.Beatmap.count_circles, sliders: score.Beatmap.count_sliders, spinners: score.Beatmap.count_spinners }, score.RulesetId)}%` : ""
        })

        embed.setAuthor({
            name: `${score.Beatmapset.title} [${score.Beatmap.version}] +${score.Mods.Formatted} [${score.Beatmap.difficulty_rating.roundFixed(2)}★]`,
            url: score.Beatmap.url,
            iconURL: score.User.avatar_url
        })
        embed.setFooter({
            text: `Try #${tries} | Page ${page + 1}/${maxPages} | Beatmap by ${score.Beatmapset.creator}`,
        })
        embed.setThumbnail(`https://b.ppy.sh/thumb/${score.Beatmapset.id}l.jpg`)
        embed.setDescription(description)

        return { embeds: [embed, (await mapEmbed)].filter(el => el != null), components: [buttons] }
    }

    private renderMultipleScores({ scores, page, maxPages }: { scores: Score.Recent[], page: number, maxPages: number }) {
        const resp = this.renderMultipleBestScores({ scores, page, maxPages })
        const embed = resp.embeds[0]

        embed.setAuthor({
            name: `Recent Plays for ${scores[0].User.username}`,
            url: `https://osu.ppy.sh/users/${scores[0].User.id}`,
            iconURL: GetFlag(scores[0].User.country_code)
        })
        return resp
    }

    private renderMultipleBestScores({ scores, page, maxPages }: { scores: Score.Recent[], page: number, maxPages: number }) {
        const embed = this.GetBaseEmbed()
            .setColor(this.data.GetEmbedColor())
        const buttons = this.renderNavigationButtons({ curentPage: page, maxPage: maxPages })

        const description = scores.map(score => {
            let rank: string = ""
            if (score.RankGlobal) {
                if (score.HasReplay) {
                    rank = `▸ [#${score.RankGlobal}](https://osu.ppy.sh/scores/osu/${score.Id}/download)`
                } else {
                    rank = `▸ #${score.RankGlobal}`
                }
            }
            return TextRenderer.render(`recent/score`, {
                index: score.index + 1, title: escapeMarkdown(score.Beatmapset.title), difficulty: escapeMarkdown(score.Beatmap.version), beatmapUrl: score.Beatmap.url, mods: score.Mods.Formatted, starRating: score.Beatmap.difficulty_rating.roundFixed(2),
                grade: score.Grade, pp: score.performance.normal.total.roundFixed(3), fcpp: score.performance.improved?.total ? `/${score.performance.improved.total.roundFixed(3)}pp` : "", accuracy: (score.Accuracy * 100).roundFixed(2), rank: rank,
                score: score.ScoreFormatted, combo: FormatCombo(score.MaxCombo, score.Beatmap.max_combo, score.RulesetId), hits: FormatHits(score.Statistics, score.RulesetId),
                timestamp: score.EndedAt.toDiscordToolTip()
            })
        }).join("\n")

        embed.setAuthor({
            name: `Recent Top ${GamemodeNames[scores[0].RulesetId]} Plays for ${scores[0].User.username}`,
            url: `https://osu.ppy.sh/users/${scores[0].User.id}`,
            iconURL: GetFlag(scores[0].User.country_code)
        })
        embed.setDescription(description)
        embed.setThumbnail(scores[0].User.avatar_url)
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
                .setCustomId(`recent;${this.componentId};${maxPage - 1};${randomBytes(4)}`)
                .setLabel(ButtonEmojis.End)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(curentPage == maxPage)
        )
        return row
    }
}

Recent.interactionData
    .setContexts(CONTEXT_FULL)
    .setName("recent")
    .setDescription("Display 100 recent scores")
    .addStringOption(GamemodeStringOption)
    .addNumberOption(PageNumberOption)
    .addStringOption(BeatmapStringOption)
    .addStringOption(UsernameStringOption)
    .addBooleanOption(ListBooleanOption)
    .addStringOption(IndexStringOption)
    .addBooleanOption(opt =>
        opt
            .setName("best")
            .setDescription("Get recent top plays")
            .setRequired(false)
    )
    .addBooleanOption(opt =>
        opt
            .setName("exclude-fails")
            .setDescription("Only get passes")
            .setRequired(false)
    )

CommandEmitterInstance.AddCommand(Recent, Recent.names)
InteractionRegistrerInstance.AddInteraction(Recent.interactionData)

Recent.helpData
    .setCommand(Recent.name)
    .setDescription("Display recent scores for a user.")
    .setUsage("recent [username] [gamemode] [page] [best] [exclude-fails] [list] [count] [map] [od]")
    .setAliases(Recent.names)
    .addArg(UsernameArg)
    .addArg(GamemodeArg)
    .addArg(PageArg)
    .addArg(new CommandHelpArg()
        .setName("best")
        .setDescription("Get recent top plays")
        .setUsage("-best"))
    .addArg(new CommandHelpArg()
        .setName("exclude-fails")
        .setDescription("Only get passes")
        .setUsage("-exclude-fails"))
    .addArg(new CommandHelpArg()
        .setName("list")
        .setDescription("List all recent scores")
        .setUsage("-list"))
    .addArg(new CommandHelpArg()
        .setName("count")
        .setDescription("Count recent passes and fails")
        .setUsage("-count"))
    .addArg(new CommandHelpArg()
        .setName("map")
        .setDescription("Display beatmap info")
        .setUsage("-map"))