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
import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { randomBytes } from "crypto";


const typeRegex = /-(any|ranked|qualified|loved|favourites|pending|wip|graveyard|mine)/
type type = "any" | "ranked" | "qualified" | "loved" | "favourites" | "pending" | "wip" | "graveyard" | "mine"

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
            Type: this.data.findString(typeRegex)?.slice(1) as type || this.data.GetString("type", ["-t", "-type"]) as type || "ranked",
            Text: this.data.GetUsername() 
        }
    }
}

class Search extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["search", "s"]
    private data: SearchData


    constructor(data: MessageEventData) {
        super()
        this.data = new SearchData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const { Gamemode, Text, Type } = this.data.args
        const user = this.data.GetUser()

        const fetcher = await Fetcher.Create(user.id)
        const [beatmaps, beatmapsErr] = await HandleAsync(fetcher.SearchBeatmaps({query: Text, gamemode: Gamemode, type: Type}))
        if (beatmapsErr) {
            Logger.Error(beatmapsErr)
            this.data.Reply(this.RenderApiError())
            return CommandResponseCodes.UnknownError
        }

        if (!beatmaps.total) {
            this.data.Reply(this.RenderNoBeatmapsFound())
            return CommandResponseCodes.OK
        }

        const sets = beatmaps.beatmapsets.slice(0, 10).filter(set => set)

        const data = sets.map((set, i) => ({
            title: set.title, index: i + 1, id: set.id, creator: set.creator, status: set.status, difficultyEmojis: set.DifficultyEmojis,
            artist: set.artist, favourite_count: set.favourite_count
        }))

        let text = TextRenderer.render("beatmap/search", {beatmaps: data})
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

CommandEmitterInstance.AddCommand(Search, Search.names)