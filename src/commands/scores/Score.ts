import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandWithComponentsBase } from "@src/class/base/Command";
import { Gamemode, ParsedMods } from "@src/class/api/osu/types/MiscTypes";
import { ButtonEmojis, FormatCombo, FormatHits, GetFlag, HandleAsync, lookupScoresColumn, merge } from "@src/Utils";
import { Logger } from "@src/class/Logger";
import { Document, Filter, Sort } from "mongodb";
import { ScoreFactory } from "@src/class/database/Score";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, escapeMarkdown, InteractionType, MessageComponentInteraction } from "discord.js";
import { TextRenderer } from "@src/class/renderer/Text";
import { EmojiFactory } from "@src/class/Emojis";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { randomBytes } from "crypto";
import NodeCache from "node-cache";


type SortType = "ar" | "od" | "cs" | "hp" | "pp" | "bpm" | "score"
    | "rar" | "rod" | "rcs" | "rhp" | "rpp" | "rbpm" | "rscore"

interface args {
    Id?: number
    Username?: string
    Gamemode: Gamemode
    Reversed: boolean
    Random: boolean
    Page: number
    Sort: SortType[]
    Filter: string[]
    Mods: ParsedMods,
    Anyone: boolean
}

const signs = {
    "<": "$lt",
    ">": "$gt",
    "=": "$eq",
    "<=": "$lte",
    ">=": "$gte",
    "==": "$eq"
}

const componentCache = new NodeCache({
    stdTTL: 60 * 60 * 24 * 7,
    checkperiod: 60 * 60 * 24,
    maxKeys: 10000, useClones: false
})


class ScoreData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        const sorts = this.data.GetString("sort", ["s", "-s"])
        const filters = this.data.GetString("filter", ["f", "-f", "-filter"])
        let sortArr: SortType[] = []
        let filterArr: string[] = []
        if (sorts) {
            sortArr = sorts.split(" ") as SortType[]
        }
        if (filters) {
            filterArr = filters.split(",")
        }
        return {
            Sort: sortArr,
            Gamemode: this.data.GetGamemode(),
            Reversed: this.data.GetBoolean("reversed", ["rev", "-rev"]),
            Random: this.data.GetBoolean("random", ["rand", "-rand"]),
            Page: this.data.GetNumber("page", ["p", "-p", "-page"], 1),
            Filter: filterArr,
            Mods: this.data.GetExactMods(),
            Anyone: this.data.GetBoolean("anyone", ["any", "-any", "-anyone"]),
            Id: this.data.GetNumber("id", ["i", "-i", "-id"]),
            Username: this.data.GetUsername(),
        }
    }
}

class Score extends CommandWithComponentsBase implements CommandAbstract {
    public static readonly names: string[] = ["sc", "score", "scores"]
    declare protected data: ScoreData
    protected args: args

