import type { StudyPack } from "./schema";

/** An example class, used for the "try an example" button and for demo mode. */
export const SAMPLE_TRANSCRIPT = `[00:00] Okay everyone, today we are talking about photosynthesis. This is a big one, so please pay attention.
[00:12] Photosynthesis is how plants turn light energy into chemical energy. The overall equation is six CO2 plus six water, with light, gives glucose plus six oxygen.
[00:31] You need to know this equation. I repeat, you need to know this equation by heart, it comes back every year on the exam.
[00:44] It happens in the chloroplast. There are two stages. The light-dependent reactions happen in the thylakoid membranes, and the Calvin cycle happens in the stroma.
[01:05] In the light reactions, chlorophyll absorbs light, water is split, and that is where the oxygen comes from. The oxygen comes from water, not from CO2. Students always get that wrong.
>>> STUDENT PRESSED "I'M LOST" HERE (marker #1) <<<
[01:27] The light reactions produce ATP and NADPH. Those two molecules carry the energy to the Calvin cycle.
[01:40] In the Calvin cycle, the enzyme RuBisCO fixes CO2, and using ATP and NADPH the plant builds a three carbon sugar called G3P, which is later used to make glucose.
[02:02] You do not need to memorise every intermediate of the Calvin cycle. Just know the inputs and the outputs.
[02:15] Last thing, limiting factors: light intensity, CO2 concentration, and temperature. For next week, read chapter 8 and do the exercises on page 142.`;

export const SAMPLE_PACK: StudyPack = {
  title: "Photosynthesis: the two stages",
  subject: "Biology",
  summary:
    "The class covered how plants convert light energy into chemical energy. Photosynthesis takes place in the chloroplast in two stages: the light-dependent reactions in the thylakoid membranes and the Calvin cycle in the stroma. The light reactions split water, release oxygen and produce ATP and NADPH. The Calvin cycle uses that energy, with the enzyme RuBisCO, to fix CO2 into the sugar G3P. The teacher ended with the three limiting factors and homework for next week.",
  notes: [
    {
      heading: "Overall equation",
      points: [
        "6 CO2 + 6 H2O + light → C6H12O6 (glucose) + 6 O2",
        "Converts light energy into chemical energy",
      ],
    },
    {
      heading: "Stage 1: light-dependent reactions",
      points: [
        "Location: thylakoid membranes of the chloroplast",
        "Chlorophyll absorbs light and water is split",
        "Oxygen is released, and it comes from water, not CO2",
        "Products: ATP and NADPH",
      ],
    },
    {
      heading: "Stage 2: Calvin cycle",
      points: [
        "Location: stroma",
        "RuBisCO fixes CO2",
        "Uses ATP and NADPH to build G3P, later used to make glucose",
      ],
    },
    {
      heading: "Limiting factors",
      points: ["Light intensity", "CO2 concentration", "Temperature"],
    },
  ],
  focus: [
    {
      topic: "The overall equation of photosynthesis",
      priority: "high",
      why: "The teacher said it twice and said it appears on the exam every year.",
      evidence: "You need to know this equation by heart, it comes back every year on the exam.",
    },
    {
      topic: "Where the oxygen comes from",
      priority: "high",
      why: "The teacher flagged this as a common mistake, and you pressed “I'm lost” right after it.",
      evidence: "The oxygen comes from water, not from CO2. Students always get that wrong.",
    },
    {
      topic: "Inputs and outputs of the Calvin cycle",
      priority: "medium",
      why: "The teacher said to know inputs and outputs only, not every intermediate.",
      evidence: "Just know the inputs and the outputs.",
    },
    {
      topic: "Limiting factors",
      priority: "low",
      why: "Mentioned briefly at the end with no special emphasis.",
      evidence: "",
    },
  ],
  key_terms: [
    { term: "Chloroplast", definition: "The organelle where photosynthesis happens." },
    { term: "Thylakoid", definition: "Membrane inside the chloroplast where the light reactions occur." },
    { term: "Stroma", definition: "Fluid inside the chloroplast where the Calvin cycle occurs." },
    { term: "RuBisCO", definition: "The enzyme that fixes CO2 in the Calvin cycle." },
    { term: "ATP / NADPH", definition: "Energy-carrying molecules made in the light reactions." },
  ],
  quiz: [
    {
      question: "Where does the oxygen released in photosynthesis come from?",
      options: ["Carbon dioxide", "Water", "Glucose", "Chlorophyll"],
      correct_index: 1,
      explanation: "Water is split during the light reactions, and that releases the oxygen.",
      topic: "Where the oxygen comes from",
    },
    {
      question: "Which is the correct overall equation?",
      options: [
        "6 CO2 + 6 H2O + light → C6H12O6 + 6 O2",
        "C6H12O6 + 6 O2 → 6 CO2 + 6 H2O",
        "6 CO2 + 6 O2 → C6H12O6 + 6 H2O",
        "6 H2O + light → C6H12O6 + 6 CO2",
      ],
      correct_index: 0,
      explanation: "CO2 and water go in, glucose and oxygen come out. The second option is respiration.",
      topic: "The overall equation of photosynthesis",
    },
    {
      question: "Where does the Calvin cycle take place?",
      options: ["Thylakoid membrane", "Mitochondria", "Stroma", "Cell wall"],
      correct_index: 2,
      explanation: "The Calvin cycle happens in the stroma; the light reactions happen in the thylakoids.",
      topic: "Inputs and outputs of the Calvin cycle",
    },
    {
      question: "What do the light reactions supply to the Calvin cycle?",
      options: ["Glucose and oxygen", "ATP and NADPH", "CO2 and water", "RuBisCO"],
      correct_index: 1,
      explanation: "ATP and NADPH carry the energy from the light reactions to the Calvin cycle.",
      topic: "Inputs and outputs of the Calvin cycle",
    },
    {
      question: "Which is NOT a limiting factor mentioned in class?",
      options: ["Light intensity", "Temperature", "Soil pH", "CO2 concentration"],
      correct_index: 2,
      explanation: "The teacher listed light intensity, CO2 concentration and temperature.",
      topic: "Limiting factors",
    },
  ],
  lost_moments: [
    {
      marker: 1,
      what_was_said:
        "In the light reactions, water is split and this is the source of the oxygen that plants release.",
      simple_explanation:
        "Think of water (H2O) as a small package holding hydrogen and oxygen. Light gives the plant the energy to tear that package open. The plant keeps the hydrogen to build sugar later and throws the oxygen away into the air. So the oxygen you breathe was once part of a water molecule. The CO2 is used later, in the Calvin cycle, and its atoms end up in the sugar.",
    },
  ],
  next_steps: [
    "Memorise the overall equation and write it from memory three times",
    "Read chapter 8",
    "Do the exercises on page 142",
  ],
};
