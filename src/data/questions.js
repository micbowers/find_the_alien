// QUESTION BANK — auto-generated from the attribute set.
// Each question has an id, display text, and a check(alien) -> bool predicate.
// IMPORTANT: eyes and horns are stored as TOTAL counts on each alien
// (already totaled in EMBEDDED_ALIENS). No multiplication needed.

function totalEyes(a)  { return a.eyes; }
function totalHorns(a) { return a.horns; }

export function buildQuestionBank() {
  const Q = [];

  // EYES
  Q.push({ id: 'eyes_1',     text: 'Does it have exactly 1 eye?',     check: a => totalEyes(a) === 1 });
  Q.push({ id: 'eyes_2',     text: 'Does it have exactly 2 eyes?',    check: a => totalEyes(a) === 2 });
  Q.push({ id: 'eyes_3',     text: 'Does it have exactly 3 eyes?',    check: a => totalEyes(a) === 3 });
  Q.push({ id: 'eyes_4plus', text: 'Does it have 4 or more eyes?',    check: a => totalEyes(a) >= 4 });

  // HEADS
  Q.push({ id: 'heads_2', text: 'Does it have 2 heads?', check: a => a.heads === 2 });

  // HORNS
  Q.push({ id: 'horns_any',   text: 'Does it have any horns?',         check: a => totalHorns(a) >= 1 });
  Q.push({ id: 'horns_2',     text: 'Does it have exactly 2 horns?',   check: a => totalHorns(a) === 2 });
  Q.push({ id: 'horns_3plus', text: 'Does it have 3 or more horns?',   check: a => totalHorns(a) >= 3 });

  // COLOR
  Q.push({ id: 'color_teal',   text: 'Is it teal?',   check: a => a.color === 'teal' });
  Q.push({ id: 'color_orange', text: 'Is it orange?', check: a => a.color === 'orange' });
  Q.push({ id: 'color_purple', text: 'Is it purple?', check: a => a.color === 'purple' });

  // FEATURES
  Q.push({ id: 'antennae', text: 'Does it have antennae?', check: a => a.antennae });
  Q.push({ id: 'tail',     text: 'Does it have a tail?',   check: a => a.tail });
  Q.push({ id: 'stripes',  text: 'Does it have stripes?',  check: a => a.stripes });
  Q.push({ id: 'spots',    text: 'Does it have spots?',    check: a => a.spots });

  // MOUTH
  Q.push({ id: 'mouth_smile', text: 'Is it smiling?',       check: a => a.smile === true });
  Q.push({ id: 'mouth_fangs', text: 'Does it have fangs?',  check: a => a.fangs === true });

  // NAME — starts with letter (A–Z). Dead-letter questions auto-hide via the live-question filter.
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    Q.push({
      id: 'name_starts_' + letter,
      text: `Does its name start with ${letter}?`,
      check: a => a.name && a.name[0].toUpperCase() === letter,
    });
  }

  // NAME — contains letter (A–Z).
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    Q.push({
      id: 'name_contains_' + letter,
      text: `Does its name contain the letter ${letter}?`,
      check: a => a.name && a.name.toUpperCase().includes(letter),
    });
  }

  // NAME — exact length (3..8)
  for (let n = 3; n <= 8; n++) {
    Q.push({
      id: 'name_length_' + n,
      text: `Does its name have exactly ${n} letters?`,
      check: a => a.name && a.name.length === n,
    });
  }

  // NAME — length ranges
  Q.push({ id: 'name_length_short', text: 'Is its name short (3 or 4 letters)?',  check: a => a.name && a.name.length <= 4 });
  Q.push({ id: 'name_length_long',  text: 'Is its name long (5 or more letters)?', check: a => a.name && a.name.length >= 5 });

  return Q;
}

export const QUESTIONS = buildQuestionBank();
export const QUESTIONS_BY_ID = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));

export function answerForSecret(questionId, secretAlien) {
  const q = QUESTIONS_BY_ID[questionId];
  if (!q) throw new Error(`Unknown question: ${questionId}`);
  return q.check(secretAlien);
}
