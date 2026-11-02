// Circula post-use questionnaire (Likert 1–5), copied from v1 sus-results-chart.js.
// Rows = participants (n = 10). Columns = 8 SUS items + 1 follow-up question, in survey order.
export const responses = [
  [4, 2, 4, 2, 2, 3, 2, 4, 4],
  [4, 1, 5, 1, 1, 5, 3, 4, 5],
  [4, 1, 4, 2, 1, 5, 1, 4, 4],
  [4, 1, 4, 3, 1, 5, 1, 4, 4],
  [4, 2, 3, 3, 1, 4, 2, 3, 5],
  [5, 2, 4, 2, 1, 5, 1, 5, 5],
  [4, 3, 4, 1, 1, 4, 3, 4, 4],
  [4, 1, 4, 1, 1, 4, 1, 4, 4],
  [5, 5, 5, 1, 1, 4, 1, 5, 5],
  [5, 1, 5, 1, 1, 5, 1, 5, 5],
];

// ✳ = reverse-scored SUS item (negative statement)
export const labels = [
  { en: 'Would use frequently', ja: '頻繁に使いたい' },
  { en: 'Unnecessarily complex ✳', ja: '不必要に複雑 ✳' },
  { en: 'Easy to use', ja: '使いやすい' },
  { en: 'Need tech support ✳', ja: '技術サポートが必要 ✳' },
  { en: 'Too inconsistent ✳', ja: '一貫性に欠ける ✳' },
  { en: 'Learn to use quickly', ja: 'すぐに慣れる' },
  { en: 'Inconvenience ✳', ja: '不便 ✳' },
  { en: 'Felt confident', ja: '自信を持って使えた' },
  { en: 'Useful features', ja: '役に立つ機能' },
];

export const means = labels.map((_, j) => Math.round((responses.reduce((sum, row) => sum + row[j], 0) / responses.length) * 100) / 100);
