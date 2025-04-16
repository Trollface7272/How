import { CommandGroup, CommandHelp } from "./CommandHelp";



class CommandHelpData {
    private data: Map<string, CommandHelp>
    private groups: Map<CommandGroup, Set<string>>

    public constructor() {
        this.data = new Map()
        this.groups = new Map()
        
        Object.values(CommandGroup).map((group: CommandGroup) => this.groups.set(group, new Set()))
    }

    public addHelp(help: CommandHelp) {
        this.data.set(help.command, help)
        help.aliases.forEach(alias => this.data.set(alias, help))
        this.groups.get(help.group).add(help.command)
    }

    public getHelp(command: string) {
        return this.data.get(command)
    }
}


export const CommandHelpDataInstance = new CommandHelpData()