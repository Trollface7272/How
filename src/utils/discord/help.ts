import { CommandHelpArg } from "@src/class/help/CommandHelpArg";


export const ModsArg = new CommandHelpArg()
    .setName("mods")
    .setAliases([])
    .setDescription("Mods to use")
    .setUsage("[+-]HDDT...[!]")

export const GamemodeArg = new CommandHelpArg()
    .setName("gamemode")
    .setAliases(["-gamemode", "m", "mode", "-m", "-mode"])
    .setDescription("Gamemode to use")
    .setUsage("gamemode [osu/taiko/ctb/mania]")
