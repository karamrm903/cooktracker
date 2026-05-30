/**
 * Stage 5 — Recipe Extractor
 *
 * Two responsibilities:
 *   1. buildAnalysisContext()  — assembles all pipeline signals into one
 *      structured object ready for the AI call.
 *   2. extractRecipe()         — calls Claude with the structured context and
 *      returns a normalised English recipe.
 *
 * ── Language handling ─────────────────────────────────────────────────────────
 * Source content can be in EN / AR / DE / FR / ES / PT.
 * The prompt instructs Claude to:
 *   a) Read and understand each signal in its original language.
 *   b) Cross-reference all signals regardless of language.
 *   c) Output the recipe in English.
 *
 * Frame analysis (Stage 4) always outputs English descriptions, so the
 * visual signal is always language-neutral and can anchor the extraction.
 *
 * ── Anti-hallucination rules (enforced in the prompt) ────────────────────────
 *   • Only include an ingredient if it appears in ≥ 1 source signal.
 *   • Only include a step if a corresponding action is evidenced by transcript,
 *     OCR, or frame descriptions.
 *   • If confidence in a detail is low, mark it as inferred, not confirmed.
 *   • Do NOT infer a recipe from the title alone.
 *
 * ── Multi-source confidence scoring ──────────────────────────────────────────
 * Raw confidence is computed as a weighted sum:
 *   transcript available          → 0.40
 *   OCR text extracted            → 0.30
 *   visual frame analysis         → frames.confidence × 0.30
 *   scenario quality adjustment   → see SCENARIO_QUALITY_ADJUSTMENTS
 *   cross-source ingredient match → bonus up to +0.10
 *   language detected clearly     → bonus up to +0.05
 */


// ── Structured context builder ────────────────────────────────────────────────

/**
 * Assemble all pipeline signals into the structured analysis context.
 * This object is serialised directly into the AI extraction prompt.
 *
 * Language fields:
 *   sourceLanguage    — primary language detected across transcript + OCR
 *   isMultilingual    — true when transcript and OCR are in different languages
 *   outputLanguage    — always 'en' (English) for now
 *
 * @param {{ url, platform, videoId, metadata, transcript, ocr, frames }} signals
 * @returns {object}
 */
function cleanIngredientText(text) {
  if (typeof text !== 'string') return text;

  return text
    .replace(/\bheavy milk\b/gi, 'milk')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function looksLikeIngredientLine(text) {
  if (!text || typeof text !== "string") return false;

  const lower = text.toLowerCase().trim();

  if (!lower) return false;
  if (lower.length > 80) return false;

  const badStarts = [
    "one cup is enough",
    "save it",
    "maximum flavor",
    "when the craving hits",
    "ingredients",
    "to assemble",
    "optional",
    "method",
    "instructions",
    "steps"
  ];

  if (badStarts.some(x => lower.startsWith(x))) return false;

  const badPhrases = [
    "sweet cravings",
    "satisfy your",
    "save it",
    "make it right away",
    "maximum flavor",
    "instantly"
  ];

  if (badPhrases.some(x => lower.includes(x))) return false;

  const measurementWords = [
    "cup", "cups", "tbsp", "tablespoon", "tablespoons",
    "tsp", "teaspoon", "teaspoons", "dessert spoon",
    "g", "gram", "grams", "ml", "oz", "slice", "slices"
  ];

  const ingredientWords = [
    "milk", "sugar", "flour", "cocoa", "baking powder",
    "cookie", "cookies", "chocolate", "butter", "egg", "eggs"
  ];

  const hasMeasurement = measurementWords.some(w => lower.includes(w));
  const hasIngredientWord = ingredientWords.some(w => lower.includes(w));

  return hasMeasurement || hasIngredientWord;
}

function extractStructuredIngredientLines(text) {
  if (!text || typeof text !== 'string') return [];

  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const results = [];
  let inIngredientsSection = false;

  const ingredientHeaderRegex = /^(ingredients|ingredient)\s*:?$/i;
  const quantityLineRegex =
    /^((\d+([./]\d+)?)|(\d+\s+\d+\/\d+)|half|quarter|one|two|three|four|five|six|seven|eight|nine|ten)\s*(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|dessert spoon|dessert spoons|spoon|spoons|g|gram|grams|ml|l|egg|eggs)\b/i;

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (ingredientHeaderRegex.test(lower)) {
      inIngredientsSection = true;
      continue;
    }

    if (inIngredientsSection) {
      if (
        /^method/i.test(lower) ||
        /^steps?/i.test(lower) ||
        /^instructions?/i.test(lower)
      ) {
        break;
      }

      if (
        quantityLineRegex.test(lower) ||
        lower.includes('cookie') ||
        lower.includes('cream') ||
        lower.includes('milk') ||
        lower.includes('flour') ||
        lower.includes('powder')
      ) {
        results.push(line);
      }
    } else {
      if (
        quantityLineRegex.test(lower) ||
        (inIngredientsSection &&
          !/^ingredients?$/i.test(lower) &&
          !/^method/i.test(lower) &&
          !/^steps?/i.test(lower) &&
          !/^instructions?/i.test(lower) &&
          line.length < 120)
      ) {
        results.push(line);
      }
    }
  }

  return [...new Set(results)];
}



