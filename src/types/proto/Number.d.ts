declare global {
    interface Number {
        roundFixed(decimalPlaces: number): string
        asScientificNotation(): string
    }
}

export {}