    constructor(data: MessageEventData) {
        super(data)
        this.data = new ScoreData(data)
        this.args = this.data.args
        if (this.oldComponentId) this.args = componentCache.get<args>(this.oldComponentId)
        componentCache.set(this.componentId, this.args)

    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()

        if (this.data.IsInteraction()) {
            if (this.data.GetInteractionType() == InteractionType.MessageComponent) {
                const customId = (this.data.GetInteraction() as MessageComponentInteraction).customId
                const [command, componentId, page, random] = customId.split(";")
                this.args.Page = parseInt(page)
            }
        }

        if (!this.args.Username && !this.args.Id && !this.args.Anyone) {
            this.args.Id = user.osu.userId
        }

        const fetcher = await Fetcher.Create(user.id)

        const { Id: _id, Username, Gamemode, Reversed, Random, Page, Sort, Filter, Mods, Anyone } = this.args
        const Id = _id ?? await fetcher.LookupId(Username)
        const Limit = Random ? 1 : 5

        const sortQuery: Sort = {}
        for (const sort of Sort) {
            const sign = sort.startsWith("r") ? 1 : -1
            const column = lookupScoresColumn(sort.startsWith("r") ? sort.replace("r", "") : sort)
            if (!column) {
                Logger.Info(`Unknown sort column: ${sort}`, Sort)
                continue
            }
            sortQuery[column] = (Reversed ? -sign : sign) as 1 | -1
        }

        if (Sort.length === 0) sortQuery.setAt = Reversed ? 1 : -1

        const filterQuery: Filter<Document> = {}
        for (const filter of Filter) {
            merge(filterQuery, this.parseFilter(filter))
        }
        
        if (Mods.exactExclude?.mods.length > 0) {
            merge(filterQuery, { mods: { $not: { $all: Mods.exactExclude.mods } } })
        }
        if (Mods.exactInclude?.mods.length > 0) {
            merge(filterQuery, { mods: { $all: Mods.exactInclude.mods, "$size": Mods.exactInclude.mods.length } })
        }
        if (Mods.exclude?.mods.length > 0) {
            merge(filterQuery, { mods: { $nin: Mods.exclude.mods } })
        }
        if (Mods.include?.mods.length > 0) {
            merge(filterQuery, { mods: { $all: Mods.include.mods } })
        }


        const [score, err] = await HandleAsync(ScoreFactory.GetScoresByUser(Anyone ? -1 : Id, filterQuery, sortQuery, Limit, (Page - 1) * Limit, Random))
        if (err) {
            Logger.Error(err)
            await this.data.Reply(this.RenderApiError())
            return CommandResponseCodes.UnknownError
        }
        const { scores, total, randomOffset } = score
        const profileQuery = HandleAsync(fetcher.GetProfile({ Username: Anyone ? scores[0].userId : Username ?? Id, Gamemode: Gamemode }))

        if (total == 0) {
            await this.data.Reply(this.RenderNoImportedScoresError())
            return CommandResponseCodes.OK
        }

        const description = scores.map((score, i) => {
            const index = Random ? randomOffset + 1 : (Page - 1) * 5 + i + 1
            if (score.mods.length === 0) score.mods.push("NoMod")
            return TextRenderer.render("score/score", {
                index: index, title: escapeMarkdown(score.beatmap.title, { escape: false }), version: escapeMarkdown(score.beatmap.version, { escape: false }), url: score.beatmap.url, mods: score.mods.join(""), difficulty: score.beatmap.difficulty.stars.total.roundFixed(2),
                grade: EmojiFactory.GetEmoji(`Ranking${score.rank}`), pp: score.pp.roundFixed(3), improvedPp: score.improvedPp.roundFixed(3), accuracy: score.accuracy.roundFixed(2),
                score: score.score.toLocaleString(), combo: FormatCombo(score.combo, score.beatmap.difficulty.combo, score.beatmap.mode), counts: FormatHits({ ok: score.counts[100], great: score.counts[300], meh: score.counts[50], miss: score.counts.misses }, score.beatmap.mode),
                setAt: score.setAt.toDiscordToolTip()
            })
        }).join("\n")

        const [profile, profileErr] = await profileQuery
        if (profileErr) {
            Logger.Error(profileErr)
            await this.data.Reply(this.RenderApiError())
            return CommandResponseCodes.UnknownError
        }

        const embed = this.GetBaseEmbed()
            .setAuthor({
                name: `Matched scores${Anyone ? "" : ` for ${profile.username}`}`,
                iconURL: GetFlag(profile.country.code),
                url: profile.url
            })
            .setFooter({
                text: `Page ${Page}/${Math.ceil(total / (Random ? 1 : 5))}`
            })
            .setThumbnail(profile.avatar_url)
            .setDescription(description)

        const buttons = this.CreateButtons(Page, Math.ceil(total / (Random ? 1 : 5)))

        this.data.Reply({ embeds: [embed], components: [buttons] })

        return CommandResponseCodes.OK
    }

    private RenderNoImportedScoresError() {
        const embed = this.GetBaseEmbed()
        embed.setDescription("**No scores found.**")
        return { embeds: [embed] }
    }

    private CreateButtons(page: number, maxPage: number) {
        const row = new ActionRowBuilder<ButtonBuilder>()
        if (this.args.Random) {
            const button = new ButtonBuilder()
                .setCustomId(`score;${this.componentId};1;${randomBytes(4)}`)
                .setLabel("?")
                .setStyle(ButtonStyle.Primary)
            row.addComponents(button)
            return row
        }
        const buttons = [
            this.createButton(`scores;${this.componentId};1;${randomBytes(8).toString("hex")}`, ButtonEmojis.Start, page == 1),
            this.createButton(`scores;${this.componentId};${Math.max(1, page - 1)};${randomBytes(8).toString("hex")}`, ButtonEmojis.Left, page === 1),
            this.createButton(`scores;${this.componentId};${Math.min(maxPage, page + 1)};${randomBytes(8).toString("hex")}`, ButtonEmojis.Right, page === maxPage),
            this.createButton(`scores;${this.componentId};${maxPage};${randomBytes(8).toString("hex")}`, ButtonEmojis.End, page === maxPage)
        ]
        row.addComponents(...buttons)
        return row
    }

    private createButton(id: string, label: string, disabled: boolean) {
        return new ButtonBuilder()
            .setStyle(ButtonStyle.Primary)
            .setCustomId(id)
            .setLabel(label)
            .setDisabled(disabled)
    }


    private parseFilter(filter: string): Filter<Score> {
        const regex = /([A-z]*)(<=|>=|==|<|>|=)([A-z0-9]*)/gm
        const [, collumn, sign, value] = regex.exec(filter)
        return {
            [lookupScoresColumn(collumn)]: {
                [signs[sign]]: value.isNumber() ? parseFloat(value) : value
            }
        }
    }

}

CommandEmitterInstance.AddCommand(Score, Score.names)