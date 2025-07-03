

export class CommandHelpArg {
    public name: string
    public aliases: string[]
    public description: string
    public usage: string
    public hidden: boolean = false

    public constructor() { }


    public setName(name: string) {
        this.name = name
        return this
    }

    public setAliases(aliases: string[]) {
        this.aliases = aliases
        return this
    }

    public setDescription(desc: string) {
        this.description = desc
        return this
    }

    public setUsage(usage: string) {
        this.usage = usage
        return this
    }

    public setHidden(hidden: boolean) {
        this.hidden = hidden
        return this
    }
}