import { InteractionContextType, SlashCommandBooleanOption, SlashCommandNumberOption, SlashCommandStringOption } from "discord.js";

export const GamemodeStringOption = (opt: SlashCommandStringOption) => opt
    .setName("gamemode")
    .setDescription("Gamemode to use")
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

export const UsernameStringOption = (opt: SlashCommandStringOption) => opt
    .setName("username")
    .setDescription("Username to get data for")
    .setRequired(false)

export const PageNumberOption = (opt: SlashCommandNumberOption) => opt
    .setName("page")
    .setDescription("Page to get")
    .setRequired(false)
    .setMinValue(1)

export const BeatmapStringOption = (opt: SlashCommandStringOption) => opt
    .setName("beatmap")
    .setDescription("Beatmap url or id")
    .setRequired(false)

export const ModsStringOption = (opt: SlashCommandStringOption) => opt
    .setName("mods")
    .setDescription("Beatmap mods")
    .setRequired(false)

export const ListBooleanOption = (opt: SlashCommandBooleanOption) => opt
    .setName("list")
    .setDescription("Get list of 5 scores")
    .setRequired(false)

export const ReversedBooleanOption = (opt: SlashCommandBooleanOption) => opt
    .setName("reversed")
    .setDescription("Reverses filtered scores order")
    .setRequired(false)

export const RandomBooleanOption = (opt: SlashCommandBooleanOption) => opt
    .setName("random")
    .setDescription("Get random filtered score")
    .setRequired(false)

export const IndexNumberOption = (opt: SlashCommandNumberOption) => opt
    .setName("index")
    .setDescription("index of score to get")
    .setRequired(false)

export const CountryStringOption = (opt: SlashCommandStringOption) => opt
    .setName("country")
    .setDescription("2 letter country code")
    .setRequired(false)
    .setMinLength(2)
    .setMaxLength(2)


export const CONTEXT_FULL = [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel]