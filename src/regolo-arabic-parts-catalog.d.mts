export interface RegoloArabicPartDefinition {
  readonly id: string;
  readonly group: 'ESSENTIALS' | `ABU_MASHAR_${number}`;
  readonly nameIt: string;
  readonly sourceLine: number;
  readonly formulaDay: string;
  readonly formulaNight: string;
  readonly notes: readonly string[];
}
export declare const REGOLO_ARABIC_PARTS_CATALOG: readonly Readonly<RegoloArabicPartDefinition>[];
