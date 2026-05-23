/** Lightweight offline tutor until a real LLM API is connected. */
export function mockTutorReply(input: string): string {
  const text = input.toLowerCase();

  if (
    text.includes("halnu") ||
    text.includes("solve") ||
    text.includes("question")
  ) {
    return `Thik cha, yo question herau.

Score out of X: — (answer pathaunu paryo grade garna)

Strengths:
- Question identify gareko — ramro start

Weaknesses:
- Full working chainya — step-by-step likh

Model Answer:
1) Given data list gara
2) Formula choose gara (CDC mark anusar)
3) Substitute + unit lekh
4) Final answer underline gara

Arko message ma question copy-paste gara — Roman Nepali ma pani huncha. Example: "Sir math ko trigonometry ko height distance solve garidinu."`;
  }

  if (text.includes("force") || text.includes("bal")) {
    return `Force chapter ko CDC grid anusar:
- 1-mark: 4 questions allowed (2 MCQ + 2 very short)
- 2-mark: 2 short answers
- 4-mark: 1 long answer (3-mark slot yo chapter ma 0)

1-mark ma definition short: "Force is push or pull that changes motion (SI unit: newton)."

2-mark ma example: Friction opposing motion — bus brake ma friction le stop garcha.

Kun question type practice garne? Roman Nepali ma sodha.`;
  }

  if (text.includes("trigonometry") || text.includes("trig")) {
    return `Trigonometry area — total 4 marks, 1 integrative question:
- 1-mark (Knowledge): 1 allowed
- 2-mark (Understanding): 1 allowed
- 3-mark (Application): 1 allowed
- Higher ability: +1 mark (not 4-mark long)

Height-distance ma:
1) Right triangle draw
2) Ratio (tan/sin) choose
3) Substitute + answer with unit

"Sir 30 degree angle, height 10m" jasto numerical patha — full model answer dinchu.`;
  }

  if (text.includes("classification") || text.includes("periodic")) {
    return `Classification of Elements — chapter marks ~8:
- 1-mark: 3 allowed (1 MCQ + 2 VSA)
- 2-mark: 2 short answers
- 3-mark: 1 application sub-part
- 4-mark long: 0

Modern periodic law 1-mark: "Properties of elements are periodic function of atomic number."

3-mark application: Group 1 valency 1 — explain with one example (Na).

Answer check garna cha bhane patha — evaluation format ma dinchu.`;
  }

  return `Namaste! Ma Sikshya AI — SEE/BLE/NEB prep ko lagi yaha chu.

Roman Nepali ma sodha, e.g.:
- "Sir math ko question halnu"
- "Science force ko 2 mark answer"
- "Trigonometry ko grid kati mark?"

Answer check garda yo format dinchu:
Score out of X | Strengths | Weaknesses | Model Answer`;
}
