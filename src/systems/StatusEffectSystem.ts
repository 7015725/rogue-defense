import type { StatusApplication, StatusSnapshot, StatusType } from '../combat/types';

interface ActiveStatus extends StatusSnapshot {
  tickAccumulatorMs: number;
}

const HARD_CONTROL_TYPES = new Set<StatusType>(['STUN', 'FREEZE']);

export class StatusEffectSystem {
  private readonly active = new Map<StatusType, ActiveStatus>();
  private controlResistance = 0;

  constructor(
    private readonly isBoss: boolean,
    private readonly onDotDamage: (amount: number) => void,
  ) {}

  update(deltaMs: number): void {
    if (this.isBoss) {
      this.controlResistance = Math.max(0, this.controlResistance - 0.00005 * deltaMs);
    }

    for (const [type, status] of this.active) {
      status.remainingMs = Math.max(0, status.remainingMs - deltaMs);

      if (type === 'BURN' && status.tickIntervalMs > 0) {
        status.tickAccumulatorMs += deltaMs;
        while (status.tickAccumulatorMs >= status.tickIntervalMs && status.remainingMs > 0) {
          status.tickAccumulatorMs -= status.tickIntervalMs;
          this.onDotDamage(Math.max(0, status.magnitude) * Math.max(1, status.stacks));
        }
      }

      if (status.remainingMs <= 0) this.active.delete(type);
    }
  }

  apply(application: StatusApplication): void {
    const durationMs = this.getAdjustedDuration(application.type, Math.max(0, application.durationMs));
    if (durationMs <= 0) return;

    if (application.type === 'SLOW') {
      this.applySlow(application, durationMs);
      return;
    }

    const existing = this.active.get(application.type);
    const incomingMagnitude = Math.max(0, application.magnitude ?? 0);
    const incomingStacks = Math.max(1, application.stacks ?? 1);
    const maxStacks = Math.max(1, application.maxStacks ?? 1);
    const tickIntervalMs = Math.max(0, application.tickIntervalMs ?? 0);

    if (application.type === 'BURN') {
      if (existing) {
        existing.remainingMs = Math.max(existing.remainingMs, durationMs);
        existing.magnitude = Math.max(existing.magnitude, incomingMagnitude);
        existing.stacks = Math.min(maxStacks, existing.stacks + incomingStacks);
        existing.tickIntervalMs = tickIntervalMs || existing.tickIntervalMs;
      } else {
        this.active.set(application.type, {
          type: application.type,
          remainingMs: durationMs,
          magnitude: incomingMagnitude,
          stacks: Math.min(maxStacks, incomingStacks),
          tickIntervalMs,
          tickAccumulatorMs: 0,
        });
      }
      return;
    }

    if (existing) {
      existing.remainingMs = Math.max(existing.remainingMs, durationMs);
      existing.magnitude = Math.max(existing.magnitude, incomingMagnitude);
      existing.stacks = Math.max(existing.stacks, incomingStacks);
      existing.tickIntervalMs = Math.max(existing.tickIntervalMs, tickIntervalMs);
    } else {
      this.active.set(application.type, {
        type: application.type,
        remainingMs: durationMs,
        magnitude: incomingMagnitude,
        stacks: incomingStacks,
        tickIntervalMs,
        tickAccumulatorMs: 0,
      });
    }
  }

  has(type: StatusType): boolean {
    return this.active.has(type);
  }

  get(type: StatusType): StatusSnapshot | null {
    const status = this.active.get(type);
    if (!status) return null;
    return {
      type: status.type,
      remainingMs: status.remainingMs,
      magnitude: status.magnitude,
      stacks: status.stacks,
      tickIntervalMs: status.tickIntervalMs,
    };
  }

  consumeStacks(type: StatusType, count: number): number {
    const status = this.active.get(type);
    if (!status || count <= 0) return 0;
    const consumed = Math.min(status.stacks, count);
    status.stacks -= consumed;
    if (status.stacks <= 0) this.active.delete(type);
    return consumed;
  }

  get hardControlled(): boolean {
    return this.has('STUN') || this.has('FREEZE');
  }

  get movementBlocked(): boolean {
    return this.hardControlled;
  }

  get moveSpeedMultiplier(): number {
    const slow = this.active.get('SLOW')?.magnitude ?? 0;
    return Math.max(0.25, 1 - slow);
  }

  get attackSpeedMultiplier(): number {
    const suppressed = this.active.get('SUPPRESSED')?.magnitude ?? 0;
    return Math.max(0.2, 1 - suppressed);
  }

  get armorBreakAmount(): number {
    return Math.max(0, this.active.get('ARMOR_BREAK')?.magnitude ?? 0);
  }

  get label(): string {
    const parts: string[] = [];
    const burn = this.active.get('BURN');
    if (burn) parts.push(`BURN×${burn.stacks}`);
    if (this.has('SLOW')) parts.push('SLOW');
    if (this.has('FREEZE')) parts.push('FREEZE');
    if (this.has('STUN')) parts.push('STUN');
    if (this.has('ARMOR_BREAK')) parts.push('BREAK');
    if (this.has('CHARGED')) parts.push('CHARGED');
    if (this.has('SUPPRESSED')) parts.push('SMOKE');
    return parts.join(' · ');
  }

  private applySlow(application: StatusApplication, durationMs: number): void {
    const incoming = Math.max(0, application.magnitude ?? 0);
    const existing = this.active.get('SLOW');
    const magnitude = Math.min(0.75, (existing?.magnitude ?? 0) + incoming);

    if (magnitude >= 0.65) {
      this.active.delete('SLOW');
      this.apply({ type: 'FREEZE', durationMs: 1000, sourceWeaponId: application.sourceWeaponId });
      return;
    }

    if (existing) {
      existing.remainingMs = Math.max(existing.remainingMs, durationMs);
      existing.magnitude = magnitude;
    } else {
      this.active.set('SLOW', {
        type: 'SLOW',
        remainingMs: durationMs,
        magnitude,
        stacks: 1,
        tickIntervalMs: 0,
        tickAccumulatorMs: 0,
      });
    }
  }

  private getAdjustedDuration(type: StatusType, durationMs: number): number {
    if (!this.isBoss || !HARD_CONTROL_TYPES.has(type)) return durationMs;

    const factor = Math.max(0.25, 1 - this.controlResistance);
    const adjusted = durationMs * factor;
    this.controlResistance = Math.min(0.75, this.controlResistance + 0.15);
    return adjusted;
  }
}
