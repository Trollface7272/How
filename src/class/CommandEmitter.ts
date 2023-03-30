import { Client } from "./Client";
import { Command } from "./abstract/Command";

export class CommandEmitter {
    private commands: Map<string, Command> = new Map<string, Command>()
    constructor() {}

    public AddCommand(command: Command) {
        command.names.map(el => this.commands.set(el, command))
    }

    public GetCommand(command: string) {
        return this.commands.get(command)
    }
}

export const CommandEmitterInstance = new CommandEmitter()