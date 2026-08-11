export class RunState {
  private levelValue = 1;
  private xpValue = 0;
  private creditsValue = 0;
  private pendingUpgradesValue = 0;
  private rerollChargesValue = 0;

  get level(): number { return this.levelValue; }
  get xp(): number { return this.xpValue; }
  get credits(): number { return this.creditsValue; }
  get pendingUpgrades(): number { return this.pendingUpgradesValue; }
  get rerollCharges(): number { return this.rerollChargesValue; }

  get xpToNextLevel(): number {
    return 45 + 15 * (this.levelValue - 1);
  }

  addRewards(xp: number, credits: number): void {
    this.creditsValue += Math.max(0, Math.floor(credits));
    this.addXp(xp);
  }

  addCredits(amount: number): void {
    this.creditsValue += Math.max(0, Math.floor(amount));
  }

  spendCredits(amount: number): boolean {
    const cost = Math.max(0, Math.floor(amount));
    if (this.creditsValue < cost) return false;
    this.creditsValue -= cost;
    return true;
  }

  addRerollCharges(amount = 1): void {
    this.rerollChargesValue += Math.max(0, Math.floor(amount));
  }

  spendRerollCharge(): boolean {
    if (this.rerollChargesValue <= 0) return false;
    this.rerollChargesValue -= 1;
    return true;
  }

  consumePendingUpgrade(): void {
    if (this.pendingUpgradesValue > 0) this.pendingUpgradesValue -= 1;
  }

  getSkipReward(): number {
    return 25 + 5 * Math.max(0, this.levelValue - 2);
  }

  private addXp(amount: number): void {
    this.xpValue += Math.max(0, Math.floor(amount));

    while (this.xpValue >= this.xpToNextLevel) {
      this.xpValue -= this.xpToNextLevel;
      this.levelValue += 1;
      this.pendingUpgradesValue += 1;
    }
  }
}
