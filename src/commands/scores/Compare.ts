import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { Gamemode } from "@src/class/api/osu/types/MiscTypes";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { TextRenderer } from "@src/class/renderer/Text";
import { Score } from "@src/class/api/osu/class/Score";
import { ButtonEmojis, FormatCombo, FormatHits } from "@src/Utils";
import NodeCache from "node-cache";
import { randomBytes } from "crypto";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js";
import { matchForId } from "@src/class/api/osu/Utils";
import { BeatmapStringOption, CONTEXT_FULL, GamemodeStringOption, PageNumberOption, UsernameStringOption } from "@src/utils/discord/interaction";
import { InteractionRegistrerInstance } from "@src/class/InteractionRegisterer";

interface args {
    Gamemode: Gamemode
    Beatmap: number
    Username?: string
    Id?: number
    Page: number
}

const componentCache = new NodeCache({
    stdTTL: 60 * 60 * 24 * 7,
    checkperiod: 60 * 60 * 24,
    maxKeys: 10000, useClones: false
})

class CompareData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        let beatmap = this.data.GetBeatmap()
        let Page = 0
        if (this.IsInteraction()) {
            const interaction = this.data.GetInteraction()
            if (interaction.isButton()) {
                const [action, componentId, page] = interaction.customId.split(";")
                beatmap = matchForId(interaction?.message?.embeds?.[0]?.url ?? "")
                Page = parseInt(page)
            }
        }
        return {
            Gamemode: this.data.GetGamemode(),
            Page: Page,
            Id: this.data.GetNumber("id", []),
            Beatmap: beatmap,
            Username: this.data.GetRemaining(),
        }
    }

    public GetBeatmapFromConversation(): Promise<number> {
        return this.data.GetBeatmapFromConversation()
    }

    public GetOldComponentId(): string {
        if (!this.IsInteraction()) return
        const interaction = this.data.GetInteraction()
        if (interaction.isChatInputCommand()) return null
        if (interaction.isMessageComponent()) return interaction.customId.split(";")[1]
    }
}

