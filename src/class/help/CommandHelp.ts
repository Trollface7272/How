import { EmbedBuilder } from "discord.js"
import { CommandHelpArg } from "./CommandHelpArg"

export enum CommandGroup {
    Beatmaps,
    DailyChallenge,
    Graphs,
    Misc,
    Profile,
    Ranking,
    Scores,
    Snipe
}

export const CommandGroupLabel: Record<CommandGroup, string> = {
    [CommandGroup.Beatmaps]: "Beatmaps",
    [CommandGroup.DailyChallenge]: "Daily Challenge",
    [CommandGroup.Graphs]: "Graphs",
    [CommandGroup.Misc]: "Misc",
    [CommandGroup.Profile]: "Profile",
    [CommandGroup.Ranking]: "Ranking",
    [CommandGroup.Scores]: "Scores",
    [CommandGroup.Snipe]: "Snipe",
}

export class CommandHelp {
    public command: string = ""
    public aliases: string[] = []
    public description: string = "No description provided."
    public usage: string = ""
    public group: CommandGroup = CommandGroup.Misc
    public args: CommandHelpArg[] = []
    /** When false, help is not registered (internal / button handlers). */
    public enabled: boolean = true

    public constructor() {}

    public get isConfigured() {
        return this.enabled && Boolean(this.command)
    }

    public renderEmbed(embed: EmbedBuilder) {
        const argsTxt = this.args
            .filter(arg => !arg.hidden)
            .map(arg => {
                const aliases = arg.aliases?.length ? `\nAliases: ${arg.aliases.join(", ")}` : ""
                const usage = arg.usage ? `\nUsage: ${arg.usage}` : ""
                return `${arg.name} — ${arg.description ?? ""}${usage}${aliases}`
            })
            .join("\n\n")

        const aliasList = (this.aliases ?? []).filter(a => a !== this.command)
        const aliasesTxt = aliasList.length > 0 ? `Aliases: \`${aliasList.join("`, `")}\`\n` : ""
        const usageTxt = this.usage ? `Usage: \`${this.usage}\`\n` : ""
        const groupTxt = `Group: ${CommandGroupLabel[this.group] ?? "Misc"}\n`
        const argsBlock = argsTxt ? `\`\`\`\n${argsTxt}\n\`\`\`` : ""

        embed
            .setAuthor({ name: this.command })
            .setDescription(`${this.description}\n${groupTxt}${usageTxt}${aliasesTxt}${argsBlock}`.trim())

        return embed
    }

    public setCommand(command: string) {
        this.command = command
        return this
    }

    public setAliases(aliases: string[]) {
        this.aliases = aliases
        return this
    }

    public setDescription(description: string) {
        this.description = description
        return this
    }

    public setUsage(usage: string) {
        this.usage = usage
        return this
    }

    public setArgs(args: CommandHelpArg[]) {
        this.args = args
        return this
    }

    public addArgs(...args: CommandHelpArg[]) {
        this.args.push(...args)
        return this
    }

    public addArg(arg: CommandHelpArg) {
        this.args.push(arg)
        return this
    }

    public setGroup(group: CommandGroup) {
        this.group = group
        return this
    }

    public setEnabled(enabled: boolean) {
        this.enabled = enabled
        return this
    }
}
