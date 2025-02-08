import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { SlashCommandBuilder } from "discord.js";
import { Guild, GuildFactory } from "@src/class/database/Guild";
import { User } from "@src/class/database/User";

interface args {
    Type: "server" | "user"
    Prefix: string
    Clear: boolean
    Remove: boolean
    List: boolean
}

class PrefixAliasData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {
            Type: this.data.GetString("type", ["-type", "t", "-t"]) as "server" | "user" ?? "user",
            Clear: this.data.GetBoolean("clear", ["-clear"]),
            Remove: this.data.GetBoolean("remove", ["-remove"]),
            List: this.data.GetBoolean("list", ["-list"]),
            Prefix: this.data.GetRemaining("prefix")
        }
    }
}

class PrefixAlias extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["prefixalias"]
    public static readonly interactionData: SlashCommandBuilder = new SlashCommandBuilder()
    private data: PrefixAliasData


    constructor(data: MessageEventData) {
        super()
        this.data = new PrefixAliasData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()

        const { Type } = this.data.args

        let ret: string = null

        switch (Type) {
            case "user": {
                ret = await this.HandleEntity(user)
                break
            }

            case "server": {
                if (!this.data.IsInGuild()) {
                    this.data.Reply({ content: "Server prefix is only modifiable in server" })
                    return CommandResponseCodes.OK
                }

                const member = this.data.GetMember()
                if (!member.permissions.any("ManageMessages", true)) {
                    this.data.Reply({ content: "Server prefix is only modifiable by admin" })
                    return CommandResponseCodes.OK
                }

                const guild = await GuildFactory.GetGuild(member.guild.id)

                if (!guild) {
                    this.data.Reply({ content: "Unknown error occured" })
                    return CommandResponseCodes.UnknownError
                }

                ret = await this.HandleEntity(guild)
                break;
            }

            default: {
                this.data.Reply({ content: `Unknown type "${Type}", valid types: server, user` })
                return CommandResponseCodes.OK
            }
        }

        const embed = this.GetBaseEmbed()
            .setDescription(ret ?? `Successfully modified prefixes`)

        await this.data.Reply({
            embeds: [embed]
        })



        return CommandResponseCodes.OK
    }

    private async HandleEntity(entity: User | Guild) {
        const { Prefix, Clear, Remove, List } = this.data.args

        if (List) {
            if (entity.prefixes.length === 0) return "No prefix aliases found"
            return entity.prefixes.join(", ")
        }

        if (Clear) {
            entity.prefixes = []
            await entity.Save()
        }

        if (Remove) {
            entity.prefixes = entity.prefixes.filter(el => el !== Prefix)
            await entity.Save()
        }
        
        entity.prefixes.push(Prefix)
        await entity.Save()
    }

}

CommandEmitterInstance.AddCommand(PrefixAlias, PrefixAlias.names)