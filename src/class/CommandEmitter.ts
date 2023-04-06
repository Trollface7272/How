import { Client } from "./Client";
import { CommandAbstract } from "./partials/Command";
import { MessageEventData } from "./partials/MessageEvent";

type CommandClass = new (data: MessageEventData) => CommandAbstract

export class CommandEmitter {
    private commands: Map<string, CommandClass> = new Map<string, CommandClass>()
    constructor() {}

    public AddCommand(command: CommandClass, names: string[]) {
        names.map(el => this.commands.set(el, command))
    }

    public GetCommand(command: string) {
        return this.commands.get(command)
    }

    public GetCommandCount(): number {
        return this.commands.size
    }
}

export const CommandEmitterInstance = new CommandEmitter()