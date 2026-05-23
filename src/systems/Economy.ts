// Spillerens mønter.
export class Economy {
  coins = 0;
  totalEarned = 0;

  add(n: number): void {
    this.coins += n;
    this.totalEarned += n;
  }

  canAfford(n: number): boolean {
    return this.coins >= n;
  }

  /** Træk beløb hvis muligt. Returnerer true ved succes. */
  spend(n: number): boolean {
    if (this.coins < n) return false;
    this.coins -= n;
    return true;
  }

  reset(): void {
    this.coins = 0;
    this.totalEarned = 0;
  }
}
