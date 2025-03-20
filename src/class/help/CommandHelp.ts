import { EmbedBuilder } from "discord.js"
import { CommandHelpArg } from "./CommandHelpArg"

export enum CommandGroup {
    Beatmaps,
    DailyChallenge,
    Misc,
    Profile,
    Ranking,
    Scores,
    Snipe
}

export class CommandHelp {
    public command: string
    public aliases: string[]
    public description: string
    public usage: string
    public group: CommandGroup
    public args: CommandHelpArg[]
    public constructor() {
        this.args = []
    }


    public renderEmbed(embed: EmbedBuilder) {
        const argsTxt = this.args.map(arg => {
            const aliases = arg.aliases.length > 0 ? `\nAliases: ${arg.aliases.join(", ")}` : ""
            const usage = arg.usage ? `\nUsage: ${arg.usage}` : ""
            return `${arg.name} - ${arg.description}${usage}${aliases}`
        }).join("\n\n")

        const aliasesTxt = this.aliases.length > 0 ? `Aliases: \`${this.aliases.join(", ")}\`\n` : ""
        const description = `${this.description}\n` + aliasesTxt + `\`\`\`` + argsTxt + `\`\`\``

        embed.setDescription(description)
            .setAuthor({
                name: this.command.capitalize()
            })

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

}