export type MarkAllocation = {
  allowed: number;
  breakdown: Record<string, number>;
  note?: string;
};

export type ChapterGrid = {
  id: string;
  name: string;
  nameNe: string;
  questionAllocation: {
    oneMark: MarkAllocation;
    twoMark: MarkAllocation;
    threeMark: MarkAllocation;
    fourMark?: MarkAllocation;
  };
  totalChapterMarks?: number;
  areaTotalMarks?: number;
  unit?: string;
  topics?: string[];
};

export type SubjectGrid = {
  id: string;
  name: string;
  nameNe: string;
  chapters: ChapterGrid[];
};

export type ExamLevelId = "BLE" | "SEE" | "NEB";

export type CdcGrid = {
  examLevels: Record<
    ExamLevelId,
    {
      id: ExamLevelId;
      label: string;
      grade: number;
      fullName?: string;
      subjects: SubjectGrid[];
    }
  >;
};
