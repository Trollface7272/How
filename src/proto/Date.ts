Date.prototype.toDiscordToolTip = function (): string {
    return `<t:${Math.floor(this.getTime() / 1000)}:R>`
}