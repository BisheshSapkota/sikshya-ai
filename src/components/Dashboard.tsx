import gridData from "../data/cdcGrid.json";
import type { CdcGrid, ChapterGrid, ExamLevelId } from "../types/cdcGrid";

const cdc = gridData as CdcGrid;

function MarkPills({ chapter }: { chapter: ChapterGrid }) {
  const { oneMark, twoMark, threeMark, fourMark } = chapter.questionAllocation;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-800">
        1×{oneMark.allowed}
      </span>
      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-medium text-sky-800">
        2×{twoMark.allowed}
      </span>
      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-900">
        3×{threeMark.allowed}
      </span>
      {fourMark && fourMark.allowed > 0 && (
        <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-medium text-violet-800">
          4×{fourMark.allowed}
        </span>
      )}
    </div>
  );
}

type DashboardProps = {
  level: ExamLevelId;
  onLevelChange: (level: ExamLevelId) => void;
};

export default function Dashboard({ level, onLevelChange }: DashboardProps) {
  const levelData = cdc.examLevels[level];
  const subjects = levelData.subjects;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-slate-200 px-3 py-3">
        <p className="text-xs font-semibold text-slate-900">CDC mark grid</p>
        <label className="mt-2 block text-[10px] text-slate-500">Class level</label>
        <select
          value={level}
          onChange={(e) => onLevelChange(e.target.value as ExamLevelId)}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800"
        >
          <option value="BLE">BLE — Class 8</option>
          <option value="SEE">SEE — Class 10</option>
          <option value="NEB">NEB — Class 12 (+2)</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {subjects.length === 0 ? (
          <p className="text-xs text-slate-500">
            Grid for {level} coming soon. AI tutor still works for all classes.
          </p>
        ) : (
          subjects.map((subject) => (
            <section key={subject.id} className="mb-4">
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {subject.name}
              </h3>
              <ul className="mt-1.5 space-y-2">
                {subject.chapters.map((chapter) => (
                  <li
                    key={chapter.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-2"
                  >
                    <p className="text-xs font-medium text-slate-800">
                      {chapter.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {chapter.totalChapterMarks ??
                        chapter.areaTotalMarks ??
                        "—"}{" "}
                      marks
                    </p>
                    <MarkPills chapter={chapter} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
