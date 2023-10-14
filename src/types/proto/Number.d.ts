declare global {
    interface Number {
        roundFixed(decimalPlaces: number): string
        roundDynamicFixed(minDigits: number, maxDigits: number): string
        asScientificNotation(): string
        asTime(): string
    }
}

export {}