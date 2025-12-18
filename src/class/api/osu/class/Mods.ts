
const difficulty_mods = [
    "EZ", "HT", "DC", "TD",
    "HR", "DT", "NC", "FL",
    "RX", "TP", "CL", "HD",
    "RD", "WU", "WD",
    "4K", "5K", "6K", "7K",
    "8K", "FI", "RD", "1K",
    "2K", "3K", "9K", "V2",
]

export namespace Mods {

    export enum ModAcronyms {
        DoubleTime = "DT",
        Hidden = "HD",
        HardRock = "HR",
        Easy = "EZ",
        HalfTime = "HT",
        Nightcore = "NC",
        Flashlight = "FL",
        Perfect = "PF",
        Relax = "RX",
        AutoPilot = "AP",
        SuddenDeath = "SD",
        SpunOut = "SO",
        Auto = "AU",
        Cinema = "CN",
        Target = "TP",
        KeyCoop = "KC",
        Mirror = "MR",
        Random = "RD",
        FourKey = "4K",
        FiveKey = "5K",
        SixKey = "6K",
        SevenKey = "7K",
        EightKey = "8K",
        NineKey = "9K",
        OneKey = "1K",
        TwoKey = "2K",
        ThreeKey = "3K",
        Classic = "CL",
        ScoreV2 = "V2",
        Blinds = "BL",
        DayCore = "DC",
        StrictTracking = "ST",
        AccuracyChange = "AC",
        DifficultyAdjust = "DA",
        Alternate = "AL",
        Singletap = "ST",
        Transform = "TF",
        NoFail = "NF",
        Wiggle = "WG",
        SpinIt = "SI",
        Grow = "GR",
        Deflate = "DF",
        WindUp = "WU",
        WindDown = "WD",
        Traceble = "TC",
        BarrelRoll = "BR",
        ApproachDifferent = "AD",
        Muted = "MU",
        NoScope = "NS",
        Magnetised = "MG",
        Repel = "RP",
        AdaptiveSpeed = "AS",
        FreezeFrame = "FF",
        Bubbles = "BB",
        Synesthesia = "SY",
        Depth = "DP",
    }

    export enum DefaultSpeedChange {
        DT = 1.5,
        HT = 0.75,
        NC = 1.5,
        DC = 0.75

    }
    export class BaseMod {
        acronym: string
        public settings?: { [key: string]: string | number | boolean }

        constructor(mod: string | BaseMod, settings?: { [key: string]: string | number | boolean }) {
            if (typeof mod == "string") {
                this.acronym = mod
                this.settings = settings
            } else {
                Object.assign(this, mod)
            }
            if (this.isSpeedChange() && !this.settings) this.settings = { speed_change: DefaultSpeedChange[this.acronym] ?? 1 }
        }

        public isSpeedChange() {
            return this.acronym == ModAcronyms.DoubleTime || this.acronym == ModAcronyms.HalfTime || this.acronym == ModAcronyms.Nightcore || this.acronym == ModAcronyms.DayCore
        }

        public isDefaultSpeedChange() {
            return !this.settings?.speed_change || (this.settings?.speed_change == DefaultSpeedChange[this.acronym])
        }
    }


    export class DifficultyAdjust extends BaseMod {
        declare settings: {
            circle_size?: number
            drain_rate?: number
            approach_rate?: number
            overall_difficulty?: number
        }
        constructor(mod: ModAcronyms.DifficultyAdjust | BaseMod, settings?: { [key: string]: string | number | boolean }) {
            super(mod, settings)
            if (!this.settings) this.settings = {}
        }

        public IsDifficulty() {
            return ((this.settings.circle_size != null) || (this.settings.overall_difficulty != null))
        }

        public GetDifficultyVariant() {
            return new DifficultyAdjust(ModAcronyms.DifficultyAdjust, { circle_size: this.settings.circle_size, overall_difficulty: this.settings.overall_difficulty })
        }
    }

    export class Classic extends BaseMod {
        public static defaultSettings = {
            classic_health: true,
            classic_note_lock: true,
            fade_hit_circle_early: true,
            always_play_tail_sample: true,
            no_slider_head_accuracy: true
        }
        public static flags = {
            classic_health: "classic_health",
            classic_note_lock: "classic_note_lock",
            fade_hit_circle_early: "fade_hit_circle_early",
            always_play_tail_sample: "always_play_tail_sample",
            no_slider_head_accuracy: "no_slider_head_accuracy",
        }

