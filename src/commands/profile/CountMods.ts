import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { Gamemode } from "@src/class/api/osu/types/MiscTypes";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { GetFlag, HandleAsync } from "@src/Utils";
import { Logger } from "@src/class/Logger";
import { GamemodeNames } from "@src/class/api/osu/Consts";

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
            Username: this.data.GetUsername(),
        }
    }
}

class CountMods extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["countmods", "cm"]
    private data: CountModsData


    constructor(data: MessageEventData) {
        super()
        this.data = new CountModsData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()
        const { Gamemode, Id: _id, Username } = this.data.args
        const Id = !Username && !_id ? user.osu.userId : _id

        const fetcher = await Fetcher.Create(user.id)
        const [scores, err] = await HandleAsync(fetcher.GetUserScores({ Id: Id, Username: Username, Gamemode: Gamemode, Limit: 100, Type: "best" }))
        if (err) {
            Logger.Error(err)
            return CommandResponseCodes.OK
        }
        
        const mods = new Map<string, { count: number, mods: string, pp: number }>()
        for (const score of scores) {
            let mod = score.mods.join("")
            if (mod == "") mod = "Nomod"
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
            .setAuthor({ name: `Mods in ${GamemodeNames[Gamemode]} Top Plays for ${scores[0].user.username}`, iconURL: GetFlag(scores[0].user.country_code), url: `https://osu.ppy.sh/users/${scores[0].user.id}` })
            .setDescription(description)
            .setThumbnail(scores[0].user.avatar_url)

        await this.data.Reply({ embeds: [embed] })
        return CommandResponseCodes.OK
    }

}

CommandEmitterInstance.AddCommand(CountMods, CountMods.names)