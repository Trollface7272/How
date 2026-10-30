import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { Gamemode } from "@src/class/api/osu/types/MiscTypes";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { HandleAsync } from "@src/Utils";
import { Logger } from "@src/class/Logger";
import { BeatmapSet } from "@src/class/api/osu/class/BeatmapSet";
import { TextRenderer } from "@src/class/renderer/Text";
import { ActionRowBuilder, SlashCommandBuilder, SlashCommandStringOption, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { randomBytes } from "crypto";
import { InteractionRegistrerInstance } from "@src/class/InteractionRegisterer";
import { CONTEXT_FULL, GamemodeStringOption } from "@src/utils/discord/interaction";
import { CommandGroup, CommandHelp } from "@src/class/help/CommandHelp";
import { GamemodeArg } from "@src/utils/discord/help";
import { CommandHelpArg } from "@src/class/help/CommandHelpArg";
import { CommandArg } from "@src/class/partials/CommandArg";


const typeRegex = /-(any|ranked|qualified|loved|favourites|pending|wip|graveyard|mine)/
type type = "any" | "ranked" | "qualified" | "loved" | "favourites" | "pending" | "wip" | "graveyard" | "mine"

const argsConfig = {
    Type: new CommandArg("status", ["-status", "type", "-t", "-type"])
}

interface args {
    Gamemode: Gamemode
    Text: string
    Type: type
}

class SearchData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {
            Gamemode: this.data.GetGamemode(),
            Type: this.data.findString(typeRegex)?.slice(1) as type || this.data.GetString(argsConfig.Type.name, argsConfig.Type.aliases)?.replace("-", "") as type || "ranked",
            Text: this.data.GetRemaining("search")
        }
    }
}

class Search extends CommandBase implements CommandAbstract {
    public static readonly name: string = "search"
    public static readonly names: string[] = [this.name, "s"]
    public static readonly interactionData = new SlashCommandBuilder()
    public static readonly helpData = new CommandHelp()
    private data: SearchData


    constructor(data: MessageEventData) {
        super()
        this.data = new SearchData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const { Gamemode, Text, Type } = this.data.args
        const user = this.data.GetUser()

        if (!Text || Text.trim() === "") {
            await this.data.Reply({
                content: "Please provide a search query.",
                ephemeral: true
            })
            return CommandResponseCodes.USER_ERROR
        }

        const fetcher = await Fetcher.Create(user.id)
        const [beatmaps, beatmapsErr] = await HandleAsync(fetcher.SearchBeatmaps({ query: Text, gamemode: Gamemode, type: Type }))
        if (beatmapsErr) {
            Logger.Error("Search error:", beatmapsErr)
            await this.data.Reply(this.RenderApiError())
            return CommandResponseCodes.ERROR
        }

        if (!beatmaps || !beatmaps.total) {
            await this.data.Reply(this.RenderNoBeatmapsFound())
            return CommandResponseCodes.USER_ERROR
        }

        const sets = beatmaps.beatmapsets.slice(0, 10).filter(set => set)

        if (sets.length === 0) {
            await this.data.Reply(this.RenderNoBeatmapsFound())
            return CommandResponseCodes.USER_ERROR
        }

        const data = sets.map((set, i) => ({
            title: set.title, index: i + 1, id: set.id, creator: set.creator, status: set.status, difficultyEmojis: set.DifficultyEmojis,
            artist: set.artist, favourite_count: set.favourite_count
        }))

        let text = TextRenderer.render("beatmap/search", { beatmaps: data })
        if (text.length > 4096) {
            text = text.slice(0, 4093) + "..."
        }
        const embed = this.GetBaseEmbed()
            .setDescription(text)
        const select = this.getPicker(sets)

        await this.data.Reply({
            embeds: [embed],
            components: [select]
        })
        return CommandResponseCodes.OK
    }

    private getPicker(beatmaps: BeatmapSet.SearchSet[]) {
        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        const select = new StringSelectMenuBuilder()
            .setCustomId(`beatmap;search;id;${this.data.args.Gamemode};${randomBytes(8).toString("hex")}`)

        const data = beatmaps.map((set, i) => {
            return new StringSelectMenuOptionBuilder()
                .setLabel(`${i + 1}. ${set.title}`).setValue(set.beatmaps.at(-1).id.toString())
        })

        select.addOptions(data)
        row.addComponents(select)
        return row
    }

}

Search.helpData
    .setCommand(Search.name)
    .setAliases(Search.names.filter(el => el !== Search.name))
    .setDescription(`Search for beatmap`)
    .setUsage(`!search [options] [query]`)
    .setGroup(CommandGroup.Beatmaps)
    .addArg(
        new CommandHelpArg()
            .setName(argsConfig.Type.name)
            .setAliases(argsConfig.Type.aliases)
            .setDescription(`Filter by beatmap ranked status`)
            .setUsage(`${argsConfig.Type.name} [any/ranked/qualified/loved/favourites/pending/wip/graveyard/mine]`)
    )
    .addArg(GamemodeArg)

Search.interactionData
    .setName("search")
    .setDescription("Search for beatmap")
    .setContexts(CONTEXT_FULL)
    .addStringOption(opt =>
        opt
            .setName("search")
            .setDescription("Text to search")
            .setRequired(true)
    )
    .addStringOption(GamemodeStringOption)
    .addStringOption(opt =>
        opt
            .setName("status")
            .setDescription("Beatmap ranked status")
            .setRequired(false)
            .setChoices({
                name: "Has Leaderboards",
                value: "-"
            }, {
                name: "all",
                value: "any"
            }, {
                name: "Ranked",
                value: "ranked"
            }, {
                name: "Qualified",
                value: "qualified"
            }, {
                name: "Loved",
                value: "loved"
            }, {
                name: "Favourites",
                value: "favourites"
            }, {
                name: "Pending",
                value: "pending"
            }, {
                name: "WIP",
                value: "wip"
            }, {
                name: "Graveyarded",
                value: "graveyard"
            }, {
                name: "Mine",
                value: "mine"
            })
    )
CommandEmitterInstance.AddCommand(Search, Search.names)
InteractionRegistrerInstance.AddInteraction(Search.interactionData)
export default Search;
