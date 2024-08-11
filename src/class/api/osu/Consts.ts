import { Gamemode } from "./types/MiscTypes"

export const GamemodeNames = {
    osu: "Standard",
    0: "Standard",
    taiko: "Taiko",
    1: "Taiko",
    fruits: "Catch the Beat",
    2: "Catch the Beat",
    mania: "Mania",
    3: "Mania"
}

export const GamemodeNumToStr = {
    0: "osu" as Gamemode,
    1: "taiko" as Gamemode,
    2: "fruits" as Gamemode,
    3: "mania" as Gamemode
}

export const GamemodeStrToNum = {
    osu: 0,
    taiko: 1,
    fruits: 2,
    mania: 3
}