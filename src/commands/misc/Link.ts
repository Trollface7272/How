import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { SlashCommandBuilder } from "discord.js";

interface args {

}

const interactionData = new SlashCommandBuilder()
    .setName("link")
    .setDescription("Link your osu! account")

class LinkData extends CommandData implements CommandDataAbstract {
    constructor(data: MessageEventData) { super(data) }

    public GetComandArgs(): args {
        return {}
    }
}

class Link implements CommandAbstract {
    public static readonly names: string[] = []
    public static readonly interactionData: SlashCommandBuilder = interactionData
    private data: LinkData

    constructor(data: MessageEventData) {
        this.data = new LinkData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {

        return CommandResponseCodes.OK
    }

}


CommandEmitterInstance.AddCommand(Link, Link.names)