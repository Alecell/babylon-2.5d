export class Friction {
    value: number;
    weight: number;

    constructor(value: number, weight: number = 0.5) {
        if (value < 0 || value > 1) {
            throw new Error("Friction value must be between 0 and 1");
        }
        this.value = value;
        this.weight = weight;
    }

    static calculateNormalizedWeightedAverage(frictions: Friction[]) {
        let sumOfProducts = 0;
        let sumOfWeights = 0;

        frictions.forEach((friction) => {
            sumOfProducts += friction.value * friction.weight;
            sumOfWeights += friction.weight;
        });

        return sumOfWeights === 0 ? 0 : sumOfProducts / sumOfWeights;
    }
}
