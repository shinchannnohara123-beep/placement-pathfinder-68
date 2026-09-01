/**
 * Curated, attributed quotes. Selected deterministically by date so the same
 * day always shows the same quote. Nothing here is AI-generated.
 */
export const QUOTES: { text: string; author: string }[] = [
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Arise, awake, and stop not till the goal is reached.", author: "Swami Vivekananda" },
  { text: "Dream, dream, dream. Dreams transform into thoughts and thoughts result in action.", author: "A. P. J. Abdul Kalam" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
  { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
  { text: "Amateurs sit and wait for inspiration; the rest of us just get up and go to work.", author: "Stephen King" },
  { text: "Do not wait to strike till the iron is hot; but make it hot by striking.", author: "William Butler Yeats" },
  { text: "Perseverance is not a long race; it is many short races one after the other.", author: "Walter Elliot" },
];

export function quoteOfTheDay(date = new Date()) {
  const days = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
  return QUOTES[((days % QUOTES.length) + QUOTES.length) % QUOTES.length]!;
}
