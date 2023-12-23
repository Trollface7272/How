import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { Gamemode } from "@src/class/api/osu/MiscTypes";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { TextRenderer } from "@src/class/renderer/Text";
import { Score } from "@src/class/api/osu/Score";
import { ButtonEmojis, FormatCombo, FormatHits } from "@src/Utils";
import { EmojiFactory } from "@src/class/Emojis";
import NodeCache from "node-cache";
import { randomBytes } from "crypto";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { matchForId } from "@src/class/api/osu/Utils";

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
        if (this.IsInteraction()) {
            const interaction = this.data.GetInteraction()
            if (interaction.isButton()) {
                const [action, componentId, page] = interaction.customId.split(";")
                beatmap = matchForId(interaction?.message?.embeds?.[0]?.url ?? "")
            }
        }
        return {
            Gamemode: this.data.GetGamemode(),
            Page: 0,
            Id: this.data.GetNumber("id", []),
            Beatmap: beatmap,
            Username: this.data.GetUsername(),
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
        const { Gamemode, Beatmap: _Beatmap, Username: _username, Id, Page: _Page } = this.data.args
        const Username = !_username && !Id ? user.username : _username
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
            const embed = this.NoScoresFound(Username)
            this.data.Reply({ embeds: [embed] })
            return CommandResponseCodes.OK
        }
        const pickedScoreIds = scores.slice(this.args.Page * 3, this.args.Page * 3 + 3).map((el: Score.BaseScore) => el.id)
        const pickedScores = await Promise.all(pickedScoreIds.map((el: number) => fetcher.GetScoreById({ id: el, Gamemode: Gamemode })))
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
        const { user_id, beatmapset: { title, creator, id: beatmapsetId }, beatmap: { version, url } } = scores[0]
        const description = scores.map(score => {
            const { created_at, index, mods, rank: grade, score: scoreNum, max_combo: combo, statistics, accuracy, performance: { normal: { total: pp }, improved }, beatmap: { max_combo, mode, difficulty_rating: stars } } = score
            const fcpp = improved ? improved.total : undefined
            let rank: string = ""
            if (score.rank_global) {
                if (score.replay) {
                    rank = `▸ [#${score.rank_global}](https://osu.ppy.sh/scores/osu/${score.id}/download)`
                } else {
                    rank = `▸ #${score.rank_global}`
                }
            }
            return TextRenderer.render("compare", {
                index: index, mods: mods, stars: stars.roundFixed(2),
                grade: EmojiFactory.GetEmoji(`Ranking${grade}`), pp: pp.roundFixed(3), fcpp: fcpp ? `/${fcpp.roundFixed(3)}pp` : "", acc: (accuracy * 100).roundFixed(2), rank: rank,
                score: scoreNum.toLocaleString(), combo: FormatCombo(combo, max_combo, mode), hits: FormatHits(statistics, mode),
                setTime: new Date(created_at).toDiscordToolTip(),
            })
        }).join("\n")
        embed
            .setDescription(description)
            .setAuthor({ name: `${title} [${version}] by ${creator}`, iconURL: `https://a.ppy.sh/${user_id}`, url: url })
            .setThumbnail(`https://b.ppy.sh/thumb/${beatmapsetId}l.jpg`)
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

CommandEmitterInstance.AddCommand(Compare, Compare.names)