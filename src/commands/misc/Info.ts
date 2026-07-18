import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { version } from "discord.js";
import { totalmem } from "os";
import { CommandBase } from "@src/class/base/Command";
import { CommandGroup, CommandHelp } from "@src/class/help/CommandHelp";


interface args {

}

class InfoData extends CommandData implements CommandDataAbstract {
    constructor(data: MessageEventData) { super(data) }

    public GetComandArgs(): args {
        return {}
    }
}

class Info extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["info"]
    public static readonly helpData = new CommandHelp()
    private data: InfoData

    constructor(data: MessageEventData) {
        super()
        this.data = new InfoData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const client = this.data.GetClient()
        const user = this.data.GetUser()
        const embed = this.GetBaseEmbed()
            .addFields({ name: "Build", value: process.env.NODE_ENV == "development" ? "Development" : "Production", inline: true },
                { name: "Uptime", value: `${new Date(Date.now() - (process.uptime() * 1000)).toDiscordToolTip()}`, inline: true },
                { name: "Memory Usage", value: `${(process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2)}/${(totalmem() / (1024 * 1024)).toFixed(0)} MB`, inline: true },
                { name: "Guilds", value: client.guilds.cache.size.toString(), inline: true },
                { name: "Users", value: client.users.cache.size.toString(), inline: true },
                { name: "Channels", value: client.channels.cache.size.toString(), inline: true },
                { name: "Commands", value: CommandEmitterInstance.GetCommandCount().toString(), inline: true },
                { name: "Discord.js Version", value: `v${version}`, inline: true },
                { name: "Node.js Version", value: `${process.version}`, inline: true })
            .setFooter({ text: `Requested by ${user.Username}`, iconURL: user.AvatarUrl })
            .setColor(this.data.GetEmbedColor())

        this.data.Reply({ embeds: [embed] })

        return CommandResponseCodes.OK
    }

}

CommandEmitterInstance.AddCommand(Info, Info.names)

Info.helpData
    .setCommand(Info.name)
    .setGroup(CommandGroup.Misc)
    .setDescription("Display bot information.")
    .setUsage("info")
    .setAliases(Info.names);