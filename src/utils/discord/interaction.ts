import { InteractionContextType, SlashCommandStringOption } from "discord.js";

export const getGamemodeStringOption = (opt: SlashCommandStringOption) => opt
    .setName("gamemode")
    .setDescription("Beatmap gamemode")
    .setRequired(false)
    .addChoices({
        name: "Standart",
        value: "osu"
    }, {
        name: "Catch The Beat",
        value: "ctb"
    }, {
        name: "Taiko",
        value: "taiko"
    }, {
        name: "Mania",
        value: "mania"
    })


export const CONTEXT_FULL = [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel ]