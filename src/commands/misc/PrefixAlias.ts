import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { Guild, GuildFactory } from "@src/class/database/Guild";
import { User } from "@src/class/database/User";
import { CommandGroup, CommandHelp } from "@src/class/help/CommandHelp";
import { CommandHelpArg } from "@src/class/help/CommandHelpArg";

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
    public static readonly name: string = "prefix-alias"
    public static readonly names: string[] = [this.name, "prefixalias"]
    public static readonly helpData = new CommandHelp()
    private data: PrefixAliasData


    constructor(data: MessageEventData) {
        super()
        this.data = new PrefixAliasData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()

        const { Type } = this.data.args

        try {
            let ret: string = null

            switch (Type) {
                case "user": {
                    ret = await this.HandleEntity(user)
                    break
                }

                case "server": {
                    if (!this.data.IsInGuild()) {
                        await this.data.Reply({ content: "Server prefix is only modifiable in server", ephemeral: true })
                        return CommandResponseCodes.USER_ERROR
                    }

                    const member = this.data.GetMember()
                    if (!member.permissions.any("ManageMessages", true)) {
                        await this.data.Reply({ content: "Server prefix is only modifiable by admin", ephemeral: true })
                        return CommandResponseCodes.USER_ERROR
                    }

                    const guild = await GuildFactory.GetGuild(member.guild.id)

                    if (!guild) {
                        await this.data.Reply({ content: "Failed to load server configuration.", ephemeral: true })
                        return CommandResponseCodes.ERROR
                    }

                    ret = await this.HandleEntity(guild)
                    break;
                }

                default: {
                    await this.data.Reply({ content: `Unknown type "${Type}", valid types: server, user`, ephemeral: true })
                    return CommandResponseCodes.USER_ERROR
                }
            }

            const embed = this.GetBaseEmbed()
                .setDescription(ret ?? `Successfully modified prefixes`)

            await this.data.Reply({
                embeds: [embed]
            })

            return CommandResponseCodes.OK
        } catch (error) {
            Logger.Error("PrefixAlias error:", error)
            await this.data.Reply({
                content: "Failed to modify prefixes. Please try again later.",
                ephemeral: true
            })
            throw error
        }
    }

    private async HandleEntity(entity: User | Guild) {
        const { Prefix, Clear, Remove, List } = this.data.args

        try {
            if (List) {
                if (entity.prefixes.length === 0) return "No prefix aliases found"
                return entity.prefixes.join(", ")
            }

            if (Clear) {
                entity.prefixes = []
                await entity.Save()
            }

            if (Remove) {
                if (!Prefix) {
                    throw new Error("Prefix required for remove operation")
                }
                entity.prefixes = entity.prefixes.filter(el => el !== Prefix)
                await entity.Save()
            } else if (Prefix) {
                if (entity.prefixes.includes(Prefix)) {
                    return `Prefix "${Prefix}" already exists`
                }
                entity.prefixes.push(Prefix)
                await entity.Save()
            }
        } catch (error) {
            Logger.Error("PrefixAlias HandleEntity error:", error)
            throw error
        }
    }

}

PrefixAlias.helpData
    .setCommand(PrefixAlias.name)
    .setDescription("Manage custom command prefix aliases for yourself or the server.")
    .setUsage("prefixalias [options] [prefix]")
    .setGroup(CommandGroup.Misc)
    .addArg(new CommandHelpArg()
        .setName("type")
        .setAliases(["-type", "t", "-t"])
        .setDescription("Scope: user (default) or server")
        .setUsage("type server"))
    .addArg(new CommandHelpArg()
        .setName("list")
        .setAliases(["-list"])
        .setDescription("List current prefix aliases")
        .setUsage("-list"))
    .addArg(new CommandHelpArg()
        .setName("clear")
        .setAliases(["-clear"])
        .setDescription("Clear all prefix aliases")
        .setUsage("-clear"))
    .addArg(new CommandHelpArg()
        .setName("remove")
        .setAliases(["-remove"])
        .setDescription("Remove a specific prefix alias")
        .setUsage("-remove !"))
    .addArg(new CommandHelpArg()
        .setName("prefix")
        .setDescription("Prefix alias to add (or remove with -remove)")
        .setUsage("!"))

CommandEmitterInstance.AddCommand(PrefixAlias, PrefixAlias.names)