import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { Gamemode } from "@src/class/api/osu/types/MiscTypes";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import NodeCache from "node-cache";
import { Logger } from "@src/class/Logger";
import { TextRenderer } from "@src/class/renderer/Text";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, escapeMarkdown } from "discord.js";
import { Score } from "@src/class/api/osu/class/Score";
import { randomBytes, randomInt } from "crypto";
import { ButtonEmojis, FormatCombo, FormatHits, GetFlag } from "@src/Utils";
import { EmojiFactory } from "@src/class/Emojis";
import { GamemodeNames } from "@src/class/api/osu/Consts";

interface args {
    Gamemode: Gamemode
    Username: string
    Id: number
    GreaterThan: number
    Reversed: boolean
    Specific: number[]
    Random: boolean
    Recent: boolean
    Page: number
    Type: "best" | "firsts" | "pinned"
    Sort: string
    Mods: string[]
}

const componentCache = new NodeCache({
    stdTTL: 60 * 60 * 24 * 7,
    checkperiod: 60 * 60 * 24,
    maxKeys: 10000, useClones: false
})

class TopData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        let Mode = this.GetModeFromCommand()
        if (Mode == "osu") Mode = this.data.GetGamemode()

        return {
            Gamemode: Mode,
            GreaterThan: this.data.GetNumber("g", ["-g", "gt", "-gt"]),
            Id: this.data.GetNumber("id", ["-id"]),
            Page: 0,
            Random: this.data.GetBoolean("rand", ["-rand"]),
            Recent: this.data.GetBoolean("recent", ["-recent", "r", "-r"]),
            Reversed: this.data.GetBoolean("rev", ["-rev", "rv", "-rv"]),
            Sort: this.data.GetString("sort", ["-sort"]),
            Specific: this.data.GetSpecific(),
            Type: this.GetTypeFromCommand(),
            Mods: this.data.GetMods(),
            Username: this.data.GetUsername()
        }
    }

    private GetModeFromCommand(): Gamemode {
        switch (this.data.GetCommand()) {
            case "osutop":
            case "top":
            case "pinned":
            case "firsts":
                return "osu"

            case "maniatop":
                return "mania"

            case "fruitstop":
            case "ctbtop":
                return "fruits"

            case "taikotop":
                return "taiko"

            default:
                return "osu"
        }
    }

    private GetTypeFromCommand(): "best" | "firsts" | "pinned" {
        switch (this.data.GetCommand()) {
            case "pinned":
                return "pinned"

            case "firsts":
                return "firsts"

            default:
                return "best"
        }
    }

    public GetOldComponentId(): string {
        if (!this.IsInteraction()) return
        const interaction = this.data.GetInteraction()
        if (interaction.isChatInputCommand()) return null
        if (interaction.isMessageComponent()) return interaction.customId.split(";")[1]
    }
}