class Compare extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["compare", "c", "comparison", "comparescore", "cs", "comparescoresonbeatmap", "myscoresonthisbeatmap", "scorecomparison"]
    public static readonly interactionData: SlashCommandBuilder = new SlashCommandBuilder()
    private data: CompareData
    private args: args
    private componentId: string
    private oldComponentId: string

    constructor(data: MessageEventData) {
        super()
        this.componentId = randomBytes(16).toString("hex")
        this.data = new CompareData(data)
        this.args = this.data.args
        this.oldComponentId = this.data.GetOldComponentId()
        if (this.oldComponentId) this.args = componentCache.get<args>(this.oldComponentId)
        componentCache.set(this.componentId, this.args)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()
        const { Gamemode, Beatmap: _Beatmap, Username: _username, Id: _id, Page: _Page } = this.args
        let Id = _id
        let Username = _username
        if (!Username && !_id) {
            this.args.Id = user.osu?.userId
            Id = user.osu?.userId
            Username = user.osu?.username
        }

        if (!Username && !Id) {
            this.data.Reply(this.RenderNoUserError())
            return CommandResponseCodes.OK
        }

        const Beatmap = _Beatmap || await this.data.GetBeatmapFromConversation()
        let Page = _Page
        if (this.data.IsInteraction()) {
            const interaction = this.data.GetInteraction()
            if (interaction.isButton()) {
                const [action, componentId, page] = interaction.customId.split(";")
                Page = parseInt(page)
                this.args.Page = Page
            }
        }
        if (!Beatmap) {
            const embed = this.BeatmapNotFoundInConversation()
            this.data.Reply({ embeds: [embed] })
            return CommandResponseCodes.OK
        }

        const fetcher = await Fetcher.Create(user.id)
        const scores = await fetcher.GetBeatmapUserScores({ Beatmap: Beatmap, Username: Username, Id: Id, Gamemode: Gamemode })
        if (!scores.length) {
            const embed = this.NoScoresFound(Username ?? Id.toString())
            this.data.Reply({ embeds: [embed] })
            return CommandResponseCodes.OK
        }
        const pickedScoreIds = scores.slice(this.args.Page * 3, this.args.Page * 3 + 3).map((el: Score.BaseScore) => el.Id)
        const pickedScores = await Promise.all(pickedScoreIds.map((el: number) => fetcher.GetScoreById({ id: el, Gamemode: scores[0].RulesetId })))
        pickedScores.forEach((score, i) => {
            score.index = this.args.Page * 3 + i + 1
        })
        await Promise.all(pickedScores.map((score: Score.FromId) => score.fetchPerformance()))

        const embed = this.RenderScores({ scores: pickedScores, totalScores: scores.length })
        const buttons = Math.ceil(scores.length / 3) == 1 ? undefined : this.RenderButtons({ curentPage: this.args.Page, maxPage: Math.ceil(scores.length / 3) })
        this.data.Reply({ embeds: [embed], components: buttons ? [buttons] : undefined })

        return CommandResponseCodes.OK
    }

    private NoScoresFound(username: string) {
        const embed = this.GetBaseEmbed()
        embed.setDescription(`**User \`${username}\` has no scores.**`)
        return embed
    }

    private BeatmapNotFoundInConversation() {
        const embed = this.GetBaseEmbed()
        embed.setDescription("No beatmap found in conversation")
        return embed
    }

    private RenderScores({ scores, totalScores }: { scores: Score.FromId[], totalScores: number }) {
        const embed = this.GetBaseEmbed()
        const { Beatmap: beatmap, Beatmapset: beatmapset, User: user } = scores[0]
        const description = scores.map(score => {
            let rank: string = ""
            if (score.RankGlobal) {
                if (score.HasReplay) {
                    rank = `▸ [#${score.RankGlobal}](https://osu.ppy.sh/scores/${score.Id}/download)`
                } else {
                    rank = `▸ #${score.RankGlobal}`
                }
            }
            return TextRenderer.render("compare", {
                index: score.index, mods: score.Mods.Formatted, stars: score.Beatmap.difficulty_rating.roundFixed(2),
                grade: score.Grade, pp: score.performance.normal.total.roundFixed(3), fcpp: score.performance?.improved?.total ? `/${score.performance.improved.total.roundFixed(3)}pp` : "", acc: (score.Accuracy * 100).roundFixed(2), rank: rank,
                score: score.ScoreFormatted, combo: FormatCombo(score.MaxCombo, score.Beatmap.max_combo, score.RulesetId), hits: FormatHits(score.Statistics, score.RulesetId),
                setTime: score.EndedAt.toDiscordToolTip(),
            })
        }).join("\n")
        embed
            .setDescription(description)
            .setAuthor({ name: `${beatmapset.title} [${beatmap.version}] by ${beatmapset.creator}`, iconURL: `https://a.ppy.sh/${user.id}`, url: beatmap.url })
            .setThumbnail(`https://b.ppy.sh/thumb/${beatmapset.id}l.jpg`)
            .setFooter({ text: `Page ${this.args.Page + 1} of ${Math.ceil(totalScores / 3)}` })
        return embed

    }

    private RenderButtons({ curentPage, maxPage }: { curentPage: number, maxPage: number }) {
        const row = new ActionRowBuilder<ButtonBuilder>()
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`compare;${this.componentId};0;${randomBytes(4)}`)
                .setLabel(ButtonEmojis.Start)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(curentPage == 0),
            new ButtonBuilder()
                .setCustomId(`compare;${this.componentId};${curentPage - 1};${randomBytes(4)}`)
                .setLabel(ButtonEmojis.Left)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(curentPage == 0),
            new ButtonBuilder()
                .setCustomId(`compare;${this.componentId};${curentPage + 1};${randomBytes(4)}`)
                .setLabel(ButtonEmojis.Right)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(curentPage == maxPage),
            new ButtonBuilder()
                .setCustomId(`compare;${this.componentId};${maxPage - 1};${randomBytes(4)}`)
                .setLabel(ButtonEmojis.End)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(curentPage == maxPage)
        )

        return row
    }

}

Compare.interactionData
    .setContexts(CONTEXT_FULL)
    .setName("compare")
    .setDescription("Display your score on a map")
    .addStringOption(BeatmapStringOption)
    .addStringOption(UsernameStringOption)
    .addStringOption(GamemodeStringOption)
    .addNumberOption(PageNumberOption)


CommandEmitterInstance.AddCommand(Compare, Compare.names)
InteractionRegistrerInstance.AddInteraction(Compare.interactionData)