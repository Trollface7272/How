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

export type Dictionary<T> = {
    [key: string]: T
}

export enum RankingType {
    charts = "charts",
    country = "country",
    performance = "performance",
    score = "score"
}