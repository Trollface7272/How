declare global {
    interface Number {
        round(decimalPlaces: number): number
        roundFixed(decimalPlaces: number): string
        roundDynamicFixed(minDigits: number, maxDigits: number): string
        asScientificNotation(): string
        asTime(): string
    }
}

export {}