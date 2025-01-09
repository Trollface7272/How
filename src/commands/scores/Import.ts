import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { importScores } from "@src/sockets/Importer";
import { SlashCommandBuilder } from "discord.js";

interface args {
    Username: string
}

class ImportData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {
            Username: this.data.GetRemaining()
        }
    }
}

class Import extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["import"]
    private data: ImportData


    constructor(data: MessageEventData) {
        super()
        this.data = new ImportData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const { Username: username } = this.data.args
        const user = this.data.GetUser()

        const Username = username || user.osu.username

        const msg = await this.data.Reply({content: `Importing Scores...`})

        const resp = await importScores(Username, user.admin)

        const embed = this.GetBaseEmbed()
            .setDescription(resp as string)
        
        if (msg) msg.edit({embeds: [embed], content: ""})


        return CommandResponseCodes.OK
    }

}

CommandEmitterInstance.AddCommand(Import, Import.names)