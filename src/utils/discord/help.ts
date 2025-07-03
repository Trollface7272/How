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

export const UsernameArg = new CommandHelpArg()
    .setName("username")
    .setDescription("The username of the osu! user")
    .setUsage("peppy")

export const PageArg = new CommandHelpArg()
    .setName("page")
    .setDescription("The page number")
    .setUsage("1")
    .setHidden(true)

export const FriendsArg = new CommandHelpArg()
    .setName("friends")
    .setDescription("Allow the bot to read your friends list (not required for friends leaderboards)")
    .setUsage("-friends")