class Top extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["top", "osutop", "maniatop", "taikotop", "ctbtop", "fruitstop"]
    private data: TopData
    private componentId: string
    private oldComponentId: string
    private args: args


    constructor(data: MessageEventData) {
        super()
        this.componentId = randomBytes(16).toString("hex")
        this.data = new TopData(data)
        this.args = this.data.args
        this.oldComponentId = this.data.GetOldComponentId()
        if (this.oldComponentId) this.args = componentCache.get<args>(this.oldComponentId)
        componentCache.set(this.componentId, this.args)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()
        const { GreaterThan, Gamemode, Id: _id, Mods, Page: _Page, Random, Recent, Reversed, Sort, Specific, Type, Username } = this.args
        const Id = !Username && !_id ? user.osu.userId : _id

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
                this.args.Page = Page
            }
        }

        if (!Username) {
            await this.data.Reply(this.RenderNoUserError())
            return CommandResponseCodes.OK
        }

        const fetcher = await Fetcher.Create(user.id)

        let scores = await fetcher.GetUserScores({ Gamemode: Gamemode, Type: Type, Id: Id, Username: Username, Limit: 100 })
        if (!scores) {
            await this.data.Reply(this.RenderApiError())
            Logger.Error(scores)
            return CommandResponseCodes.OK
        }

        if (GreaterThan) {
            let username = scores[0].user.username
            scores = scores.filter(el => el.pp > GreaterThan)
            if (!Recent && !Random && !Reversed) {
                const embed = this.RenderGreaterThan({ user: username, total: scores.length, pp: GreaterThan })
                this.data.Reply({ embeds: [embed] })
                return CommandResponseCodes.OK
            }
        }

        if (Recent) {
            scores.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        }

        if (Sort) {
            const key = this.GetSortKey(Sort).split(".")
            scores.sort((a, b) => {
                const sortByA = key.reduce((o, i) => o[i], a)
                const sortByB = key.reduce((o, i) => o[i], b)
                return sortByB - sortByA
            })
        }

        if (this.args.Reversed) {
            scores.reverse()
        }

        let pickedScores: Score.Firsts[] = scores.slice(Page * listPageSize, Page * listPageSize + listPageSize)

        if (Random) {
            pickedScores = []
            const random = randomInt(scores.length)
            pickedScores.push(scores[random])
        }

        if (Specific?.length > 0) {
            pickedScores = []
            for (let i = 0; i < Math.min(Specific.length, listPageSize); i++) {
                const score = scores[Specific[i] - 1]
                if (score) pickedScores.push(score)
            }
        }

        if (pickedScores.length > 5) pickedScores = pickedScores.slice(0, 5)

        await Promise.all(pickedScores.map(el => Promise.all([el.fetchPosition(user.id), el.fetchPerformance()])))

        const embed = this.RenderScores({ scores: pickedScores, totalScores: scores.length })
        const buttonsRow = 
            Random ? 
            this.renderRandomButton() :
            this.renderNavigationButtons({ curentPage: Page, maxPage: Math.ceil(scores.length / listPageSize) })

        this.data.Reply({ embeds: [embed], components: [buttonsRow] })

        return CommandResponseCodes.OK
    }

    private renderRandomButton() {
        const row = new ActionRowBuilder<ButtonBuilder>()
        const button = new ButtonBuilder()
            .setCustomId(`top;${this.componentId};0;${randomBytes(4)}`)
            .setStyle(ButtonStyle.Primary)
            .setLabel("?")
        row.addComponents(button)
        return row
    }

    private GetSortKey(inp: string) {
        if (inp.startsWith("r") && inp != "replay") this.args.Reversed = true
        switch (inp) {
            case "pp":
                return "pp"
            case "acc":
                return "accuracy"
            case "combo":
                return "maxCombo"
            case "score":
                return "score"
            case "date":
                return "createdAt"
            case "replay":
                return "replay"
            case "300":
            case "c300":
            case "count300":
            case "300s":
                return "statistics.count_300"
            case "100":
            case "c100":
            case "count100":
            case "100s":
                return "statistics.count_100"
            case "50":
            case "c50":
            case "count50":
            case "50s":
                return "statistics.count_50"
            case "miss":
            case "misses":
                return "statistics.count_miss"
            default:
                return "pp"
        }
    }

    private RenderGreaterThan({ user, total, pp }: { user: string, total: number, pp: number }) {
        const embed = this.GetBaseEmbed()
        embed.setDescription(TextRenderer.render("top/greaterThan", { username: user, scores: total, pp: pp }))
        return embed

    }

    private RenderScores({ scores, totalScores }: { scores: Score.Firsts[], totalScores: number }) {
        const embed = this.GetBaseEmbed()
        const description = scores.map((score: Score.Firsts) => {
            const { score: scoreNum, created_at, index, accuracy, max_combo: combo, mode, statistics, replay, position: _rank, rank: grade, mods,
                performance: { normal: { total: pp }, improved }, beatmap: { max_combo, url, version, difficulty_rating }, beatmapset: { title }
            } = score
            let rank: string = ""
            if (_rank) {
                if (replay) {
                    rank = `▸ [#${_rank}](https://osu.ppy.sh/scores/osu/${score.id}/download)`
                } else {
                    rank = `▸ #${_rank}`
                }
            }
            return TextRenderer.render("top/scores", {
                index: index + 1, title: escapeMarkdown(title), version: escapeMarkdown(version), url: url, mods: mods.length == 0 ? "NoMod" : mods.join(""), stars: difficulty_rating.roundFixed(2),
                grade: EmojiFactory.GetEmoji(`Ranking${grade}`), pp: pp.roundFixed(3), fcpp: improved ? `/${improved.total.roundFixed(3)}pp` : "", acc: (accuracy * 100).roundFixed(2), rank: rank,
                score: scoreNum.toLocaleString(), combo: FormatCombo(combo, max_combo, mode), hits: FormatHits(statistics, mode),
                setTime: new Date(created_at).toDiscordToolTip()
            })
        }).join("\n")
        embed
            .setDescription(description)
            .setAuthor({
                name: `Top ${Math.min(scores.length, 5)} ${GamemodeNames[scores[0].mode]} Play${scores.length > 1 ? "s" : ""} for ${scores[0].user.username}`,
                iconURL: GetFlag(scores[0].user.country_code), url: `https://osu.ppy.sh/users/${scores[0].user.id}`
            })
            .setThumbnail(scores[0].user.avatar_url)
            
        if (!this.args.Random)
            embed.setFooter({
                text: `Page ${this.args.Page + 1}/${Math.ceil(totalScores / 5)}`

            })
        return embed
    }

    private renderNavigationButtons({ curentPage, maxPage }: { curentPage: number, maxPage: number }) {
        const row = new ActionRowBuilder<ButtonBuilder>()
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`top;${this.componentId};0;${randomBytes(4)}`)
                .setLabel(ButtonEmojis.Start)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(curentPage == 0),
            new ButtonBuilder()
                .setCustomId(`top;${this.componentId};${curentPage - 1};${randomBytes(4)}`)
                .setLabel(ButtonEmojis.Left)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(curentPage == 0),
            new ButtonBuilder()
                .setCustomId(`top;${this.componentId};${curentPage + 1};${randomBytes(4)}`)
                .setLabel(ButtonEmojis.Right)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(curentPage == maxPage),
            new ButtonBuilder()
                .setCustomId(`top;${this.componentId};${maxPage - 1};${randomBytes(4)}`)
                .setLabel(ButtonEmojis.End)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(curentPage == maxPage)
        )
        return row
    }
}

CommandEmitterInstance.AddCommand(Top, Top.names)