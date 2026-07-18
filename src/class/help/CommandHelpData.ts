import { CommandGroup, CommandGroupLabel, CommandHelp } from "./CommandHelp";
import { expandKebabAliases } from "../CommandEmitter";

type HelpCommandClass = {
    helpData?: CommandHelp | null
    name?: string
    names?: string[]
}

/** Turn a PascalCase class name into kebab-case (DailyChallengeProfile → daily-challenge-profile). */
function pascalToKebab(value: string) {
    return value
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
        .toLowerCase()
}

function isKebab(value: string) {
    return value.includes("-") && value === value.toLowerCase()
}

/**
 * Canonical help display name: prefer multi-word kebab-case when available.
 */
function resolveCanonicalName(command: HelpCommandClass, help: CommandHelp): string {
    const names = command.names ?? []
    const byLower = new Map(names.map(n => [n.toLowerCase(), n]))

    const matchName = (candidate?: string) => {
        if (!candidate)
            return undefined
        const lower = candidate.toLowerCase()
        return byLower.get(lower)
            ?? byLower.get(lower.replace(/-/g, ""))
            ?? names.find(n => n.replace(/-/g, "").toLowerCase() === lower.replace(/-/g, ""))
    }

    const kebabFor = (candidate?: string) => {
        if (!candidate)
            return undefined
        const flat = candidate.toLowerCase().replace(/-/g, "")
        return names.find(n => isKebab(n) && n.replace(/-/g, "") === flat)
    }

    // Explicit static kebab name (e.g. daily-challenge)
    if (command.name && isKebab(command.name))
        return command.name

    // Already configured as kebab
    if (help.command && isKebab(help.command))
        return matchName(help.command) ?? help.command

    // Class / configured name → kebab variant in aliases
    const fromClass = command.name || help.command
    if (fromClass) {
        const asKebab = pascalToKebab(fromClass)
        const kebab = kebabFor(asKebab) ?? matchName(asKebab)
        if (kebab && isKebab(kebab))
            return kebab
        if (kebab)
            return kebabFor(kebab) ?? kebab
    }

    // Any matching kebab for the current help.command
    const fromHelp = kebabFor(help.command) ?? matchName(help.command)
    if (fromHelp && isKebab(fromHelp))
        return fromHelp

    // Prefer any kebab alias over short/flat names
    const anyKebab = names.find(isKebab)
    if (anyKebab)
        return anyKebab

    return fromHelp
        ?? (command.name && command.name === command.name.toLowerCase() ? command.name : undefined)
        ?? names.find(n => n.length > 2)
        ?? names[0]
        ?? (help.command || "unknown").toLowerCase()
}

class CommandHelpData {
    private data: Map<string, CommandHelp> = new Map()
    private groups: Map<CommandGroup, Set<string>> = new Map()

    public constructor() {
        for (const value of Object.values(CommandGroup)) {
            if (typeof value === "number")
                this.groups.set(value, new Set())
        }
    }

    public addHelp(help: CommandHelp) {
        if (!help?.isConfigured)
            return

        const key = help.command.toLowerCase()
        this.data.set(key, help)

        for (const alias of help.aliases ?? []) {
            if (alias)
                this.data.set(alias.toLowerCase(), help)
        }

        const group = help.group ?? CommandGroup.Misc
        if (!this.groups.has(group))
            this.groups.set(group, new Set())

        this.groups.get(group)!.add(help.command)
    }

    public getHelp(command: string) {
        if (!command)
            return undefined
        return this.data.get(command.toLowerCase())
    }

    public getGroups() {
        return this.groups
    }

    /** Unique primary command names, sorted, optionally filtered by group. */
    public listCommands(group?: CommandGroup) {
        if (group !== undefined)
            return [...(this.groups.get(group) ?? [])].sort((a, b) => a.localeCompare(b))

        const names = new Set<string>()
        for (const set of this.groups.values())
            for (const name of set)
                names.add(name)
        return [...names].sort((a, b) => a.localeCompare(b))
    }

    public renderGroupIndex() {
        const lines: string[] = []
        for (const group of Object.values(CommandGroup)) {
            if (typeof group !== "number")
                continue
            const cmds = this.listCommands(group)
            if (cmds.length === 0)
                continue
            lines.push(`**${CommandGroupLabel[group]}**\n${cmds.map(c => `\`${c}\``).join(", ")}`)
        }
        return lines.join("\n\n") || "No commands registered."
    }

    /**
     * Register help from loaded command classes. Safe to call after all command
     * files have finished configuring their static `helpData` chains.
     */
    public registerFromCommands(commands: HelpCommandClass[]) {
        const seen = new Set<CommandHelp>()
        for (const command of commands) {
            const help = command.helpData
            if (!help || seen.has(help))
                continue
            seen.add(help)

            const canonical = resolveCanonicalName(command, help)
            help.setCommand(canonical)

            const aliasSource = expandKebabAliases([
                ...(command.names ?? []),
                ...(help.aliases ?? []),
                canonical,
            ])
            help.setAliases(aliasSource.filter(n => n !== canonical))

            if (help.group === undefined)
                help.setGroup(CommandGroup.Misc)

            this.addHelp(help)
        }
    }
}

export const CommandHelpDataInstance = new CommandHelpData()
