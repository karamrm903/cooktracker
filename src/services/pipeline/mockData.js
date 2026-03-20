/**
 * Shared mock data for the video analysis pipeline.
 *
 * Each MOCK_SCENARIO entry represents one realistic cooking video with all the
 * raw signals the pipeline would receive from real APIs:
 *   - metadata   (YouTube/TikTok/Instagram API response)
 *   - transcript (YouTube captions / Whisper STT output)
 *   - ocr        (Google Vision / Textract keyframe scan)
 *   - frames     (GPT-4 Vision / Gemini multi-frame analysis)
 *   - recipe     (expected extraction output — ground truth for mocks)
 *
 * Scenarios:
 *   0 → Pan-Seared Ribeye Steak    (EN, YouTube)
 *   1 → Pasta Carbonara            (EN, YouTube)
 *   2 → Honey Garlic Chicken       (EN, TikTok)
 *   3 → Chicken Kabsa / كبسة دجاج  (AR, YouTube — multi-language demo)
 *
 * Language field: 'en' | 'ar' | 'de' | 'fr' | 'es' | 'pt'
 * All recipe outputs are normalised to English regardless of source language.
 */

// ── Timing ────────────────────────────────────────────────────────────────────
export const MOCK_DELAYS = {
  metadata:   [480,  820],
  transcript: [920, 1340],
  ocr:        [680, 1080],
  frames:     [1100, 1640],
  synthesize: [860, 1260],
  validate:   [380,  680],
};

export function mockWait([min, max]) {
  return new Promise(r => setTimeout(r, min + Math.random() * (max - min)));
}

// ── Submission counter ────────────────────────────────────────────────────────
// Cycles scenarios in order so every new submission shows a different recipe.
let _count = 0;

export function nextScenarioIdx() {
  const idx = _count % MOCK_SCENARIOS.length;
  _count++;
  return idx;
}

// ── Per-scenario quality adjustments ─────────────────────────────────────────
// Simulate real-world signal quality differences between videos.
//   Steak  (0): all signals clear → no penalty
//   Pasta  (1): muffled audio, quick cuts → -0.22 (lands in "medium")
//   Chicken(2): minor OCR ambiguity → small penalty, stays "high"
//   Kabsa  (3): Arabic transcript, good OCR → slight multi-lang boost
export const SCENARIO_QUALITY_ADJUSTMENTS = [0.00, -0.22, -0.04, 0.01];

