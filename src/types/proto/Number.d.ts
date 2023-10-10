declare global {
    interface Number {
        roundFixed(decimalPlaces: number): string
        asScientificNotation(): string
        asTime(): string
    }
}

export {}