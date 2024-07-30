export type Gamemode = "osu" | "taiko" | "fruits" | "mania"
export type RulesetIds = 0 | 1 | 2 | 3
export type _ParsedMods = {
    mods: string[], exact: boolean
}

export type ParsedMods = {
    include: _ParsedMods,
    exclude: _ParsedMods,
    exactInclude: _ParsedMods,
    exactExclude: _ParsedMods
}