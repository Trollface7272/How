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

export const BitModsShort = {
    NF: 1, EZ: 2, TD: 4, HD: 8,
    HR: 16, SD: 32, DT: 64, RX: 128,
    HT: 256, NC: 512, FL: 1024, AU: 2048,
    SO: 4096, AP: 8192, PF: 16384, "4K": 32768,
    "5K": 65536, "6K": 131072, "7K": 262144, "8K": 524288,
    FI: 1048576, RD: 2097152, CN: 4194304, TP: 8388608,
    "9K": 16777216, KC: 33554432, "1K": 67108864, "3K": 134217728,
    "2K": 268435456, "V2": 536870912, MR: 1073741824
}

export const BitMods = {
    None: 0, NoFail: 1, Easy: 2, TouchDevice: 4, Hidden: 8, HardRock: 16, 
    SuddenDeath: 32, DoubleTime: 64, Relax: 128, HalfTime: 256, Nightcore: 512, 
    Flashlight: 1024, Autoplay: 2048, SpunOut: 4096, Relax2: 8192, Perfect: 16384, 
    Key4: 32768, Key5: 65536, Key6: 131072, Key7: 262144, Key8: 524288, FadeIn: 1048576, 
    Random: 2097152, Cinema: 4194304, Target: 8388608, Key9: 16777216, KeyCoop: 33554432, 
    Key1: 67108864, Key3: 134217728, Key2: 268435456, ScoreV2: 536870912, Mirror: 1073741824
}