        declare public settings: {
            classic_health: boolean
            classic_note_lock: boolean
            fade_hit_circle_early: boolean
            always_play_tail_sample: boolean
            no_slider_head_accuracy: boolean
        }
        constructor(mod: string | BaseMod, settings: { [key: string]: string | number | boolean } = {}) {
            super(mod, settings)
            this.settings = {
                classic_health: Boolean(settings.classic_health ?? Classic.defaultSettings.classic_health),
                classic_note_lock: Boolean(settings.classic_note_lock ?? Classic.defaultSettings.classic_note_lock),
                fade_hit_circle_early: Boolean(settings.fade_hit_circle_early ?? Classic.defaultSettings.fade_hit_circle_early),
                always_play_tail_sample: Boolean(settings.always_play_tail_sample ?? Classic.defaultSettings.always_play_tail_sample),
                no_slider_head_accuracy: Boolean(settings.no_slider_head_accuracy ?? Classic.defaultSettings.no_slider_head_accuracy)
            }
        }
    }

    export class SpeedAdjustMod extends BaseMod {

    }

    export class Hidden extends BaseMod {
        public static defaultSettings = {
            only_fade_approach_circles: false,
        }
        public static flags = {
            only_fade_approach_circles: "only_fade_approach_circles",
        }
        declare public settings: {
            only_fade_approach_circles: boolean
        }
        constructor(mod: string | BaseMod, settings?: { [key: string]: string | number | boolean }) {
            super(mod, settings)
            this.settings = {
                only_fade_approach_circles: Boolean(settings?.only_fade_approach_circles ?? Hidden.defaultSettings.only_fade_approach_circles),
            }
        }
    }

    export class Traceble extends BaseMod {
        constructor(mod: string | BaseMod, settings?: { [key: string]: string | number | boolean }) {
            super(mod, settings)
        }
    }
    //TODO: more mod defs
    const modMap = {
        [ModAcronyms.Classic]: Classic,
        [ModAcronyms.DifficultyAdjust]: DifficultyAdjust,
        [ModAcronyms.Hidden]: Hidden,
        // [ModAcronyms.DoubleTime]: SpeedAdjustMod,
        // [ModAcronyms.Nightcore]: SpeedAdjustMod,
        // [ModAcronyms.HalfTime]: SpeedAdjustMod,
        // [ModAcronyms.DayCore]: SpeedAdjustMod,
    }

    export class ModList {
        private mods: BaseMod[]
        constructor(mods?: string[] | BaseMod[] | ModList) {
            if (mods instanceof ModList) {
                Object.assign(this, mods)
                return
            }
            this.CreateMods(mods || [])
        }

        private CreateMods(mods: string[] | BaseMod[]) {
            this.mods = mods?.map((mod: string | BaseMod) => {
                const strMod = typeof mod === "string" ? mod : mod.acronym
                if (modMap[strMod]) return new modMap[strMod](mod)
                return new BaseMod(mod)
            }) || []

        }

        public get Mods() {
            return this.mods
        }

        public get Formatted() {
            if (this.mods.length == 0) return "No Mod"
            const mods = this.mods.map(mod => {
                if (mod.isSpeedChange() && !mod.isDefaultSpeedChange()) return `${mod.acronym}(${mod.settings.speed_change}x)`
                return mod.acronym
            }).join("")
            return mods
        }

        public Has(mod: string, flag?: string): boolean {
            const hasMod = this.mods.find(m => m.acronym == mod)

            if (!flag || !hasMod) return hasMod !== undefined
            return !!hasMod.settings[flag]
        }

        public HasAny(mods: ModAcronyms[]): boolean {
            return mods.some(mod => this.Has(mod))
        }

        public GetSpeedChange(): number {
            return this.mods.find(mod => mod.isSpeedChange())?.settings?.speed_change as number ?? 1
        }

        public GetData() {
            return this.mods
        }

        public GetDifficultyMods() {
            const mods = this.mods.filter(mod => difficulty_mods.includes(mod.acronym))
            if (this.Has(ModAcronyms.Flashlight) && this.Has(ModAcronyms.Hidden)) {
                mods.push(this.mods.find(mod => mod.acronym == ModAcronyms.Hidden))
            }
            if (this.Has(ModAcronyms.DifficultyAdjust)) {
                const mod = this.mods.find(mod => mod.acronym == ModAcronyms.DifficultyAdjust)
                const difficultyMod = new Mods.DifficultyAdjust(ModAcronyms.DifficultyAdjust, { circle_size: mod.settings.circle_size })
                if (difficultyMod.IsDifficulty()) mods.push(difficultyMod.GetDifficultyVariant())
            }
            return mods
        }
    }

}
