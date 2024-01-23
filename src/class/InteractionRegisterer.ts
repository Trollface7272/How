import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { Logger } from "./Logger";



const rest = new REST().setToken(process.env.DISCORD_TOKEN);

export class InteractionRegistrer {
    private interactions: SlashCommandBuilder[] = []
    constructor() { }

    public AddInteraction(data: SlashCommandBuilder) {
        this.interactions.push(data)
    }

    public async RegisterAll() {
        try {
            Logger.Info(`Registering ${this.interactions.length} interactions`)
            const resp = await rest.put(
                Routes.applicationCommands(process.env.APPLICATION_ID),
                { body: this.interactions.map(int => int.toJSON()) }
            ) as any
            Logger.Info(`Registered ${resp.length} interactions`)
        } catch (err) {
            Logger.Error("Error registering interactions", err)
            Logger.Trace()
        }
    }
}

export const InteractionRegistrerInstance = new InteractionRegistrer() 