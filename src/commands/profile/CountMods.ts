import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { CommandGroup, CommandHelp } from "@src/class/help/CommandHelp";
import { GamemodeArg, UsernameArg } from "@src/utils/discord/help";
import { Gamemode } from "@src/class/api/osu/types/MiscTypes";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { GetFlag, HandleAsync } from "@src/Utils";
import { Logger } from "@src/class/Logger";
import { GamemodeNames } from "@src/class/api/osu/Consts";
import { SlashCommandBuilder } from "discord.js";
import { CONTEXT_FULL, GamemodeStringOption, UsernameStringOption } from "@src/utils/discord/interaction";
import { InteractionRegistrerInstance } from "@src/class/InteractionRegisterer";

interface args {
    Gamemode: Gamemode
    Username: string
    Id: number
}

class CountModsData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {
            Gamemode: this.data.GetGamemode(),
            Id: this.data.GetNumber("id", ["-id"]),
            Username: this.data.GetRemaining(),
        }
    }
}

class CountMods extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["countmods", "cm", "count-mods"]
    public static readonly interactionData: SlashCommandBuilder = new SlashCommandBuilder()
    public static readonly helpData = new CommandHelp()
    private data: CountModsData


    constructor(data: MessageEventData) {
        super()
        this.data = new CountModsData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()
        const { Gamemode, Id: _id, Username } = this.data.args
        const Id = !Username && !_id ? user?.osu?.userId : _id

        if (!Id && !Username) {
            this.data.Reply(this.RenderNoUserError())
            return CommandResponseCodes.USER_ERROR
        }

        const fetcher = await Fetcher.Create(user.id)
        const [_scores, err] = await HandleAsync(
            Promise.all([
                fetcher.GetUserScores({ Id: Id, Username: Username, Gamemode: Gamemode, Limit: 100, Type: "best" }),
                fetcher.GetUserScores({ Id: Id, Username: Username, Gamemode: Gamemode, Limit: 100, Type: "best", Offset: 100 })
            ])
        )
        if (err) {
            Logger.Error(err)
            return CommandResponseCodes.USER_ERROR
        }

        const scores = [..._scores[0], ..._scores[1]]

        const mods = new Map<string, { count: number, mods: string, pp: number }>()
        for (const score of scores) {
            let mod = score.Mods.Formatted
            if (mods.has(mod)) {
                const val = mods.get(mod)
                val.count++
                val.pp += score.weight.pp
            } else {
                mods.set(mod, {
                    count: 1,
                    mods: mod,
                    pp: score.weight.pp
                })
            }
        }

        const data: { count: number, mods: string, pp: number }[] = []
        for (const [mod, vals] of mods) {
            data.push({ mods: mod, count: vals.count, pp: vals.pp })
        }
        data.sort((a, b) => b.count - a.count)

        const description = data.map(el => `**${el.mods}**: ${el.count} (${Math.round(el.pp * 100) / 100}pp)`).join("\n")

        const embed = this.GetBaseEmbed()
            .setAuthor({ name: `Mods in ${GamemodeNames[Gamemode]} Top Plays for ${scores[0].User.username}`, iconURL: GetFlag(scores[0].User.country_code), url: `https://osu.ppy.sh/users/${scores[0].User.id}` })
            .setDescription(description)
            .setThumbnail(scores[0].User.avatar_url)

        await this.data.Reply({ embeds: [embed] })
        return CommandResponseCodes.OK
    }

}

CountMods.interactionData
    .setContexts(CONTEXT_FULL)
    .setName("count-mods")
    .setDescription("Display user mod distribution in top 100")
    .addStringOption(UsernameStringOption)
    .addStringOption(GamemodeStringOption)

CommandEmitterInstance.AddCommand(CountMods, CountMods.names)
InteractionRegistrerInstance.AddInteraction(CountMods.interactionData)

CountMods.helpData
    .setCommand(CountMods.name)
    .setGroup(CommandGroup.Profile)
    .setDescription("Display user mod distribution in top 100")
    .setUsage("countmods [username] [gamemode]")
    .setAliases(CountMods.names)
    .addArg(UsernameArg)
    .addArg(GamemodeArg);