import type { ArmorGrade } from '../combat/types';

export const ARMOR_K = 100;

export class ArmorSystem {
  static getReduction(armor: number): number {
    const safeArmor = Math.max(0, armor);
    return safeArmor / (safeArmor + ARMOR_K);
  }

  static getEffectiveArmor(armor: number, penetration: number): number {
    return Math.max(0, armor - Math.max(0, penetration));
  }

  static getGradeLabel(grade: ArmorGrade): string {
    switch (grade) {
      case 'LIGHT': return 'Light';
      case 'MEDIUM': return 'Medium';
      case 'HEAVY': return 'Heavy';
      case 'UNARMORED':
      default: return 'Unarmored';
    }
  }
}