function cleanStepText(text) {
  if (typeof text !== 'string') return text;

  return text
    .replace(/\bheavy milk\b/gi, 'milk')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function buildAnalysisContext({ url, platform, videoId, metadata, transcript, ocr, frames }) {
  console.log("METADATA DEBUG:", metadata)
  // Resolve source language: prefer transcript (richest signal), fall back to OCR
  const sourceLanguage = transcript.language !== 'unknown'
    ? (transcript.language ?? ocr.language ?? 'en')
    : (ocr.language ?? 'en');
  const isMultilingual = transcript.language !== ocr.language
    && transcript.language !== 'unknown'
    && ocr.language !== 'unknown';

  // Cross-source ingredient agreement: how many visual ingredients appear in
  // transcript or OCR text (normalised to the ingredients' English name)?
  // In the real implementation the AI does this comparison.
  // In mock mode we compute it from the fixed overlap between visual and recipe lists.
  const visualIngredients = frames.ingredients ?? [];
  const ocrAndTranscript = `${transcript.text ?? ''} ${ocr.combinedText ?? ''}`.toLowerCase();
  const agreedIngredients = visualIngredients.filter(ing =>
    // Check if at least the first meaningful word of the ingredient name is mentioned
    ing.split(/\s+/).filter(w => w.length > 3).some(w => ocrAndTranscript.includes(w))
  );
  const ingredientAgreementRatio = visualIngredients.length > 0
    ? agreedIngredients.length / visualIngredients.length
    : 0;

  return {
    // ── Provenance ──────────────────────────────────────────────────────────
    url,
    platform,
    videoId,
    sourceLanguage,
    isMultilingual,
    outputLanguage: 'en',

    // ── Metadata (may be bilingual or in source language) ──────────────────
    title: metadata.title ?? '',
    description: metadata.description ?? '',
    channelName: metadata.channelName ?? '',
    creatorCaption: metadata.creatorCaption ?? '',
    hashtags: metadata.hashtags ?? [],

    parsedCaptionIngredients: extractStructuredIngredientLines(metadata.creatorCaption ?? ''),
    parsedDescriptionIngredients: extractStructuredIngredientLines(metadata.description ?? ''),
    parsedOcrIngredients: extractStructuredIngredientLines(ocr.combinedText ?? ''),

    // ── Audio transcript (raw — in source language) ────────────────────────
    // Claude reads this in its original language; output is always English.
    transcript: {
      available: transcript.available,
      language: transcript.language,
      confidence: transcript.confidence,
      wordCount: transcript.wordCount,
      text: transcript.text ?? '',
      source: transcript.source,
      fallback: transcript._fallback,
    },

    // ── On-screen text / OCR (raw — in source language) ───────────────────
    ocrLanguage: ocr.language,
    ocrText: ocr.combinedText ?? '',
    ocrFrames: ocr.detectedFrames ?? [],

    // ── Visual frame analysis (always English — vision model output) ───────
    dishType: frames.dishType ?? '',
    frameDescriptions: frames.frameDescriptions ?? [],
    visualIngredients,
    visualCookingActions: frames.cookingActions ?? [],
    visualTools: frames.tools ?? [],
    visualConfidence: frames.confidence ?? 0,
    framesAnalyzed: frames.framesAnalyzed ?? 0,

    // ── Cross-source signals ───────────────────────────────────────────────
    ingredientAgreementRatio,
    agreedIngredientCount: agreedIngredients.length,
  };
}

// ── Prompt construction ───────────────────────────────────────────────────────

/**
 * Build the extraction prompt that is sent to Claude.
 *
 * The prompt is structured so Claude:
 *   1. Reads all source signals — each labelled with its language.
 *   2. Understands multilingual content (Arabic, German, French, Spanish, Portuguese).
 *   3. Cross-references signals before including any detail in the output.
 *   4. Writes ALL output in English.
 *   5. Returns valid JSON matching the recipe schema.
 *
 * @param {object} ctx
 * @returns {string}  The full prompt string.
 */
export function buildExtractionPrompt(ctx) {
  const langNote = ctx.sourceLanguage !== 'en'
    ? `The video is in ${LANGUAGE_NAMES[ctx.sourceLanguage] ?? ctx.sourceLanguage}. ` +
    `Read and understand the ${LANGUAGE_NAMES[ctx.sourceLanguage] ?? ctx.sourceLanguage} content, ` +
    `then write all recipe output in English.`
    : 'The video is in English.';

  const transcriptBlock = ctx.transcript.available
    ? `TRANSCRIPT (spoken words, language: ${ctx.transcript.language}, source: ${ctx.transcript.source}):
"""
${ctx.transcript.text}
"""
`
    : `TRANSCRIPT: Not available — rely on OCR and visual frame analysis instead.
`;

  const ocrBlock = ctx.ocrText
    ? `ON-SCREEN TEXT / OCR (language: ${ctx.ocrLanguage}, extracted from ${ctx.ocrFrames.length} frames):
${ctx.ocrFrames.map(f => `  [${f.timestamp}s] ${f.text}`).join('\n')}
`
    : `ON-SCREEN TEXT / OCR: Not available.
`;
  const parsedIngredientsBlock =
    (ctx.parsedCaptionIngredients?.length || ctx.parsedDescriptionIngredients?.length || ctx.parsedOcrIngredients?.length)
      ? `STRUCTURED INGREDIENT LIST DETECTED (HIGHEST PRIORITY SIGNAL):
Caption ingredients:
${ctx.parsedCaptionIngredients?.length ? ctx.parsedCaptionIngredients.map(x => `- ${x}`).join('\n') : '- (none)'}

Description ingredients:
${ctx.parsedDescriptionIngredients?.length ? ctx.parsedDescriptionIngredients.map(x => `- ${x}`).join('\n') : '- (none)'}

OCR ingredients:
${ctx.parsedOcrIngredients?.length ? ctx.parsedOcrIngredients.map(x => `- ${x}`).join('\n') : '- (none)'}
`
      : `PARSED INGREDIENT LINES: None detected.
`;
  const framesBlock = ctx.frameDescriptions.length > 0
    ? `VISUAL FRAME ANALYSIS (always in English — AI vision model output):
  Dish type: ${ctx.dishType}
  Visual ingredients: ${ctx.visualIngredients.join(', ')}
  Cooking actions: ${ctx.visualCookingActions.join(', ')}
  Tools: ${ctx.visualTools.join(', ')}
  Frame descriptions:
${ctx.frameDescriptions.map((d, i) => `    Frame ${i + 1}: ${d}`).join('\n')}
`
    : `VISUAL FRAME ANALYSIS: Not available.
`;

  return `You are an expert culinary AI. Your task is to extract a complete cooking recipe from the following video analysis data.

${langNote}

VIDEO METADATA:
  Platform:    ${ctx.platform}
  Title:       ${ctx.title}
  Channel:     ${ctx.channelName}
  Description: ${ctx.description}
  CREATOR CAPTION (HIGH PRIORITY TEXT SIGNAL):
${ctx.creatorCaption || '(none)'}

${transcriptBlock}
${ocrBlock}
${parsedIngredientsBlock}
${framesBlock}

EXTRACTION RULES — follow these strictly:
1. GROUND TRUTH: Use all five signals — title, transcript, OCR, visual ingredients, and visual
   actions — as your evidence base. Only include ingredients and steps supported by at least one
   of these signals. Do NOT invent content that appears in none of them.
2. EXPLICIT INGREDIENT LIST PRIORITY (VERY HIGH PRIORITY):
If the caption, OCR text, or transcript contains a structured ingredient list 
(e.g., lines after "Ingredients", bullet points, or quantity + ingredient patterns),
treat this list as the primary source of truth.

Rules:
• Preserve each listed ingredient exactly unless another signal explicitly contradicts it.
• Do NOT replace or simplify listed ingredients with visually inferred guesses.
• Do NOT omit listed ingredients because they were not visually detected.
• Visual signals may only confirm or supplement the list, not override it.

Example:
Caption lists:
"Chocolate cream sandwich cookies, 1/2 cup milk, sugar"

Correct extraction:
• chocolate cream sandwich cookies
• milk
• sugar

Incorrect extraction:
• chocolate
• whipped cream

 3. STRUCTURED INGREDIENT LIST DETECTED (HIGHEST PRIORITY SOURCE):
If PARSED INGREDIENT LINES are present, use them as the primary source of truth for ingredients and quantities.
Do not replace them with visually guessed alternatives.
Do not simplify compound ingredient names.
If a structured ingredient list is detected in caption or OCR, DO NOT add new ingredients that are not present in that list unless they appear explicitly in transcript or OCR.
Examples:
- "chocolate cream sandwich cookies" must remain "chocolate cream sandwich cookies"
- "1/2 cup milk" must remain milk
- "1 dessert spoon flour" must remain flour
Visual signals may confirm these ingredients, but must not override them.

4. DISH IDENTITY & SIGNAL PRIORITY:
   a) TITLE ANCHORS DISH IDENTITY: If the title names a specific dish, protein, or cuisine
      (e.g. "Wagyu steak", "salmon", "chicken tikka masala"), that is the primary dish identity.
      Do NOT replace it with a visually similar but less specific guess from frame analysis
      (e.g. do not rename "Wagyu" to "beef" or "steak" because the vision model saw a generic
      steak). Only override the title if OCR or transcript explicitly contradicts it.
   b) VISUAL + TITLE AGREEMENT INCREASES CERTAINTY: If the visual ingredients list and the
      title agree on the same protein or dish (e.g. title says "salmon" and frames show salmon),
      treat that ingredient as confirmed with high certainty — reflect this in the confidence
      score and place it at the top of the ingredients list.
   c) PREFER SPECIFIC INGREDIENT DETECTION OVER GENERIC VISUAL GUESSING: When visual analysis
      identifies a specific ingredient (e.g. "shiitake mushrooms", "Wagyu beef", "miso paste"),
      use that specific name. Do not collapse it to a generic parent category (e.g. "mushrooms",
      "beef", "paste") unless the specific identification is uncertain.
   d) PRESERVE COMPOUND INGREDIENT NAMES:
      If an ingredient is explicitly named in caption, OCR, or transcript,
      preserve the most specific supported name.

      Examples:
      • "chocolate cream sandwich cookies" must NOT become "chocolate".
      • "parmesan cheese" must NOT become "cheese".
      • "dark chocolate chips" must NOT become "chocolate".

Only simplify if the specific ingredient is clearly uncertain.

5. MULTILINGUAL: If the transcript or OCR is in a non-English language, read and translate it.
   All output must be in English.
   ARABIC COOKING INGREDIENT NORMALIZATION:
If the source language is Arabic, normalize dialect ingredient names into standard English culinary terms.
Examples of common Arabic cooking terms:
ARABIC DAIRY NORMALIZATION (HIGH PRIORITY):

حليب مكثف → condensed milk
حليب مكثف محلى → sweetened condensed milk
حليب مبخر → evaporated milk
- ظرف → packet / sachet
- ظرف كريم كراميل → 1 packet crème caramel
- ظرف فانيليا → 1 packet vanilla
- ظرف دريم ويب → 1 packet Dream Whip

If the Arabic word "ظرف" appears before a packaged ingredient, interpret it as one packet or one sachet, not as a generic container.

- قيمر / كيمر / gamer / gaymar / qaymar → clotted cream or kaymak
- قشطة → cream
- كريمة → cream
- كريمة طبخ → cooking cream
- كريمة خفق → whipping cream
- كريمة مكثفة → heavy cream

- حليب → milk
- حليب مكثف → condensed milk
- مكثف / مكثفة → thick / heavy (used for heavy cream or condensed milk depending on context)

- روب / زبادي / لبن → yogurt
- لبنة → labneh (strained yogurt)

- جبنة كريمية → cream cheese
- جبن → cheese

- شطة → chili or chili sauce
- فلفل → pepper
- ملح → salt
- سكر → sugar

- طحين / دقيق → flour
- نشا → cornstarch

- زيت → oil
- زبدة → butter
- سمن → ghee

- بيض → eggs
- فانيليا → vanilla

ملعقة كبيرة → tablespoon
ملعقة صغيرة → teaspoon
كوب → cup
رشة → pinch
قبضة → handful

يخلط → mix
يقلب → stir
يشوح → sauté
يحمر → brown
يسلق → boil

MULTILINGUAL COOKING TERM NORMALIZATION:
If the source is in German, French, Spanish, or Portuguese, normalize cooking ingredient names and cooking actions into standard English culinary terms.
Use transcript, OCR, and visual evidence together.
Do not preserve untranslated ingredient names in the final output unless there is no standard English equivalent.
Prefer standard culinary English in all outputs.
GERMAN COOKING EXAMPLES:
- Mehl → flour
- Stärke → starch / cornstarch
- Sahne → cream
- Schlagsahne → whipping cream
- Frischkäse → cream cheese
- Joghurt → yogurt
- Butter → butter
- Eier → eggs
- umrühren → stir
- anbraten → sear / fry
- köcheln → simmer

Tasse → cup
Esslöffel → tablespoon
Teelöffel → teaspoon
Prise → pinch
Handvoll → handful

Mehl → flour
Zucker → sugar
Butter → butter
Ei / Eier → eggs
Sahne → cream

mischen → mix
rühren → stir
braten → fry
köcheln → simmer

FRENCH COOKING EXAMPLES:
- farine → flour
- maïzena / fécule → cornstarch / starch
- crème → cream
- crème épaisse → thick cream
- crème liquide → liquid cream / heavy cream depending on context
- fromage frais / fromage à la crème → cream cheese
- yaourt → yogurt
- beurre → butter
- œufs → eggs
- mélanger → mix
- remuer → stir
- faire mijoter → simmer

tasse → cup
cuillère à soupe → tablespoon
cuillère à café → teaspoon
pincée → pinch
poignée → handful

farine → flour
sucre → sugar
beurre → butter
œuf / œufs → eggs
crème → cream

mélanger → mix
remuer → stir
faire revenir → sauté
bouillir → boil

SPANISH COOKING EXAMPLES:
- harina → flour
- maicena / fécula → cornstarch / starch
- crema → cream
- crema espesa → thick cream
- queso crema → cream cheese
- yogur → yogurt
- mantequilla → butter
- huevos → eggs
- mezclar → mix
- revolver → stir
- sofreír → sauté
- hervir a fuego lento → simmer

taza → cup
cucharada → tablespoon
cucharadita → teaspoon
pizca → pinch
puñado → handful

harina → flour
maicena → cornstarch
azúcar → sugar
sal → salt
mantequilla → butter
huevo / huevos → eggs

mezclar → mix
remover → stir
freír → fry
sofreír → sauté
hervir → boil

PORTUGUESE COOKING EXAMPLES:
- farinha → flour
- amido de milho / fécula → cornstarch / starch
- creme de leite → cream
- nata / natas → cream
- cream cheese / queijo cremoso / requeijão (context-dependent) → cream cheese or spreadable cheese
- iogurte → yogurt
- manteiga → butter
- ovos → eggs
- misturar → mix
- mexer → stir
- refogar → sauté
- cozinhar em fogo baixo → simmer

xícara → cup
colher de sopa → tablespoon
colher de chá → teaspoon
pitada → pinch
punhado → handful

farinha → flour
açúcar → sugar
manteiga → butter
ovo / ovos → eggs
creme de leite → cream

misturar → mix
mexer → stir
fritar → fry
refogar → sauté

Use transcript, OCR, and visual evidence to determine the most likely ingredient.
If the exact meaning is uncertain, choose the closest standard English culinary term and avoid literal transliteration.
   If the source is Arabic, it may be in Gulf, Egyptian, Levantine, Iraqi, or mixed dialect.
   Interpret colloquial Arabic cooking vocabulary by meaning, not by literal wording.
   Convert all Arabic ingredient names and cooking verbs into standard English culinary terms.
   Do not preserve dialect wording in the final output.
   If an Arabic term is ambiguous, choose the most likely culinary meaning supported by transcript, OCR, and visual evidence.
   INGREDIENT CONSERVATISM RULE:

Do not invent ingredients that are not supported by transcript, OCR, or visual evidence.

If a quantity is unclear, omit the quantity rather than guessing.

If the ingredient state (melted, chopped, softened) is not clearly visible or spoken, use the neutral ingredient name.
SIGNAL PRIORITY RULE:

When ingredient quantities are spoken in the transcript,
prefer the transcript quantity over OCR or visual estimation.

Transcript quantities are usually the most reliable.
5.1 MEASUREMENT NORMALIZATION:
Preserve uncommon measurement units rather than discarding them.

Examples:
• "1 dessert spoon sugar"
• "1 dessert spoon cocoa powder"

Do not remove an ingredient because its measurement unit is uncommon.
6 CONFIDENCE: An ingredient is CONFIRMED if it appears in any one of: frame analysis descriptions,
   visual ingredient list, OCR text, or transcript. A single source is sufficient for confirmation.
   Cooking videos often show ingredients visually for only a moment — treat visual presence as
   evidence. Do NOT downgrade a visually detected ingredient to inferred just because it appears
   in only one signal. Small ingredients (salt, pepper, oil, spices, herbs) may appear briefly
   and should still be confirmed if detected in any frame or transcript signal.
   An ingredient is INFERRED only when it does not appear in any signal at all but is strongly
   implied by the dish type or standard cooking practice (e.g. water for boiling pasta).
   CRITICAL EXCEPTION: NEVER put calorie-dense fundamental ingredients (like sugar, cooking oil, butter) into the 'inferredIngredients' list. If they are unseen but necessary, they MUST go into the main 'ingredients' array with an estimated quantity so their calories are counted!
   If a detail has no evidence in any signal → omit it entirely, do not guess.
7. INGREDIENTS: Confirmed = appears in any signal (frame, OCR, transcript, visual list).
EARLY FRAME INGREDIENT PRIORITY:
Short cooking videos often display ingredients in the first few seconds.
If ingredients appear in the first analyzed frames, treat them as strong evidence
even if they appear only briefly.
INGREDIENT LIST DETECTION:
If OCR detects multiple ingredients displayed together on screen
(e.g. several bowls of ingredients or a list of items),
treat them as the ingredient list even if quantities are not shown.
Ingredients shown visually in early frames should be considered confirmed
even if they are not repeated later in the transcript.
   Inferred = implied by dish type but absent from all signals.
   Do not add preparation-state adjectives unless they are explicitly supported by transcript, OCR,
   or clearly visible frame evidence.
   For example, do not say "melted coconut oil", "softened butter", "chopped parsley", or
   "room-temperature eggs" unless that exact state is shown or stated.
   If the ingredient is present but its state is unclear, use the neutral ingredient name only.
7.1 QUANTITY GROUNDING:
   Ingredient quantities in the main text should ideally come from transcript or OCR.
   HOWEVER, for nutrition calculations, if a quantity is missing, you MUST assume a realistic standard serving size (e.g. 50g pasta, 1 tbsp oil, 2 tbsp sugar). Never assign 0 calories to energy-dense foods.
   If a fundamental ingredient (like sugar in a dessert or oil for frying) is unseen but necessary, include it in the main 'ingredients' array with an estimated quantity.
   Never invent impossible combinations such as "heavy milk".
   If the transcript contains similar dairy terms (milk, cream, whipping cream, heavy cream),
do not merge or substitute them unless the evidence clearly supports the substitution.
   Use standard ingredient names only (e.g. milk, heavy cream, cream).
8. STEPS: Extract only steps that are described or shown. Include timer values when mentioned.
9. NUTRITION: Provide estimated nutrition for the FULL recipe, not just per serving.
Also estimate the number of servings and provide approximate per-serving nutrition separately.
If serving size is uncertain, still prioritize full-recipe totals.
You MUST estimate nutrition for EVERY major ingredient, even if you have to guess the assumed quantity for the calculation.
For each ingredient, return calories, protein, carbs, and fat.
CRITICAL: The string used in 'ingredientNutrition[].ingredient' MUST exactly match the string used in the 'ingredients' array. Do not use a shorter name or omit the measurement in the nutrition array!
These per-ingredient nutrition values will be used to recalculate the full recipe if ingredients are removed or changed.
Mark all nutrition as estimated.
10. CONFIDENCE SCORE: 0.0–1.0 reflecting how completely the evidence supports the extraction.
   Low evidence → low score. Do not report high confidence when sources are thin.
9.5 ARABIC DIALECT NORMALIZATION:
   If the source is Arabic, normalize dialect cooking words into standard English cooking terms.
   Examples:
     "حط" / "ضيف" / "حطي" / "حطوا" → add
     "قلب" / "قلبي" → stir / mix
     "شوح" / "شوحي" → sauté
     "حمّر" → brown
     "سبّك" → simmer or reduce until thick
     "شطة" → chili or chili sauce
     "روب" / "زبادي" / "لبن" → yogurt when the cooking context supports yogurt
   Use context from transcript, OCR, and visual evidence to choose the correct meaning.
   Output only standard English culinary wording.
11. SLANG & INDIRECT LANGUAGE: Creators often describe cooking actions figuratively or casually.
   Infer the intended culinary action, not just the literal words.
   If the spoken wording is figurative or playful, use visual evidence and cooking context
   to determine the actual step. Map slang and metaphor to the nearest standard culinary
   action when supported by evidence. Examples:
     "give it a haircut"      → peel or trim
     "let this baby sweat"    → sauté or sweat aromatics over low heat
     "hit it with some heat"  → sear or cook over high heat
     "you know the vibes"     → repeat the previously described standard step
     "show it some love"      → baste, stir, or tend to the food attentively
   When resolving figurative language, cross-reference the frame analysis to confirm
   what action is physically visible. Use the most specific culinary term the evidence supports.
12. VISUAL ACTIONS IN STEPS: The visual cooking actions signal (e.g. "searing", "deglazing",
    "plating") represents what was physically observed on screen. Incorporate these into the
    recipe steps where they fit the sequence. If a visual action is not mentioned in the
    transcript but is clearly shown (e.g. resting meat, garnishing), include it as a step.

RECIPE TITLE RULE:

The title must contain ONLY the actual dish name.

Do not include marketing phrases, dietary claims, or context such as:
"for weight loss", "high protein", "healthy", "viral", "easy", "quick", or "best ever".

Do not invent cuisine terms, flavor descriptors, or dish modifiers that are not explicitly supported by evidence.

If a number refers to ingredient quantity, spoon count, packet count, or recipe format,
do NOT convert it into a title word.

Examples:
"Hibachi Dinner For Weight Loss" → "Hibachi Shrimp and Vegetables"
"High Protein Chicken Wrap" → "Chicken Wrap"
"Viral Baked Oats" → "Baked Oats"
"5 spoons chocolate cake" → "Chocolate Cake"
"3 ingredient brownies" → "Brownies"

The title must contain ONLY the dish name.

Do not include marketing phrases, dietary claims, or context such as:
"for weight loss", "high protein", "healthy", "viral", "easy", "quick", or "best ever".

Extract only the core food name.

Examples:
"Hibachi Dinner For Weight Loss" → "Hibachi Shrimp and Vegetables"
"High Protein Chicken Wrap" → "Chicken Wrap"
"Viral Baked Oats" → "Baked Oats"
"Easy 3 Ingredient Brownies" → "Brownies"
Return ONLY valid JSON in this exact schema:
{
  "title": "string (English)",
  "emoji": "single emoji representing the dish",
  "servings": number,
  "ingredients": ["string (English, with quantity)", ...],
  "inferredIngredients": ["string (English, with note about why inferred)", ...],
  "steps": [
    { "text": "string (English)", "timerMinutes": number | null, "timerLabel": "string | null" }
  ],
  "nutrition": {
  "total": { "calories": number, "protein": number, "carbs": number, "fat": number },
  "perServing": { "calories": number, "protein": number, "carbs": number, "fat": number },
  "servings": number
},
"ingredientNutrition": [
  {
    "ingredient": "string",
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number
  }
],
"extractionNotes": "string — brief note about language, missing signals, or confidence issues"
}`;
}

const LANGUAGE_NAMES = {
  ar: 'Arabic', de: 'German', fr: 'French', es: 'Spanish', pt: 'Portuguese', en: 'English',
};

// ── Confidence scoring ────────────────────────────────────────────────────────

/**
 * Compute raw confidence from all available signals.
 *
 * Weighting rationale:
 *   Transcript is the richest cooking-specific signal → 40 %
 *   OCR captures on-screen ingredient overlays and quantities → 30 %
 *   Visual frame analysis provides dish-type + ingredient confirmation → 30 %
 *   Cross-source ingredient agreement adds a bonus → up to +10 %
 *   Clear language detection adds a small bonus → up to +5 %
 *
 * @param {object} ctx
 * @returns {number}  0–1
 */
function computeRawConfidence(ctx) {
  let base = 0;
  if (ctx.transcript.available || ctx.ocrFrames.length > 0) {
    base =
      (ctx.transcript.available ? 0.40 : 0.05) +
      (ctx.ocrFrames.length > 0 ? 0.30 : 0.05) +
      (ctx.visualConfidence * 0.30);
  } else {
    base = Math.max(0.40, ctx.visualConfidence * 0.85);
  }

  // Bonus: fraction of visual ingredients confirmed across other sources
  const agreementBonus = ctx.ingredientAgreementRatio * 0.10;

  // Bonus: high-confidence language detection means the AI prompt is well-informed
  const langBonus = (ctx.transcript.confidence ?? 0) > 0.80 ? 0.03 : 0;

  return Math.max(0, Math.min(base + agreementBonus + langBonus, 1.0));
}

// ── Main extractor ────────────────────────────────────────────────────────────

/**
 * Build the analysis context and extract a recipe from it.
 *
 * @param {object} context
 * @returns {Promise<object>}
 */

export async function extractRecipe(context) {
  const rawConfidence = computeRawConfidence(context);

  console.log('[recipeExtractor] extractRecipe');
  console.log('  Source lang  :', context.sourceLanguage);
  console.log('  Multilingual :', context.isMultilingual);
  console.log('  Ingredient match:', `${context.agreedIngredientCount}/${context.visualIngredients.length}`);
  console.log('  Raw confidence:', rawConfidence.toFixed(3));

  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY is not set');
  }

  const prompt = buildExtractionPrompt(context);
  console.log('[recipeExtractor] transcript text:', context.transcript.text);
  console.log('[recipeExtractor] ocr text:', context.ocrText);
  console.log('[recipeExtractor] visual ingredients:', context.visualIngredients);
  console.log('[recipeExtractor] creator caption:', context.creatorCaption);
  console.log('[recipeExtractor] parsed caption ingredients:', context.parsedCaptionIngredients);
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      system: 'You are an expert culinary AI. Always respond with valid JSON only. Do not include markdown fences.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${text}`);
  }

  const data = await response.json();

  let extracted;

  try {
    const raw = data.content[0].text;

    const jsonMatch = raw.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      extracted = JSON.parse(jsonMatch[0]);
      extracted.ingredients = extracted.ingredients?.map(cleanIngredientText);
      extracted.steps = extracted.steps?.map(cleanStepText);

      console.log('[recipeExtractor] raw ingredients before cleanup:', extracted.ingredients);
      console.log('[recipeExtractor] raw steps before cleanup:', extracted.steps);
      console.log('[recipeExtractor] ingredients after cleanup:', extracted.ingredients);
      console.log('[recipeExtractor] steps after cleanup:', extracted.steps);

    } else {
      throw new Error("No JSON found in Claude response");
    }

    if (Array.isArray(extracted.inferredIngredients) && extracted.inferredIngredients.length > 0) {
      const cleanedInferred = extracted.inferredIngredients.map(cleanIngredientText);
      extracted.ingredients = [...(extracted.ingredients || []), ...cleanedInferred];
      extracted.inferredIngredients = [];
    }

    if (Array.isArray(extracted.steps)) {
      extracted.steps = extracted.steps.map(step => ({
        ...step,
        text: cleanStepText(step.text),
      }));
    }
    const forcedParsedIngredients = [
      ...(context.parsedCaptionIngredients ?? []),
      ...(context.parsedDescriptionIngredients ?? []),
      ...(context.parsedOcrIngredients ?? []),
    ]
      .map(cleanIngredientText)
      .filter(Boolean)
      .filter(looksLikeIngredientLine);

    const uniqueForcedParsedIngredients = [...new Set(forcedParsedIngredients)];

    console.log('[recipeExtractor] forced parsed ingredients:', uniqueForcedParsedIngredients);

    if (Array.isArray(extracted.ingredients) && Array.isArray(extracted.ingredientNutrition)) {
      extracted.ingredients = extracted.ingredients.map((ing) => {
        const cleanedName = typeof ing === 'string' ? cleanIngredientText(ing) : cleanIngredientText(ing.name || '');

        let bestMatch = null;
        let highestScore = 0;

        const tokenize = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !['cup', 'cups', 'tbsp', 'tsp', 'tablespoon', 'teaspoon', 'gram', 'grams', 'ml', 'oz', 'pinch', 'slices', 'pieces', 'chopped', 'diced', 'minced', 'roasted', 'fresh', 'powder'].includes(w));
        const targetTokens = tokenize(cleanedName);

        for (const item of extracted.ingredientNutrition) {
          if (!item?.ingredient) continue;
          const itemTokens = tokenize(item.ingredient);
          const score = itemTokens.filter(t => targetTokens.includes(t)).length;
          
          const a = item.ingredient.toLowerCase();
          const b = cleanedName.toLowerCase();
          const isSub = a.includes(b) || b.includes(a);

          if (score > highestScore || (isSub && highestScore === 0)) {
            highestScore = Math.max(score, isSub ? 1 : 0);
            bestMatch = item;
          }
        }

        const match = bestMatch;

        return {
          name: cleanedName,
          calories: match?.calories ?? 0,
          protein: match?.protein ?? 0,
          carbs: match?.carbs ?? 0,
          fat: match?.fat ?? 0,
        };
      });
    }

  } catch (err) {
    console.warn("[recipeExtractor] JSON parse failed, using fallback");

    extracted = {
      title: "Detected Dish",
      ingredients: [],
      steps: [],
      confidence: 0.3
    };
  }
  console.log('[recipeExtractor] ✔ Claude response received → title:', extracted.title);

  return {
    id: `analyzed_${Date.now()}`,
    ...extracted,
    _analysis: {
      rawConfidence,
      detectedLanguage: context.sourceLanguage,
      outputLanguage: context.outputLanguage,
      isMultilingual: context.isMultilingual,
      ingredientAgreementRatio: context.ingredientAgreementRatio,
      sourcesUsed: {
        metadata: !!context.title,
        transcript: context.transcript.available,
        ocr: context.ocrFrames.length > 0,
        frames: context.framesAnalyzed > 0,
      },
      extractionNotes: extracted.extractionNotes,
    },
  };
}