// ── Scenarios ─────────────────────────────────────────────────────────────────
export const MOCK_SCENARIOS = [

  // ─── 0: Pan-Seared Ribeye Steak (EN, YouTube) ──────────────────────────────
  {
    language: 'en',
    metadata: {
      title:        'Viral Steak Recipe | The BEST Pan-Seared Ribeye',
      description:  'Learn how to cook the perfect steak at home — simple ingredients, restaurant quality results.',
      creatorCaption: 'season steak generously sear on high heat butter baste rest 5 minutes',
      hashtags:     ['#steak', '#ribeye', '#cooking', '#foodie'],
      durationSec:  187,
    },
    transcript: {
      available:  true,
      language:   'en',
      confidence: 0.91,
      wordCount:  148,
      source:     'youtube_captions',
      text: `Start with a thick-cut ribeye steak, about one inch thick.
Pat it completely dry with paper towels — this is essential for a good sear.
Season both sides generously with coarse salt and freshly ground black pepper.
Let it rest at room temperature for 30 minutes before cooking.
Heat your cast iron skillet until it is smoking hot. Add one tablespoon of neutral oil.
Place the steak in the pan and do not touch it for 3 minutes.
Flip once. Sear for another 3 minutes on the second side.
Reduce the heat to medium. Add 2 tablespoons of butter, 4 cloves of crushed garlic, and 2 sprigs of rosemary.
Tilt the pan and baste the steak continuously with the foaming butter for 2 minutes.
Remove and let the steak rest for 5 minutes before slicing. Slice against the grain.`,
    },
    ocr: {
      language:      'en',
      framesScanned: 14,
      detectedFrames: [
        { timestamp: 5,   text: 'Ribeye Steak — 1 inch thick' },
        { timestamp: 18,  text: 'Coarse Salt & Black Pepper' },
        { timestamp: 44,  text: 'Rest at room temp — 30 min' },
        { timestamp: 79,  text: 'Cast Iron on HIGH heat' },
        { timestamp: 98,  text: 'Sear 3 min per side — do not move' },
        { timestamp: 128, text: '2 tbsp Butter + 4 cloves Garlic + 2 Rosemary sprigs' },
        { timestamp: 144, text: 'Baste 2 min' },
        { timestamp: 168, text: 'Rest 5 min before slicing' },
        { timestamp: 180, text: 'Slice against the grain' },
      ],
    },
    frames: {
      framesAnalyzed: 9,
      confidence:     0.94,
      dishType:       'Pan-seared beef steak',
      ingredients:    ['ribeye steak', 'butter', 'garlic', 'rosemary', 'salt', 'black pepper', 'oil'],
      cookingActions: ['patting dry', 'seasoning', 'searing', 'butter basting', 'resting', 'slicing'],
      tools:          ['cast iron skillet', 'tongs', 'basting spoon', 'cutting board'],
      frameDescriptions: [
        'Raw thick-cut ribeye steak on a wooden cutting board',
        'Steak being patted dry with paper towel',
        'Salt and pepper seasoning applied generously to both sides',
        'Smoking hot cast iron skillet with shimmering oil',
        'Steak placed in pan — visible steam and loud sizzle',
        'Golden crust forming on the underside of the steak',
        'Butter, whole garlic cloves, and rosemary sprigs added to pan',
        'Continuous basting with amber-coloured foaming butter',
        'Sliced steak showing pink medium-rare interior on board',
      ],
    },
    recipe: {
      title:    'Perfect Pan-Seared Ribeye Steak',
      emoji:    '🥩',
      servings: 2,
      ingredients: [
        '2 ribeye steaks, 1 inch thick (approx. 300 g each)',
        '1 tbsp neutral oil (vegetable or avocado)',
        '2 tbsp unsalted butter',
        '4 cloves garlic, lightly crushed',
        '2 sprigs fresh rosemary',
        'Coarse salt, to taste',
        'Freshly ground black pepper, to taste',
      ],
      inferredIngredients: [
        'Fresh thyme (seen briefly in background)',
      ],
      steps: [
        { text: 'Pat the steaks completely dry with paper towels. Season both sides generously with coarse salt and freshly ground black pepper.', timerMinutes: null, timerLabel: null },
        { text: 'Let the steaks rest at room temperature for 30 minutes before cooking — this ensures even cooking throughout.', timerMinutes: 30, timerLabel: 'Steak resting' },
        { text: 'Place a cast iron skillet over high heat and let it get smoking hot. Add the neutral oil and swirl to coat.', timerMinutes: null, timerLabel: null },
        { text: 'Lay the steaks in the pan. Sear without moving for exactly 3 minutes, then flip and sear the other side for 3 more minutes.', timerMinutes: 3, timerLabel: 'Sear — first side' },
        { text: 'Reduce the heat to medium. Add the butter, crushed garlic, and rosemary. Tilt the pan and baste the steak continuously with the foaming butter for 2 minutes.', timerMinutes: 2, timerLabel: 'Butter basting' },
        { text: 'Transfer the steaks to a cutting board and let them rest for 5 minutes — this keeps the juices inside the meat.', timerMinutes: 5, timerLabel: 'Final rest' },
        { text: 'Slice against the grain, arrange on a plate, and spoon over any remaining pan juices. Serve immediately.', timerMinutes: null, timerLabel: null },
      ],
      nutrition: { calories: 680, protein: 62, carbs: 2, fat: 48 },
    },
  },

  // ─── 1: Pasta Carbonara (EN, YouTube) ─────────────────────────────────────
  {
    language: 'en',
    metadata: {
      title:        'Real Pasta Carbonara | Creamy Without Cream',
      description:  'The authentic Roman carbonara — eggs, guanciale, Pecorino, and a splash of pasta water. No cream needed.',
      creatorCaption: 'guanciale eggs pecorino pasta water toss off the heat silky sauce',
      hashtags:     ['#pasta', '#carbonara', '#italian', '#authentic'],
      durationSec:  214,
    },
    transcript: {
      available:  true,
      language:   'en',
      confidence: 0.89,
      wordCount:  162,
      source:     'youtube_captions',
      text: `Start by boiling a large pot of salted water. Cook 400 grams of spaghetti until just al dente.
While the pasta cooks, cut 150 grams of guanciale into small cubes and fry in a dry pan over medium heat until crispy.
In a bowl, whisk together 4 egg yolks and 1 whole egg with 80 grams of finely grated Pecorino Romano and a generous amount of black pepper.
When the pasta is ready, reserve a full cup of starchy pasta water before draining.
Remove the pan from the heat. Add the drained pasta directly to the guanciale and toss quickly.
Pour the egg and cheese mixture over the pasta and toss vigorously, adding pasta water a little at a time to create a smooth, creamy sauce.
The heat of the pasta cooks the eggs — work quickly and keep tossing. Season with extra black pepper and serve immediately.`,
    },
    ocr: {
      language:      'en',
      framesScanned: 11,
      detectedFrames: [
        { timestamp: 6,   text: 'Spaghetti 400g' },
        { timestamp: 19,  text: 'Guanciale 150g — cubed' },
        { timestamp: 38,  text: 'Pecorino Romano — finely grated' },
        { timestamp: 55,  text: '4 egg yolks + 1 whole egg' },
        { timestamp: 70,  text: 'Black pepper — be generous' },
        { timestamp: 95,  text: 'Reserve 1 cup pasta water' },
        { timestamp: 122, text: 'Off the heat — toss fast' },
        { timestamp: 148, text: 'Add pasta water gradually' },
        { timestamp: 190, text: 'Serve immediately' },
      ],
    },
    frames: {
      framesAnalyzed: 10,
      confidence:     0.92,
      dishType:       'Creamy pasta carbonara',
      ingredients:    ['spaghetti', 'guanciale', 'eggs', 'pecorino romano', 'black pepper', 'pasta water'],
      cookingActions: ['boiling', 'frying', 'whisking', 'tossing', 'emulsifying'],
      tools:          ['large pot', 'frying pan', 'mixing bowl', 'whisk', 'tongs'],
      frameDescriptions: [
        'Boiling water in a large pot with spaghetti added',
        'Guanciale cubes sizzling in a dry pan until golden',
        'Egg yolks and Pecorino being whisked in a bowl',
        'Creamy yellow egg-cheese mixture with coarse black pepper',
        'Starchy pasta water scooped into a measuring cup',
        'Drained spaghetti tossed directly with crispy guanciale',
        'Egg mixture poured over pasta off the heat',
        'Pasta tossed rapidly — silky sauce forming',
        'Finished carbonara plated with extra Pecorino and pepper',
        'Close-up of glossy sauce coating each strand of spaghetti',
      ],
    },
    recipe: {
      title:    'Classic Pasta Carbonara',
      emoji:    '🍝',
      servings: 2,
      ingredients: [
        '400 g spaghetti',
        '150 g guanciale (or pancetta), cut into cubes',
        '4 egg yolks + 1 whole egg',
        '80 g Pecorino Romano, finely grated',
        'Freshly ground black pepper, to taste',
        'Salt, for pasta water',
      ],
      inferredIngredients: [
        'Extra Pecorino Romano for serving (amount unclear)',
        'Olive oil (seen on counter, use uncertain)',
      ],
      steps: [
        { text: 'Bring a large pot of heavily salted water to a boil. Add the spaghetti and cook until just al dente (1 minute less than the packet says).', timerMinutes: null, timerLabel: null },
        { text: 'While pasta cooks, fry the guanciale cubes in a dry pan over medium heat until crispy and golden. Remove from heat and set aside.', timerMinutes: null, timerLabel: null },
        { text: 'Whisk together the egg yolks, whole egg, and finely grated Pecorino in a bowl. Add a very generous amount of cracked black pepper.', timerMinutes: null, timerLabel: null },
        { text: 'Before draining, ladle out at least 1 full cup of starchy pasta water and set aside — essential for the sauce.', timerMinutes: null, timerLabel: null },
        { text: 'Drain the pasta and immediately toss it in the pan with the guanciale off the heat. Let it cool for 30 seconds — the pan must not be too hot or the eggs will scramble.', timerMinutes: null, timerLabel: null },
        { text: 'Pour the egg-cheese mixture over the pasta. Toss quickly and vigorously, adding pasta water a splash at a time until a smooth, glossy sauce coats every strand.', timerMinutes: null, timerLabel: null },
        { text: 'Plate immediately, topped with extra grated Pecorino and more cracked black pepper. Serve at once.', timerMinutes: null, timerLabel: null },
      ],
      nutrition: { calories: 720, protein: 34, carbs: 88, fat: 26 },
    },
  },

  // ─── 2: Honey Garlic Chicken Thighs (EN, TikTok) ──────────────────────────
  {
    language: 'en',
    metadata: {
      title:        'Sticky Honey Garlic Chicken Thighs — 30 Minutes',
      description:  'Crispy chicken thighs glazed in a sticky honey garlic soy sauce. One pan, weeknight dinner.',
      creatorCaption: 'sear chicken skin side down honey garlic soy sauce glaze reduce',
      hashtags:     ['#chicken', '#honeygarlic', '#weeknightdinner', '#onepan'],
      durationSec:  198,
    },
    transcript: {
      available:  true,
      language:   'en',
      confidence: 0.93,
      wordCount:  134,
      source:     'whisper_stt',
      text: `Pat 4 bone-in chicken thighs completely dry and season both sides with salt and pepper.
Heat a large oven-safe skillet over medium-high heat. Add a tablespoon of oil.
Place the chicken skin-side down in the pan. Do not move it. Sear for 8 minutes until the skin is deeply golden and crispy.
Flip the thighs. Reduce the heat to medium.
Add 5 cloves of minced garlic to the pan and cook for 30 seconds until fragrant.
Pour in 3 tablespoons of honey, 2 tablespoons of soy sauce, and 1 tablespoon of apple cider vinegar.
Stir to combine. The sauce will bubble up and start to thicken.
Spoon the glaze over the chicken. Transfer to a 200°C oven and bake for 15 minutes until cooked through.
Rest for 3 minutes, then spoon over the remaining pan sauce and serve.`,
    },
    ocr: {
      language:      'en',
      framesScanned: 12,
      detectedFrames: [
        { timestamp: 8,   text: '4 chicken thighs — bone-in, skin-on' },
        { timestamp: 22,  text: 'Salt & Pepper both sides' },
        { timestamp: 45,  text: 'Sear skin-side down — 8 min' },
        { timestamp: 68,  text: '5 cloves garlic — minced' },
        { timestamp: 82,  text: '3 tbsp Honey + 2 tbsp Soy Sauce + 1 tbsp Apple Cider Vinegar' },
        { timestamp: 105, text: 'Bake 200°C / 390°F — 15 min' },
        { timestamp: 132, text: 'Rest 3 min before serving' },
        { timestamp: 168, text: 'Spoon pan sauce over chicken' },
      ],
    },
    frames: {
      framesAnalyzed: 10,
      confidence:     0.93,
      dishType:       'Honey garlic chicken thighs',
      ingredients:    ['chicken thighs', 'honey', 'soy sauce', 'garlic', 'apple cider vinegar', 'oil', 'salt', 'pepper'],
      cookingActions: ['patting dry', 'seasoning', 'searing', 'glazing', 'baking', 'resting'],
      tools:          ['oven-safe skillet', 'tongs', 'spoon', 'oven'],
      frameDescriptions: [
        'Raw bone-in chicken thighs patted dry with paper towels',
        'Chicken placed skin-side down in hot oiled skillet',
        'Deep golden crispy skin after 8 minutes of searing',
        'Minced garlic sizzling in rendered chicken fat',
        'Honey, soy sauce, and vinegar poured into pan',
        'Thick glossy amber glaze bubbling around the chicken',
        'Pan transferred to oven — thighs spooned in glaze',
        'Cooked chicken pulled from oven — sticky caramelised skin',
        'Pan sauce spooned over finished thighs on plate',
        'Plated chicken with sticky glaze and herbs over steamed rice',
      ],
    },
    recipe: {
      title:    'Sticky Honey Garlic Chicken Thighs',
      emoji:    '🍗',
      servings: 2,
      ingredients: [
        '4 bone-in, skin-on chicken thighs',
        '1 tbsp neutral oil',
        '5 cloves garlic, minced',
        '3 tbsp honey',
        '2 tbsp soy sauce',
        '1 tbsp apple cider vinegar',
        'Salt and black pepper, to taste',
      ],
      inferredIngredients: [
        'Steamed rice (shown in plating shot, not in recipe steps)',
        'Fresh parsley or chives for garnish (visible on finished dish)',
      ],
      steps: [
        { text: 'Pat the chicken thighs completely dry with paper towels. Season both sides generously with salt and black pepper.', timerMinutes: null, timerLabel: null },
        { text: 'Heat an oven-safe skillet over medium-high heat. Add the oil. Place chicken skin-side down and sear without moving for 8 minutes until deeply golden and crispy.', timerMinutes: 8, timerLabel: 'Sear skin-side down' },
        { text: 'Flip the thighs. Reduce heat to medium. Add the minced garlic and cook for 30 seconds until fragrant.', timerMinutes: null, timerLabel: null },
        { text: 'Pour in the honey, soy sauce, and apple cider vinegar. Stir to combine and let the sauce bubble and thicken for 1 minute, spooning it over the chicken.', timerMinutes: null, timerLabel: null },
        { text: 'Transfer the skillet to a 200 °C (390 °F) oven. Bake for 15 minutes until the chicken is cooked through and the glaze is caramelised.', timerMinutes: 15, timerLabel: 'Bake in oven' },
        { text: 'Remove from the oven and rest for 3 minutes. Spoon the pan sauce over the chicken and serve immediately.', timerMinutes: 3, timerLabel: 'Final rest' },
      ],
      nutrition: { calories: 520, protein: 44, carbs: 28, fat: 26 },
    },
  },

  // ─── 3: Chicken Kabsa / كبسة دجاج (AR, YouTube) ── multi-language demo ────
  {
    language: 'ar',
    metadata: {
      // Bilingual title common on YouTube Arabic cooking channels
      title:        'كبسة دجاج سعودية أصيلة | Saudi Chicken Kabsa',
      description:  'وصفة كبسة الدجاج الأصيلة بالتوابل السعودية. طريقة سهلة وممتازة. Authentic Saudi chicken kabsa with traditional spices.',
      creatorCaption: 'كبسة دجاج أرز بسمتي هيل قرفة زعفران',
      hashtags:     ['#كبسة', '#طبخ', '#مطبخسعودي', '#kabsa', '#arabicfood'],
      durationSec:  312,
    },
    transcript: {
      available:  true,
      language:   'ar',
      confidence: 0.88,
      wordCount:  198,
      source:     'youtube_captions',
      // Original Arabic transcript — the AI extraction step normalises this to English
      text: `نبدأ بتحضير الدجاج. نقطّع دجاجة كاملة إلى أربع قطع ونغسلها جيداً.
في قدر كبير على نار متوسطة، نضع ثلاث ملاعق كبيرة من الزيت.
نضيف بصلتين مقطعتين ونقلّبهما حتى يذبلا ويصبحا ذهبيتين.
نضيف بعدها أربع فصوص ثوم مهروسة ونقلّب دقيقة واحدة.
نضع قطع الدجاج ونحمّرها من كل الجهات حتى تأخذ لوناً ذهبياً.
نضيف الطماطم المبشورة والتوابل: ملعقة صغيرة كمون، ملعقة كركم، نصف ملعقة قرفة، ربع ملعقة هيل.
نضيف الماء الساخن بما يكفي لتغطية الدجاج ونتركه يغلي على نار هادئة لمدة أربعين دقيقة.
نأخذ المرق ونطبخ فيه الأرز البسمتي المنقوع مسبقاً مع خيوط الزعفران.
نضع الأرز فوق الدجاج في القدر ونغطيه ونتركه على نار خفيفة جداً عشرين دقيقة.
يُقدَّم الكبسة في صحن كبير مع الدجاج فوق الأرز، ويُزيَّن بالمكسرات المقلية والزبيب.`,
    },
    ocr: {
      language:      'ar',
      framesScanned: 13,
      detectedFrames: [
        { timestamp: 10,  text: 'دجاجة كاملة — ١ كيلو' },
        { timestamp: 25,  text: '٢ بصل + ٤ فصوص ثوم' },
        { timestamp: 40,  text: 'كمون | كركم | قرفة | هيل' },
        { timestamp: 65,  text: '٢ طماطم مبشورة' },
        { timestamp: 90,  text: 'يغلي ٤٠ دقيقة' },          // "boil 40 min"
        { timestamp: 120, text: '٢ كوب أرز بسمتي — منقوع ٣٠ دقيقة' },
        { timestamp: 150, text: 'زعفران + ماء دافئ' },
        { timestamp: 185, text: 'نار خفيفة — ٢٠ دقيقة' },   // "low heat 20 min"
        { timestamp: 220, text: 'مكسرات + زبيب للتقديم' },   // "nuts + raisins for serving"
        { timestamp: 290, text: 'Serves 4 | كافي لـ ٤ أشخاص' },
      ],
    },
    frames: {
      framesAnalyzed: 11,
      confidence:     0.91,
      // Frame descriptions are always in English (AI vision output)
      dishType:       'Saudi spiced rice with whole chicken (kabsa)',
      ingredients:    ['whole chicken', 'basmati rice', 'onions', 'garlic', 'tomatoes', 'spices', 'saffron', 'oil', 'nuts', 'raisins'],
      cookingActions: ['cutting', 'frying onions', 'browning chicken', 'simmering broth', 'cooking rice in broth', 'garnishing'],
      tools:          ['large deep pot', 'wooden spoon', 'ladle', 'large serving platter'],
      frameDescriptions: [
        'Whole chicken cut into quarters on a large cutting board',
        'Onions and garlic frying in oil until deep golden',
        'Chicken pieces browning in the pot — golden skin',
        'Grated tomatoes and whole spices (cardamom pods, cinnamon stick, cumin) added to pot',
        'Simmering chicken in spiced broth — aromatic steam visible',
        'Saffron threads dissolving in a small cup of warm water',
        'Soaked basmati rice added to golden broth in the pot',
        'Pot covered tightly — steam escaping from edges',
        'Fluffy long-grain rice opened — each grain separated',
        'Large platter with yellow rice, whole roasted chicken on top',
        'Dish garnished with fried pine nuts, almonds, and golden raisins',
      ],
    },
    // Recipe is normalised to English regardless of source language
    recipe: {
      title:    'Saudi Chicken Kabsa (كبسة دجاج)',
      emoji:    '🍚',
      servings: 4,
      // Source language noted in comments; app displays English
      ingredients: [
        '1 whole chicken (approx. 1.2 kg), cut into quarters',
        '2 cups basmati rice, soaked for 30 minutes',
        '2 medium onions, finely diced',
        '4 cloves garlic, minced',
        '2 tomatoes, grated or blended',
        '3 tbsp vegetable oil',
        '1 tsp ground cumin',
        '1 tsp ground turmeric',
        '½ tsp ground cinnamon',
        '¼ tsp ground cardamom',
        'Large pinch of saffron threads, dissolved in 2 tbsp warm water',
        'Salt, to taste',
        '4 cups hot water (for the broth)',
      ],
      inferredIngredients: [
        'Fried pine nuts and almonds (seen in garnish, amounts unclear)',
        'Golden raisins for garnish (visible in plating shot)',
        'Bay leaves (seen briefly in spice prep)',
      ],
      steps: [
        { text: 'Wash and pat dry the chicken pieces. Season generously with salt.', timerMinutes: null, timerLabel: null },
        { text: 'Heat the oil in a large deep pot over medium heat. Add the diced onions and fry, stirring occasionally, until deep golden — about 10 minutes.', timerMinutes: 10, timerLabel: 'Fry onions' },
        { text: 'Add the minced garlic and cook for 1 minute until fragrant. Add the chicken pieces and brown on all sides until golden.', timerMinutes: null, timerLabel: null },
        { text: 'Add the grated tomatoes, cumin, turmeric, cinnamon, and cardamom. Stir to coat the chicken. Add 4 cups of hot water and bring to a boil.', timerMinutes: null, timerLabel: null },
        { text: 'Reduce heat to low, cover, and simmer for 40 minutes until the chicken is fully cooked and tender.', timerMinutes: 40, timerLabel: 'Simmer chicken' },
        { text: 'Remove the chicken. Measure out 3 cups of the spiced broth and return it to the pot. Drain the soaked rice and add it to the broth with the saffron water.', timerMinutes: null, timerLabel: null },
        { text: 'Bring to a boil, stir once, then reduce heat to the lowest setting. Place the chicken pieces on top of the rice. Cover tightly and cook for 20 minutes.', timerMinutes: 20, timerLabel: 'Steam rice' },
        { text: 'Remove from heat and let rest, covered, for 5 minutes. Fluff the rice gently and transfer to a large serving platter. Arrange the chicken on top and garnish with fried nuts and raisins.', timerMinutes: 5, timerLabel: 'Rest before serving' },
      ],
      nutrition: { calories: 610, protein: 48, carbs: 62, fat: 18 },
    },
  },
];
