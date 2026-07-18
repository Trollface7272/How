import { Logger } from "./Logger";
import { CommandAbstract } from "./partials/Command";
import { MessageEventData } from "./partials/MessageEvent";

type CommandClass = (new (data: MessageEventData) => CommandAbstract) & typeof CommandAbstract

/** For each kebab-case name, also register the no-hyphen form (daily-challenge → dailychallenge). */
export function expandKebabAliases(names: string[]): string[] {
    const out = new Set<string>()
    for (const name of names) {
        if (!name)
            continue
        out.add(name)
        if (name.includes("-"))
            out.add(name.replace(/-/g, ""))
    }
    return [...out]
}

export class CommandEmitter {
    private commands: Map<string, CommandClass> = new Map<string, CommandClass>()
    constructor() {}

    public AddCommand(command: CommandClass, names: string[]) {
        const expanded = expandKebabAliases(names)
        for (const el of expanded) {
            Logger.Info(`Loading command -> ${el}`)
            this.commands.set(el, command)
        }
    }

    public GetCommand(command: string) {
        return this.commands.get(command)
    }

    public GetCommandCount(): number {
        return this.commands.size
    }

    public GetAllCommands() {
        return Array.from(this.commands.values())
    }

    /** Unique command classes (deduped across aliases). */
    public GetUniqueCommands() {
        return [...new Set(this.commands.values())]
    }
}
Logger.Info(`Creating Command Emitter`)
export const CommandEmitterInstance = new CommandEmitter()