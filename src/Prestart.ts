import 'module-alias/register'
import "dotenv/config"



Date.prototype.toDiscordToolTip = function (): string {
    return `<t:${Math.floor(this.getTime() / 1000)}:R>`
}

Number.prototype.roundFixed = function (this: number, decimalPlaces: number): string {
    const multiplier = Math.pow(10, decimalPlaces)
    return (Math.round(this * multiplier) / multiplier).toFixed(decimalPlaces)
}

const lookup = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "k" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "B" },
    { value: 1e12, symbol: "T" },
    { value: 1e15, symbol: "P" },
    { value: 1e18, symbol: "E" }
].reverse()

const rx = /\.0+$|(\.[0-9]*[1-9])0+$/

Number.prototype.asScientificNotation = function (this: number): string {
    const item = lookup.find((item) => {
        return this >= item.value
    })
    return item ? (this / item.value).toLocaleString(undefined, { maximumFractionDigits: 2 }).replace(rx, "$1") + item.symbol : "0"
}

Number.prototype.asTime = function (this: number): string {
    let minutes = Math.floor(this / 60)
    let seconds = this % 60
    if (seconds < 10) return `${minutes}:0${seconds}`
    return `${minutes}:${seconds}`
}

Number.prototype.roundDynamicFixed = function (this: number, minDigits: number, maxDigits: number): string {
    const digits = Math.min(maxDigits, Math.max(minDigits, parseFloat(this.toPrecision(5)).toString().split(".")[1]?.length ?? 0))
    return this.roundFixed(digits)
}

String.prototype.isNumber = function (this: string): boolean {
    return /^\d+$/.test(this)
}