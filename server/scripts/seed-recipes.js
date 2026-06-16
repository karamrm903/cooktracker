// Seeds 20 curated recipes as global (user_id IS NULL) rows and uploads a
// matching Pexels photo into the private `images` bucket for each one.
//
// Usage:  node scripts/seed-recipes.js
//
// Idempotent — recipes are matched by title before insert. Re-running updates
// the recipe ingredients/steps/details to high-quality values while preserving
// any already uploaded image.

import 'dotenv/config';
import { adminClient } from '../db/client.js';
import { fetchPexelsPhoto, uploadRecipeImage } from '../utils/images.js';

const RECIPES = [
  {
    title: 'Avocado Toast',
    emoji: '🥑',
    calories: 320,
    protein: 9,
    carbs: 35,
    fat: 18,
    category: 'breakfast',
    time: '10 min',
    difficulty: 'Easy',
    estimatedGrams: 220,
    ingredients: [
      "2 slices sourdough bread",
      "1 ripe avocado",
      "1 tbsp extra virgin olive oil",
      "1/2 tsp red pepper flakes",
      "1 pinch coarse salt",
      "1 pinch black pepper",
      "1 wedge lemon"
    ],
    steps: [
      { text: "Toast the sourdough bread slices in a toaster or on a pan until golden brown and crisp.", timerMinutes: 3, timerLabel: "Toast bread" },
      { text: "Cut open the avocado, discard the pit, scoop the flesh into a bowl, and mash with a fork.", timerMinutes: null, timerLabel: null },
      { text: "Stir in a squeeze of fresh lemon juice, a pinch of salt, and freshly cracked black pepper.", timerMinutes: null, timerLabel: null },
      { text: "Spread the mashed avocado evenly across the toasted sourdough slices.", timerMinutes: null, timerLabel: null },
      { text: "Drizzle with extra virgin olive oil and sprinkle with red pepper flakes before serving.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Berry Pancakes',
    emoji: '🥞',
    calories: 480,
    protein: 12,
    carbs: 65,
    fat: 18,
    category: 'breakfast',
    time: '20 min',
    difficulty: 'Easy',
    estimatedGrams: 350,
    ingredients: [
      "120g all-purpose flour",
      "2 tbsp sugar",
      "1 tsp baking powder",
      "1/2 tsp baking soda",
      "150ml buttermilk",
      "1 large egg",
      "30g butter, melted",
      "100g fresh mixed berries (blueberries, raspberries)",
      "2 tbsp maple syrup"
    ],
    steps: [
      { text: "In a large bowl, whisk together the flour, sugar, baking powder, baking soda, and a pinch of salt.", timerMinutes: null, timerLabel: null },
      { text: "In another bowl, whisk the egg, buttermilk, and melted butter, then gently stir into the dry ingredients until just combined.", timerMinutes: null, timerLabel: null },
      { text: "Heat a non-stick skillet over medium heat and grease lightly with a little butter or oil.", timerMinutes: null, timerLabel: null },
      { text: "Pour batter onto the skillet, drop a few fresh berries onto each pancake, and cook until bubbles pop on the surface.", timerMinutes: 3, timerLabel: "Cook first side" },
      { text: "Flip and cook the other side until golden brown, then serve warm topped with remaining berries and maple syrup.", timerMinutes: 2, timerLabel: "Cook second side" }
    ]
  },
  {
    title: 'Greek Yogurt Parfait',
    emoji: '🍦',
    calories: 280,
    protein: 18,
    carbs: 38,
    fat: 6,
    category: 'breakfast',
    time: '5 min',
    difficulty: 'Easy',
    estimatedGrams: 300,
    ingredients: [
      "200g Greek yogurt",
      "50g granola",
      "80g fresh berries",
      "1 tbsp honey",
      "1 pinch chia seeds"
    ],
    steps: [
      { text: "Spoon half of the Greek yogurt into the bottom of a glass or bowl.", timerMinutes: null, timerLabel: null },
      { text: "Add a layer of granola and half of the fresh berries.", timerMinutes: null, timerLabel: null },
      { text: "Spoon the remaining Greek yogurt over the berry layer.", timerMinutes: null, timerLabel: null },
      { text: "Top with the rest of the granola, berries, and sprinkle chia seeds.", timerMinutes: null, timerLabel: null },
      { text: "Drizzle honey over the top and serve immediately.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Veggie Omelette',
    emoji: '🍳',
    calories: 350,
    protein: 22,
    carbs: 8,
    fat: 26,
    category: 'breakfast',
    time: '12 min',
    difficulty: 'Easy',
    estimatedGrams: 280,
    ingredients: [
      "3 large eggs",
      "30g bell peppers, diced",
      "30g onions, diced",
      "30g spinach leaves",
      "20g shredded cheddar cheese",
      "1 tbsp butter",
      "Salt and pepper to taste"
    ],
    steps: [
      { text: "Whisk the eggs in a bowl with a pinch of salt and pepper until fully combined and slightly frothy.", timerMinutes: null, timerLabel: null },
      { text: "Melt butter in a non-stick skillet over medium-high heat. Add diced peppers and onions, cooking until soft.", timerMinutes: 3, timerLabel: "Sauté veggies" },
      { text: "Add the spinach to the skillet and stir until just wilted, then lower heat to medium.", timerMinutes: 1, timerLabel: "Wilt spinach" },
      { text: "Pour the whisked eggs over the vegetables, tilting the pan to cover the surface. Cook until the edges start to set.", timerMinutes: 2, timerLabel: "Cook omelette base" },
      { text: "Sprinkle cheese on one half, fold the omelette over, and let cook for another minute until cheese is melted.", timerMinutes: 1, timerLabel: "Melt cheese" }
    ]
  },
  {
    title: 'Chicken Caesar Salad',
    emoji: '🥗',
    calories: 520,
    protein: 38,
    carbs: 22,
    fat: 30,
    category: 'lunch',
    time: '15 min',
    difficulty: 'Easy',
    estimatedGrams: 380,
    ingredients: [
      "150g chicken breast",
      "1 head romaine lettuce, chopped",
      "30g croutons",
      "20g parmesan cheese, shaved",
      "2 tbsp Caesar dressing",
      "1 tbsp olive oil",
      "1/2 tsp garlic powder",
      "Salt and pepper to taste"
    ],
    steps: [
      { text: "Season the chicken breast with garlic powder, salt, and pepper on both sides.", timerMinutes: null, timerLabel: null },
      { text: "Heat olive oil in a pan over medium-high heat, add the chicken, and cook until cooked through (internal temp 74°C).", timerMinutes: 10, timerLabel: "Sear chicken" },
      { text: "Remove chicken from the pan, let it rest for 5 minutes, then slice into strips.", timerMinutes: 5, timerLabel: "Rest chicken" },
      { text: "In a large bowl, toss the chopped romaine lettuce with Caesar dressing, croutons, and parmesan cheese.", timerMinutes: null, timerLabel: null },
      { text: "Top the dressed salad with the sliced chicken breast and serve immediately.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Quinoa Buddha Bowl',
    emoji: '🥙',
    calories: 540,
    protein: 18,
    carbs: 72,
    fat: 20,
    category: 'lunch',
    time: '25 min',
    difficulty: 'Medium',
    estimatedGrams: 450,
    ingredients: [
      "100g quinoa",
      "80g canned chickpeas, rinsed",
      "50g cucumber, sliced",
      "50g cherry tomatoes, halved",
      "40g shredded carrots",
      "1/2 avocado, sliced",
      "2 tbsp tahini dressing",
      "1 tbsp olive oil",
      "1/2 tsp cumin",
      "Salt and pepper to taste"
    ],
    steps: [
      { text: "Rinse quinoa and cook in water or vegetable broth according to package instructions (about 15 minutes).", timerMinutes: 15, timerLabel: "Cook quinoa" },
      { text: "In a small pan, toss chickpeas with olive oil, cumin, salt, and pepper, heating until slightly crispy.", timerMinutes: 5, timerLabel: "Warm chickpeas" },
      { text: "Divide the cooked quinoa into serving bowls as the base.", timerMinutes: null, timerLabel: null },
      { text: "Arrange the spiced chickpeas, cucumber, cherry tomatoes, carrots, and avocado slices neatly on top of the quinoa.", timerMinutes: null, timerLabel: null },
      { text: "Drizzle the tahini dressing over the bowl and serve warm or at room temperature.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Turkey Wrap',
    emoji: '🌯',
    calories: 460,
    protein: 28,
    carbs: 48,
    fat: 16,
    category: 'lunch',
    time: '10 min',
    difficulty: 'Easy',
    estimatedGrams: 350,
    ingredients: [
      "1 large whole wheat tortilla",
      "100g sliced turkey breast",
      "2 slices Swiss cheese",
      "3-4 spinach leaves",
      "3 slices tomato",
      "1 tbsp mayonnaise",
      "1 tsp dijon mustard"
    ],
    steps: [
      { text: "Lay the tortilla flat on a clean surface or cutting board.", timerMinutes: null, timerLabel: null },
      { text: "Spread the mayonnaise and dijon mustard evenly across the middle of the tortilla.", timerMinutes: null, timerLabel: null },
      { text: "Layer the turkey breast slices, Swiss cheese, tomato slices, and fresh spinach leaves in the center.", timerMinutes: null, timerLabel: null },
      { text: "Fold in the sides of the tortilla, then roll up tightly from the bottom to form a wrap.", timerMinutes: null, timerLabel: null },
      { text: "Cut diagonally in half and serve.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Tomato Basil Soup',
    emoji: '🍅',
    calories: 280,
    protein: 8,
    carbs: 32,
    fat: 14,
    category: 'lunch',
    time: '30 min',
    difficulty: 'Easy',
    estimatedGrams: 450,
    ingredients: [
      "400g canned crushed tomatoes",
      "1/2 medium onion, diced",
      "2 cloves garlic, minced",
      "250ml vegetable broth",
      "50ml heavy cream",
      "10g fresh basil leaves, chopped",
      "1 tbsp olive oil",
      "Salt and pepper to taste"
    ],
    steps: [
      { text: "Heat olive oil in a pot over medium heat. Add onion and garlic, cooking until translucent.", timerMinutes: 5, timerLabel: "Sauté onion/garlic" },
      { text: "Pour in the crushed tomatoes and vegetable broth, bringing to a simmer. Cook for 15 minutes to let flavors meld.", timerMinutes: 15, timerLabel: "Simmer soup" },
      { text: "Stir in the fresh basil leaves, then blend the soup until smooth using an immersion blender.", timerMinutes: null, timerLabel: null },
      { text: "Return to low heat, stir in the heavy cream, and season with salt and pepper to taste.", timerMinutes: 2, timerLabel: "Finish soup" },
      { text: "Ladle into bowls and serve warm, optionally garnished with a basil leaf.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Margherita Pizza',
    emoji: '🍕',
    calories: 680,
    protein: 26,
    carbs: 78,
    fat: 28,
    category: 'dinner',
    time: '40 min',
    difficulty: 'Medium',
    estimatedGrams: 420,
    ingredients: [
      "200g pizza dough",
      "80ml marinara or tomato sauce",
      "100g fresh mozzarella cheese, sliced",
      "5-6 fresh basil leaves",
      "1 tbsp extra virgin olive oil",
      "1 pinch salt"
    ],
    steps: [
      { text: "Preheat oven to 230°C (450°F) and stretch out the pizza dough onto a lightly oiled baking sheet.", timerMinutes: 10, timerLabel: "Preheat & stretch dough" },
      { text: "Spread the tomato sauce evenly over the dough, leaving a small border for the crust.", timerMinutes: null, timerLabel: null },
      { text: "Distribute the fresh mozzarella cheese slices evenly across the sauce.", timerMinutes: null, timerLabel: null },
      { text: "Bake in the preheated oven until the crust is golden and the cheese is bubbly and slightly browned.", timerMinutes: 12, timerLabel: "Bake pizza" },
      { text: "Top with fresh basil leaves, drizzle with extra virgin olive oil, sprinkle with a pinch of salt, and slice.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Spaghetti Carbonara',
    emoji: '🍝',
    calories: 720,
    protein: 28,
    carbs: 82,
    fat: 30,
    category: 'dinner',
    time: '25 min',
    difficulty: 'Medium',
    estimatedGrams: 380,
    ingredients: [
      "200g spaghetti",
      "80g pancetta or guanciale, diced",
      "2 large eggs",
      "40g Pecorino Romano cheese, grated",
      "2 cloves garlic, crushed (optional)",
      "Freshly cracked black pepper",
      "Salt for pasta water"
    ],
    steps: [
      { text: "Bring a large pot of salted water to a boil, add spaghetti, and cook until al dente.", timerMinutes: 9, timerLabel: "Boil pasta" },
      { text: "Meanwhile, cook the pancetta with the garlic in a large skillet over medium heat until crispy, then remove garlic.", timerMinutes: 6, timerLabel: "Cook pancetta" },
      { text: "In a bowl, whisk eggs, grated Pecorino Romano, and a generous amount of black pepper together.", timerMinutes: null, timerLabel: null },
      { text: "Drain the pasta, reserving 1/2 cup of pasta water, and add the hot pasta directly to the skillet with pancetta, tossing to coat.", timerMinutes: null, timerLabel: null },
      { text: "Remove skillet from heat, pour in the egg and cheese mixture, and toss rapidly to create a creamy sauce, adding pasta water if needed.", timerMinutes: 1, timerLabel: "Mix carbonara" }
    ]
  },
  {
    title: 'Grilled Salmon Bowl',
    emoji: '🐟',
    calories: 580,
    protein: 42,
    carbs: 48,
    fat: 22,
    category: 'dinner',
    time: '30 min',
    difficulty: 'Medium',
    estimatedGrams: 420,
    ingredients: [
      "150g salmon fillet",
      "100g cooked brown rice",
      "50g edamame, shelled",
      "50g shredded purple cabbage",
      "1/2 cucumber, sliced",
      "1 tbsp soy sauce",
      "1 tsp sesame oil",
      "1 tsp sesame seeds",
      "1 tbsp olive oil",
      "Salt and pepper to taste"
    ],
    steps: [
      { text: "Season salmon fillet with salt, pepper, and a brush of olive oil.", timerMinutes: null, timerLabel: null },
      { text: "Heat a grill pan or skillet over medium-high heat. Sear the salmon skin-side down first, then flip and cook until flaky.", timerMinutes: 8, timerLabel: "Sear salmon" },
      { text: "Assemble the bowl by placing the warm cooked brown rice in the center.", timerMinutes: null, timerLabel: null },
      { text: "Arrange edamame, shredded cabbage, sliced cucumber, and the grilled salmon on top.", timerMinutes: null, timerLabel: null },
      { text: "Drizzle with soy sauce and sesame oil, and garnish with sesame seeds before serving.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Tofu Stir Fry',
    emoji: '🥡',
    calories: 420,
    protein: 18,
    carbs: 32,
    fat: 12,
    category: 'dinner',
    time: '20 min',
    difficulty: 'Easy',
    estimatedGrams: 380,
    ingredients: [
      "200g extra firm tofu, pressed and cubed",
      "100g broccoli florets",
      "50g carrots, julienned",
      "50g snap peas",
      "2 tbsp soy sauce",
      "1 tbsp sesame oil",
      "1 tbsp cornstarch",
      "2 cloves garlic, minced",
      "1 tsp ginger, minced",
      "1 tbsp vegetable oil"
    ],
    steps: [
      { text: "Toss tofu cubes in cornstarch until coated. Heat vegetable oil in a wok or large skillet over medium-high heat.", timerMinutes: null, timerLabel: null },
      { text: "Add tofu to the wok and cook until crispy and golden brown on all sides, then transfer to a plate.", timerMinutes: 8, timerLabel: "Fry tofu" },
      { text: "In the same wok, add a splash of oil if needed, and sauté garlic, ginger, broccoli, carrots, and snap peas until tender-crisp.", timerMinutes: 5, timerLabel: "Stir-fry veggies" },
      { text: "Return the tofu to the wok, pour in the soy sauce and sesame oil, and toss everything together until heated through.", timerMinutes: 2, timerLabel: "Combine & heat" },
      { text: "Serve warm, optionally over rice or noodles.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Chicken Tikka Masala',
    emoji: '🍛',
    calories: 680,
    protein: 36,
    carbs: 58,
    fat: 30,
    category: 'dinner',
    time: '45 min',
    difficulty: 'Medium',
    estimatedGrams: 450,
    ingredients: [
      "200g chicken breast, cubed",
      "120ml tomato puree",
      "60ml heavy cream",
      "50g plain yogurt",
      "1/2 onion, finely chopped",
      "2 cloves garlic, minced",
      "1 tbsp ginger, grated",
      "1 tbsp garam masala",
      "1 tsp turmeric",
      "1 tsp chili powder",
      "2 tbsp butter",
      "Salt to taste"
    ],
    steps: [
      { text: "Marinate chicken cubes in yogurt, turmeric, half the garam masala, and salt for at least 15 minutes.", timerMinutes: 15, timerLabel: "Marinate chicken" },
      { text: "Melt 1 tbsp butter in a large skillet over medium-high heat. Sear the chicken until browned, then set aside (it doesn't need to be fully cooked).", timerMinutes: 6, timerLabel: "Brown chicken" },
      { text: "Melt the remaining butter in the skillet. Sauté onion, garlic, and ginger until soft and fragrant.", timerMinutes: 4, timerLabel: "Sauté aromatics" },
      { text: "Add the remaining garam masala, chili powder, and tomato puree, stirring well. Simmer for 5 minutes.", timerMinutes: 5, timerLabel: "Simmer sauce" },
      { text: "Return chicken to the skillet, stir in the heavy cream, and simmer until the chicken is cooked through and sauce is thick.", timerMinutes: 8, timerLabel: "Finish curry" }
    ]
  },
  {
    title: 'Vegetable Curry',
    emoji: '🍲',
    calories: 480,
    protein: 14,
    carbs: 68,
    fat: 18,
    category: 'dinner',
    time: '35 min',
    difficulty: 'Easy',
    estimatedGrams: 450,
    ingredients: [
      "100g potatoes, cubed",
      "80g cauliflower florets",
      "50g carrots, sliced",
      "50g green peas",
      "200ml coconut milk",
      "1 tbsp yellow curry paste",
      "1/2 onion, chopped",
      "1 tbsp vegetable oil",
      "Salt and pepper to taste"
    ],
    steps: [
      { text: "Heat vegetable oil in a large pot over medium heat. Sauté the onion until translucent.", timerMinutes: 3, timerLabel: "Sauté onion" },
      { text: "Stir in the yellow curry paste and cook for 1 minute until fragrant.", timerMinutes: 1, timerLabel: "Cook curry paste" },
      { text: "Add the cubed potatoes, cauliflower, and carrots, tossing to coat in the curry paste.", timerMinutes: 2, timerLabel: "Add veggies" },
      { text: "Pour in the coconut milk, bring to a simmer, cover, and let cook until the potatoes are tender.", timerMinutes: 15, timerLabel: "Simmer curry" },
      { text: "Stir in the green peas, cook for another 2 minutes, season with salt and pepper, and serve.", timerMinutes: 2, timerLabel: "Finish curry" }
    ]
  },
  {
    title: 'Fish Tacos',
    emoji: '🌮',
    calories: 480,
    protein: 26,
    carbs: 42,
    fat: 16,
    category: 'dinner',
    time: '20 min',
    difficulty: 'Easy',
    estimatedGrams: 320,
    ingredients: [
      "200g white fish fillets (cod or tilapia)",
      "4 small corn tortillas",
      "50g shredded cabbage",
      "1 lime, cut into wedges",
      "2 tbsp sour cream or Greek yogurt",
      "1 tbsp mayonnaise",
      "1 tsp chili powder",
      "1/2 tsp cumin",
      "1 tbsp olive oil",
      "Salt and pepper to taste"
    ],
    steps: [
      { text: "Season the fish fillets with chili powder, cumin, salt, pepper, and olive oil.", timerMinutes: null, timerLabel: null },
      { text: "Heat a skillet over medium-high heat and sear the fish until cooked through and flakey, about 3-4 minutes per side.", timerMinutes: 7, timerLabel: "Cook fish" },
      { text: "While fish is cooking, whisk the sour cream, mayonnaise, a squeeze of lime juice, and a pinch of salt together for the sauce.", timerMinutes: null, timerLabel: null },
      { text: "Warm the corn tortillas in a dry skillet or microwave.", timerMinutes: 1, timerLabel: "Warm tortillas" },
      { text: "Flake the fish, divide it among the tortillas, top with cabbage, drizzle with sauce, and serve with lime wedges.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Sushi Platter',
    emoji: '🍣',
    calories: 460,
    protein: 22,
    carbs: 68,
    fat: 10,
    category: 'dinner',
    time: '60 min',
    difficulty: 'Hard',
    estimatedGrams: 400,
    ingredients: [
      "150g sushi rice, cooked and seasoned with rice vinegar",
      "2 sheets nori (seaweed)",
      "80g raw sushi-grade salmon or tuna, sliced into strips",
      "1/2 cucumber, julienned",
      "1/2 avocado, sliced into strips",
      "Soy sauce, wasabi, and pickled ginger for serving"
    ],
    steps: [
      { text: "Place a sheet of nori shiny-side down on a bamboo sushi rolling mat.", timerMinutes: null, timerLabel: null },
      { text: "Spread a thin, even layer of sushi rice over the nori, leaving a 1-inch border at the top.", timerMinutes: null, timerLabel: null },
      { text: "Arrange a line of salmon/tuna, cucumber, and avocado strips horizontally across the center of the rice.", timerMinutes: null, timerLabel: null },
      { text: "Roll the sushi tightly using the bamboo mat, wetting the top border of the nori slightly to seal the roll.", timerMinutes: null, timerLabel: null },
      { text: "Slice the roll into 8 equal pieces using a sharp, wet knife, and serve with soy sauce, wasabi, and ginger.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Caprese Salad',
    emoji: '🧀',
    calories: 320,
    protein: 16,
    carbs: 12,
    fat: 24,
    category: 'snack',
    time: '5 min',
    difficulty: 'Easy',
    estimatedGrams: 250,
    ingredients: [
      "2 large ripe tomatoes, sliced",
      "120g fresh mozzarella cheese, sliced",
      "10-12 fresh basil leaves",
      "2 tbsp extra virgin olive oil",
      "1 tbsp balsamic glaze",
      "Salt and freshly cracked black pepper to taste"
    ],
    steps: [
      { text: "Arrange alternating slices of tomato and fresh mozzarella cheese on a serving platter.", timerMinutes: null, timerLabel: null },
      { text: "Tuck fresh basil leaves between the tomato and mozzarella slices.", timerMinutes: null, timerLabel: null },
      { text: "Drizzle the extra virgin olive oil evenly over the salad.", timerMinutes: null, timerLabel: null },
      { text: "Drizzle the balsamic glaze over the top.", timerMinutes: null, timerLabel: null },
      { text: "Season generously with coarse salt and freshly cracked black pepper, then serve immediately.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Hummus Plate',
    emoji: '🫒',
    calories: 380,
    protein: 12,
    carbs: 38,
    fat: 22,
    category: 'snack',
    time: '5 min',
    difficulty: 'Easy',
    estimatedGrams: 220,
    ingredients: [
      "150g store-bought or homemade hummus",
      "1 whole pita bread, warmed and sliced into triangles",
      "1/2 cucumber, sliced",
      "50g kalamata olives",
      "1 tbsp extra virgin olive oil",
      "1/2 tsp paprika"
    ],
    steps: [
      { text: "Spread the hummus in a shallow bowl or plate, creating a small well in the center.", timerMinutes: null, timerLabel: null },
      { text: "Drizzle the extra virgin olive oil into the well of the hummus.", timerMinutes: null, timerLabel: null },
      { text: "Dust the hummus lightly with paprika for color and flavor.", timerMinutes: null, timerLabel: null },
      { text: "Arrange the sliced pita bread, cucumber slices, and kalamata olives around the plate.", timerMinutes: null, timerLabel: null },
      { text: "Serve at room temperature.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Chocolate Brownies',
    emoji: '🍫',
    calories: 380,
    protein: 5,
    carbs: 48,
    fat: 20,
    category: 'snack',
    time: '40 min',
    difficulty: 'Easy',
    estimatedGrams: 120,
    ingredients: [
      "100g butter, melted",
      "200g sugar",
      "2 large eggs",
      "1 tsp vanilla extract",
      "40g cocoa powder",
      "60g all-purpose flour",
      "1/4 tsp salt",
      "50g chocolate chips"
    ],
    steps: [
      { text: "Preheat oven to 175°C (350°F) and grease an 8-inch square baking pan or line it with parchment paper.", timerMinutes: 10, timerLabel: "Preheat oven" },
      { text: "In a bowl, whisk together melted butter and sugar. Add eggs and vanilla extract, whisking until well combined.", timerMinutes: null, timerLabel: null },
      { text: "Fold in the cocoa powder, flour, and salt until just combined (do not overmix). Gently fold in chocolate chips.", timerMinutes: null, timerLabel: null },
      { text: "Spread the batter evenly into the prepared baking pan.", timerMinutes: null, timerLabel: null },
      { text: "Bake for 20-22 minutes until a toothpick inserted in the center comes out with a few moist crumbs, then let cool before slicing.", timerMinutes: 22, timerLabel: "Bake brownies" }
    ]
  },
  {
    title: 'Fruit Smoothie Bowl',
    emoji: '🍓',
    calories: 320,
    protein: 10,
    carbs: 58,
    fat: 8,
    category: 'snack',
    time: '8 min',
    difficulty: 'Easy',
    estimatedGrams: 350,
    ingredients: [
      "150g frozen mixed berries",
      "1 banana",
      "120ml almond milk",
      "1 tbsp almond butter",
      "30g granola",
      "1 tbsp chia seeds",
      "50g fresh sliced fruit (strawberries, kiwi)"
    ],
    steps: [
      { text: "Add the frozen mixed berries, half of the banana, almond milk, and almond butter to a high-speed blender.", timerMinutes: null, timerLabel: null },
      { text: "Blend on high until completely smooth and thick, adding a splash more milk if needed to blend.", timerMinutes: 2, timerLabel: "Blend smoothie" },
      { text: "Pour the thick smoothie base into a serving bowl.", timerMinutes: null, timerLabel: null },
      { text: "Slice the remaining half of the banana.", timerMinutes: null, timerLabel: null },
      { text: "Arrange the banana slices, fresh sliced fruit, granola, and chia seeds in neat rows on top of the smoothie base and serve.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Overnight Oats',
    emoji: '🥣',
    calories: 360,
    protein: 14,
    carbs: 56,
    fat: 10,
    category: 'breakfast',
    time: '5 min',
    difficulty: 'Easy',
    estimatedGrams: 320,
    ingredients: [
      "60g rolled oats",
      "180ml milk of choice",
      "60g Greek yogurt",
      "1 tbsp chia seeds",
      "1 tbsp maple syrup",
      "1/2 tsp vanilla extract",
      "50g fresh berries"
    ],
    steps: [
      { text: "In a jar or container, combine rolled oats, milk, Greek yogurt, chia seeds, maple syrup, and vanilla.", timerMinutes: null, timerLabel: null },
      { text: "Stir thoroughly until everything is well incorporated and no dry oats remain.", timerMinutes: null, timerLabel: null },
      { text: "Seal the container and refrigerate for at least 4 hours or overnight to thicken.", timerMinutes: null, timerLabel: "Chill overnight" },
      { text: "In the morning, give the oats a stir, adding a splash of milk if too thick.", timerMinutes: null, timerLabel: null },
      { text: "Top with fresh berries and serve cold.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Breakfast Burrito',
    emoji: '🌯',
    calories: 540,
    protein: 24,
    carbs: 52,
    fat: 26,
    category: 'breakfast',
    time: '15 min',
    difficulty: 'Easy',
    estimatedGrams: 340,
    ingredients: [
      "1 large flour tortilla",
      "2 large eggs",
      "30g shredded cheddar cheese",
      "40g black beans, rinsed",
      "2 tbsp salsa",
      "1/4 avocado, sliced",
      "1 tbsp butter",
      "Salt and pepper to taste"
    ],
    steps: [
      { text: "Whisk the eggs in a bowl with salt and pepper.", timerMinutes: null, timerLabel: null },
      { text: "Melt butter in a non-stick skillet over medium heat and scramble the eggs until just set.", timerMinutes: 3, timerLabel: "Scramble eggs" },
      { text: "Warm the tortilla in a dry pan or microwave until pliable.", timerMinutes: 1, timerLabel: "Warm tortilla" },
      { text: "Layer the scrambled eggs, black beans, cheese, salsa, and avocado down the center of the tortilla.", timerMinutes: null, timerLabel: null },
      { text: "Fold in the sides, roll tightly from the bottom, and slice in half to serve.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'French Toast',
    emoji: '🍞',
    calories: 460,
    protein: 14,
    carbs: 56,
    fat: 20,
    category: 'breakfast',
    time: '15 min',
    difficulty: 'Easy',
    estimatedGrams: 280,
    ingredients: [
      "3 slices brioche or thick bread",
      "2 large eggs",
      "80ml milk",
      "1 tsp vanilla extract",
      "1/2 tsp ground cinnamon",
      "1 tbsp butter",
      "2 tbsp maple syrup",
      "1 pinch powdered sugar"
    ],
    steps: [
      { text: "Whisk eggs, milk, vanilla, and cinnamon together in a shallow dish.", timerMinutes: null, timerLabel: null },
      { text: "Dip each bread slice in the egg mixture, letting it soak for a few seconds per side.", timerMinutes: null, timerLabel: null },
      { text: "Melt butter in a non-stick skillet over medium heat.", timerMinutes: null, timerLabel: null },
      { text: "Cook each slice until golden brown on both sides, flipping once.", timerMinutes: 5, timerLabel: "Cook french toast" },
      { text: "Plate, dust with powdered sugar, and serve with maple syrup.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Banana Smoothie',
    emoji: '🍌',
    calories: 280,
    protein: 12,
    carbs: 48,
    fat: 6,
    category: 'breakfast',
    time: '5 min',
    difficulty: 'Easy',
    estimatedGrams: 350,
    ingredients: [
      "2 ripe bananas",
      "240ml milk of choice",
      "120g Greek yogurt",
      "1 tbsp honey",
      "1/2 tsp vanilla extract",
      "4 ice cubes"
    ],
    steps: [
      { text: "Peel the bananas and break them into chunks.", timerMinutes: null, timerLabel: null },
      { text: "Add bananas, milk, yogurt, honey, vanilla, and ice cubes to a blender.", timerMinutes: null, timerLabel: null },
      { text: "Blend on high until smooth and creamy.", timerMinutes: 1, timerLabel: "Blend" },
      { text: "Taste and adjust sweetness with more honey if needed.", timerMinutes: null, timerLabel: null },
      { text: "Pour into a glass and serve immediately.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Eggs Benedict',
    emoji: '🥚',
    calories: 580,
    protein: 28,
    carbs: 32,
    fat: 38,
    category: 'breakfast',
    time: '25 min',
    difficulty: 'Hard',
    estimatedGrams: 320,
    ingredients: [
      "2 English muffins, split",
      "4 slices Canadian bacon",
      "4 large eggs",
      "3 large egg yolks",
      "120g butter, melted",
      "1 tbsp lemon juice",
      "1 pinch cayenne pepper",
      "1 tbsp white vinegar",
      "Salt to taste"
    ],
    steps: [
      { text: "Whisk egg yolks with lemon juice in a heatproof bowl over simmering water until pale and thick.", timerMinutes: 3, timerLabel: "Whisk yolks" },
      { text: "Slowly drizzle in melted butter while whisking constantly to form a thick hollandaise. Season with salt and cayenne.", timerMinutes: 2, timerLabel: "Emulsify sauce" },
      { text: "Bring a pot of water to a gentle simmer with the vinegar. Crack each egg into a cup and slip into the water to poach.", timerMinutes: 3, timerLabel: "Poach eggs" },
      { text: "Toast the English muffins and warm the Canadian bacon in a dry skillet.", timerMinutes: 4, timerLabel: "Toast & warm bacon" },
      { text: "Top each muffin half with bacon, a drained poached egg, and a generous spoon of hollandaise.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Chia Pudding',
    emoji: '🌰',
    calories: 260,
    protein: 8,
    carbs: 30,
    fat: 12,
    category: 'breakfast',
    time: '5 min',
    difficulty: 'Easy',
    estimatedGrams: 280,
    ingredients: [
      "40g chia seeds",
      "240ml coconut milk",
      "1 tbsp maple syrup",
      "1/2 tsp vanilla extract",
      "50g fresh mango, diced",
      "20g shredded coconut"
    ],
    steps: [
      { text: "Whisk chia seeds, coconut milk, maple syrup, and vanilla together in a jar.", timerMinutes: null, timerLabel: null },
      { text: "Let sit for 5 minutes, then whisk again to break up any clumps.", timerMinutes: 5, timerLabel: "Initial rest" },
      { text: "Cover and refrigerate for at least 2 hours or overnight until set.", timerMinutes: null, timerLabel: "Chill to set" },
      { text: "Stir the pudding and spoon into serving glasses.", timerMinutes: null, timerLabel: null },
      { text: "Top with diced mango and shredded coconut and serve cold.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Cobb Salad',
    emoji: '🥬',
    calories: 560,
    protein: 36,
    carbs: 14,
    fat: 38,
    category: 'lunch',
    time: '20 min',
    difficulty: 'Easy',
    estimatedGrams: 420,
    ingredients: [
      "150g grilled chicken breast, sliced",
      "100g romaine lettuce, chopped",
      "2 strips bacon, cooked and crumbled",
      "1 hard-boiled egg, quartered",
      "1/2 avocado, sliced",
      "50g cherry tomatoes, halved",
      "30g blue cheese, crumbled",
      "2 tbsp red wine vinaigrette"
    ],
    steps: [
      { text: "Arrange the chopped romaine lettuce as the base of a wide serving bowl.", timerMinutes: null, timerLabel: null },
      { text: "Lay the grilled chicken, bacon, egg, avocado, tomatoes, and blue cheese in neat rows over the lettuce.", timerMinutes: null, timerLabel: null },
      { text: "Season lightly with salt and freshly cracked black pepper.", timerMinutes: null, timerLabel: null },
      { text: "Drizzle the red wine vinaigrette evenly over the salad just before serving.", timerMinutes: null, timerLabel: null },
      { text: "Toss tableside or leave composed and serve immediately.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'BLT Sandwich',
    emoji: '🥓',
    calories: 520,
    protein: 22,
    carbs: 38,
    fat: 30,
    category: 'lunch',
    time: '15 min',
    difficulty: 'Easy',
    estimatedGrams: 280,
    ingredients: [
      "4 strips thick-cut bacon",
      "2 slices sourdough bread, toasted",
      "2 leaves butter lettuce",
      "2 slices ripe tomato",
      "2 tbsp mayonnaise",
      "Salt and pepper to taste"
    ],
    steps: [
      { text: "Cook bacon in a skillet over medium heat until crisp, then drain on paper towels.", timerMinutes: 8, timerLabel: "Cook bacon" },
      { text: "Toast the sourdough bread until golden brown.", timerMinutes: 3, timerLabel: "Toast bread" },
      { text: "Spread mayonnaise on one side of each toasted slice.", timerMinutes: null, timerLabel: null },
      { text: "Layer lettuce, tomato slices, and bacon on one slice. Season the tomato with salt and pepper.", timerMinutes: null, timerLabel: null },
      { text: "Top with the second slice, slice diagonally, and serve.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Falafel Wrap',
    emoji: '🧆',
    calories: 520,
    protein: 18,
    carbs: 64,
    fat: 22,
    category: 'lunch',
    time: '20 min',
    difficulty: 'Medium',
    estimatedGrams: 380,
    ingredients: [
      "6 falafel balls (store-bought or homemade)",
      "1 large pita bread or wrap",
      "30g shredded lettuce",
      "30g cucumber, diced",
      "30g tomato, diced",
      "20g red onion, sliced",
      "2 tbsp tzatziki or tahini sauce",
      "1 tbsp olive oil"
    ],
    steps: [
      { text: "Heat olive oil in a skillet over medium-high heat and warm the falafel balls until crisp on the outside.", timerMinutes: 5, timerLabel: "Crisp falafel" },
      { text: "Warm the pita bread in a dry skillet or microwave until pliable.", timerMinutes: 1, timerLabel: "Warm pita" },
      { text: "Spread tzatziki or tahini sauce across the center of the pita.", timerMinutes: null, timerLabel: null },
      { text: "Layer lettuce, cucumber, tomato, and red onion over the sauce, then top with the warm falafel.", timerMinutes: null, timerLabel: null },
      { text: "Roll up tightly, slice in half, and serve immediately.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Chicken Noodle Soup',
    emoji: '🍜',
    calories: 320,
    protein: 24,
    carbs: 36,
    fat: 8,
    category: 'lunch',
    time: '40 min',
    difficulty: 'Easy',
    estimatedGrams: 500,
    ingredients: [
      "150g chicken breast, cubed",
      "100g egg noodles",
      "1 carrot, sliced",
      "1 celery stalk, sliced",
      "1/2 onion, diced",
      "2 cloves garlic, minced",
      "1L chicken broth",
      "1 tbsp olive oil",
      "1 tbsp fresh parsley, chopped",
      "Salt and pepper to taste"
    ],
    steps: [
      { text: "Heat olive oil in a large pot over medium heat. Sauté onion, carrot, celery, and garlic until softened.", timerMinutes: 5, timerLabel: "Sauté veggies" },
      { text: "Add the cubed chicken and cook until lightly browned on the outside.", timerMinutes: 4, timerLabel: "Brown chicken" },
      { text: "Pour in the chicken broth, bring to a boil, then reduce to a simmer.", timerMinutes: 5, timerLabel: "Bring to simmer" },
      { text: "Add egg noodles and cook until tender and chicken is cooked through.", timerMinutes: 10, timerLabel: "Cook noodles" },
      { text: "Season with salt, pepper, and stir in fresh parsley before serving.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Tuna Salad',
    emoji: '🐟',
    calories: 340,
    protein: 28,
    carbs: 12,
    fat: 20,
    category: 'lunch',
    time: '10 min',
    difficulty: 'Easy',
    estimatedGrams: 250,
    ingredients: [
      "1 can (140g) tuna, drained",
      "2 tbsp mayonnaise",
      "1 celery stalk, finely diced",
      "2 tbsp red onion, finely diced",
      "1 tbsp lemon juice",
      "1 tsp Dijon mustard",
      "2 leaves butter lettuce",
      "Salt and pepper to taste"
    ],
    steps: [
      { text: "Drain the tuna thoroughly and flake into a mixing bowl.", timerMinutes: null, timerLabel: null },
      { text: "Add mayonnaise, celery, red onion, lemon juice, and Dijon mustard.", timerMinutes: null, timerLabel: null },
      { text: "Mix gently until everything is combined but the tuna remains chunky.", timerMinutes: null, timerLabel: null },
      { text: "Season to taste with salt and freshly cracked black pepper.", timerMinutes: null, timerLabel: null },
      { text: "Scoop onto butter lettuce leaves or serve over toast and enjoy.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Vegetable Stir Fry',
    emoji: '🥦',
    calories: 360,
    protein: 12,
    carbs: 48,
    fat: 12,
    category: 'lunch',
    time: '15 min',
    difficulty: 'Easy',
    estimatedGrams: 380,
    ingredients: [
      "100g broccoli florets",
      "80g bell peppers, sliced",
      "60g snap peas",
      "60g carrots, julienned",
      "100g cooked jasmine rice",
      "2 tbsp soy sauce",
      "1 tbsp sesame oil",
      "1 tbsp vegetable oil",
      "2 cloves garlic, minced",
      "1 tsp ginger, grated",
      "1 tsp sesame seeds"
    ],
    steps: [
      { text: "Heat vegetable oil in a wok or large skillet over high heat until shimmering.", timerMinutes: null, timerLabel: null },
      { text: "Add garlic and ginger, stir-frying for 30 seconds until fragrant.", timerMinutes: 1, timerLabel: "Aromatics" },
      { text: "Add broccoli, peppers, carrots, and snap peas; stir-fry until tender-crisp.", timerMinutes: 5, timerLabel: "Stir-fry veggies" },
      { text: "Pour in soy sauce and sesame oil, tossing to coat all the vegetables.", timerMinutes: 1, timerLabel: "Sauce in" },
      { text: "Serve hot over jasmine rice and sprinkle with sesame seeds.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Pasta Primavera',
    emoji: '🍝',
    calories: 520,
    protein: 16,
    carbs: 78,
    fat: 16,
    category: 'lunch',
    time: '25 min',
    difficulty: 'Easy',
    estimatedGrams: 400,
    ingredients: [
      "200g penne pasta",
      "80g cherry tomatoes, halved",
      "60g zucchini, sliced",
      "60g yellow squash, sliced",
      "50g asparagus, cut into pieces",
      "2 tbsp olive oil",
      "2 cloves garlic, minced",
      "30g grated Parmesan cheese",
      "1 tbsp fresh basil, torn",
      "Salt and pepper to taste"
    ],
    steps: [
      { text: "Bring a large pot of salted water to a boil and cook penne until al dente.", timerMinutes: 10, timerLabel: "Boil pasta" },
      { text: "While pasta cooks, heat olive oil in a large skillet over medium heat. Sauté garlic until fragrant.", timerMinutes: 1, timerLabel: "Sauté garlic" },
      { text: "Add zucchini, yellow squash, and asparagus and cook until tender-crisp.", timerMinutes: 5, timerLabel: "Cook veggies" },
      { text: "Stir in cherry tomatoes and cook just until they begin to burst.", timerMinutes: 2, timerLabel: "Burst tomatoes" },
      { text: "Drain pasta, toss with veggies, Parmesan, and basil. Season and serve warm.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Beef Stroganoff',
    emoji: '🥩',
    calories: 680,
    protein: 38,
    carbs: 58,
    fat: 32,
    category: 'dinner',
    time: '35 min',
    difficulty: 'Medium',
    estimatedGrams: 450,
    ingredients: [
      "200g sirloin beef, sliced thin",
      "150g egg noodles",
      "100g cremini mushrooms, sliced",
      "1/2 onion, diced",
      "2 cloves garlic, minced",
      "240ml beef broth",
      "120ml sour cream",
      "1 tbsp Dijon mustard",
      "2 tbsp butter",
      "1 tbsp flour",
      "1 tbsp fresh parsley, chopped",
      "Salt and pepper to taste"
    ],
    steps: [
      { text: "Boil egg noodles in salted water until al dente, then drain and set aside.", timerMinutes: 8, timerLabel: "Boil noodles" },
      { text: "Melt butter in a large skillet over medium-high heat and sear the beef until browned. Remove from pan.", timerMinutes: 4, timerLabel: "Sear beef" },
      { text: "In the same skillet, sauté onion, garlic, and mushrooms until softened.", timerMinutes: 5, timerLabel: "Sauté veggies" },
      { text: "Sprinkle with flour and stir, then add beef broth and Dijon mustard. Simmer until thickened.", timerMinutes: 5, timerLabel: "Build sauce" },
      { text: "Return beef to the pan, stir in sour cream, season, and toss with noodles. Garnish with parsley.", timerMinutes: 2, timerLabel: "Finish stroganoff" }
    ]
  },
  {
    title: 'Roast Chicken',
    emoji: '🍗',
    calories: 620,
    protein: 52,
    carbs: 8,
    fat: 42,
    category: 'dinner',
    time: '90 min',
    difficulty: 'Medium',
    estimatedGrams: 420,
    ingredients: [
      "1 whole chicken (1.5kg)",
      "2 tbsp olive oil",
      "1 lemon, halved",
      "4 cloves garlic, smashed",
      "1 tbsp fresh rosemary",
      "1 tbsp fresh thyme",
      "1 tbsp butter, softened",
      "Salt and freshly cracked pepper"
    ],
    steps: [
      { text: "Preheat oven to 200°C (400°F) and pat the chicken dry with paper towels.", timerMinutes: 10, timerLabel: "Preheat oven" },
      { text: "Rub the chicken with olive oil and softened butter, then season generously inside and out with salt and pepper.", timerMinutes: null, timerLabel: null },
      { text: "Stuff the cavity with lemon halves, garlic, rosemary, and thyme.", timerMinutes: null, timerLabel: null },
      { text: "Place chicken breast-side up in a roasting pan and roast until the juices run clear and internal temp reaches 75°C.", timerMinutes: 70, timerLabel: "Roast chicken" },
      { text: "Let rest for 10 minutes before carving and serving.", timerMinutes: 10, timerLabel: "Rest chicken" }
    ]
  },
  {
    title: 'Pad Thai',
    emoji: '🍤',
    calories: 660,
    protein: 28,
    carbs: 88,
    fat: 22,
    category: 'dinner',
    time: '25 min',
    difficulty: 'Medium',
    estimatedGrams: 420,
    ingredients: [
      "200g rice noodles",
      "150g shrimp, peeled",
      "2 large eggs, beaten",
      "60g bean sprouts",
      "30g roasted peanuts, chopped",
      "2 green onions, sliced",
      "3 tbsp fish sauce",
      "2 tbsp tamarind paste",
      "1 tbsp brown sugar",
      "2 tbsp vegetable oil",
      "2 cloves garlic, minced",
      "1 lime, cut into wedges"
    ],
    steps: [
      { text: "Soak rice noodles in hot water until soft and pliable, then drain.", timerMinutes: 8, timerLabel: "Soak noodles" },
      { text: "Whisk fish sauce, tamarind paste, and brown sugar together for the sauce.", timerMinutes: null, timerLabel: null },
      { text: "Heat vegetable oil in a wok over high heat. Sauté garlic and shrimp until pink.", timerMinutes: 3, timerLabel: "Cook shrimp" },
      { text: "Push shrimp to one side, pour in eggs, and scramble until just set.", timerMinutes: 2, timerLabel: "Scramble eggs" },
      { text: "Add drained noodles, sauce, bean sprouts, and green onions. Toss until heated through, top with peanuts and serve with lime.", timerMinutes: 3, timerLabel: "Toss & serve" }
    ]
  },
  {
    title: 'Lasagna',
    emoji: '🍱',
    calories: 720,
    protein: 36,
    carbs: 58,
    fat: 38,
    category: 'dinner',
    time: '90 min',
    difficulty: 'Medium',
    estimatedGrams: 450,
    ingredients: [
      "250g ground beef",
      "9 lasagna sheets",
      "400ml marinara sauce",
      "250g ricotta cheese",
      "200g shredded mozzarella cheese",
      "50g grated Parmesan",
      "1 large egg",
      "1/2 onion, diced",
      "2 cloves garlic, minced",
      "1 tbsp olive oil",
      "1 tbsp fresh basil, chopped",
      "Salt and pepper to taste"
    ],
    steps: [
      { text: "Preheat oven to 190°C (375°F). Boil lasagna sheets until just al dente, then drain.", timerMinutes: 10, timerLabel: "Boil pasta" },
      { text: "Heat olive oil in a skillet. Sauté onion and garlic, then brown the ground beef. Stir in marinara and simmer.", timerMinutes: 12, timerLabel: "Make meat sauce" },
      { text: "Mix ricotta, egg, half the Parmesan, and basil in a bowl and season with salt and pepper.", timerMinutes: null, timerLabel: null },
      { text: "Layer meat sauce, pasta, ricotta mixture, and mozzarella in a baking dish, repeating until the dish is full.", timerMinutes: null, timerLabel: null },
      { text: "Top with remaining mozzarella and Parmesan, bake until bubbly and golden, then rest 10 min before slicing.", timerMinutes: 40, timerLabel: "Bake lasagna" }
    ]
  },
  {
    title: 'Shrimp Scampi',
    emoji: '🦐',
    calories: 580,
    protein: 32,
    carbs: 62,
    fat: 22,
    category: 'dinner',
    time: '20 min',
    difficulty: 'Easy',
    estimatedGrams: 380,
    ingredients: [
      "200g linguine",
      "300g large shrimp, peeled and deveined",
      "4 cloves garlic, minced",
      "60ml white wine",
      "3 tbsp butter",
      "2 tbsp olive oil",
      "2 tbsp lemon juice",
      "1 tbsp fresh parsley, chopped",
      "1/4 tsp red pepper flakes",
      "Salt and pepper to taste"
    ],
    steps: [
      { text: "Cook linguine in salted boiling water until al dente, reserving 60ml pasta water before draining.", timerMinutes: 9, timerLabel: "Boil pasta" },
      { text: "Heat olive oil and 1 tbsp butter in a large skillet over medium heat. Sauté garlic and red pepper flakes briefly.", timerMinutes: 1, timerLabel: "Sauté garlic" },
      { text: "Add shrimp, season with salt and pepper, and cook until pink and opaque.", timerMinutes: 3, timerLabel: "Cook shrimp" },
      { text: "Pour in white wine and lemon juice, simmer for 2 minutes, then stir in remaining butter and parsley.", timerMinutes: 3, timerLabel: "Make sauce" },
      { text: "Toss in linguine with a splash of pasta water until coated, then serve immediately.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Pulled Pork Sandwich',
    emoji: '🥪',
    calories: 720,
    protein: 38,
    carbs: 62,
    fat: 32,
    category: 'dinner',
    time: '480 min',
    difficulty: 'Medium',
    estimatedGrams: 400,
    ingredients: [
      "1kg pork shoulder",
      "4 brioche burger buns",
      "240ml BBQ sauce",
      "1 tbsp brown sugar",
      "1 tbsp smoked paprika",
      "1 tbsp garlic powder",
      "1 tbsp onion powder",
      "100g coleslaw",
      "Salt and pepper"
    ],
    steps: [
      { text: "Combine brown sugar, paprika, garlic powder, onion powder, salt, and pepper for the rub.", timerMinutes: null, timerLabel: null },
      { text: "Rub the spice mix all over the pork shoulder, then place in a slow cooker.", timerMinutes: null, timerLabel: null },
      { text: "Cook on low until the pork is fall-apart tender.", timerMinutes: 420, timerLabel: "Slow-cook pork" },
      { text: "Shred the pork with two forks and toss with BBQ sauce.", timerMinutes: null, timerLabel: null },
      { text: "Pile the pulled pork onto toasted brioche buns, top with coleslaw, and serve.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Veggie Burger',
    emoji: '🍔',
    calories: 540,
    protein: 22,
    carbs: 68,
    fat: 22,
    category: 'dinner',
    time: '25 min',
    difficulty: 'Easy',
    estimatedGrams: 360,
    ingredients: [
      "1 black bean veggie patty",
      "1 brioche burger bun",
      "1 leaf butter lettuce",
      "2 slices tomato",
      "2 slices red onion",
      "1 slice cheddar cheese",
      "1 tbsp mayonnaise",
      "1 tsp Dijon mustard",
      "1 tbsp olive oil",
      "1 pickle, sliced"
    ],
    steps: [
      { text: "Heat olive oil in a skillet over medium heat.", timerMinutes: null, timerLabel: null },
      { text: "Cook the veggie patty until heated through and crisp on the outside, flipping once.", timerMinutes: 8, timerLabel: "Cook patty" },
      { text: "Add the cheese slice in the last minute and cover to melt.", timerMinutes: 1, timerLabel: "Melt cheese" },
      { text: "Toast the brioche bun and spread mayonnaise and Dijon mustard on both halves.", timerMinutes: 2, timerLabel: "Toast bun" },
      { text: "Layer lettuce, tomato, patty with melted cheese, onion, and pickle on the bun and serve.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Eggplant Parmesan',
    emoji: '🍆',
    calories: 580,
    protein: 22,
    carbs: 58,
    fat: 28,
    category: 'dinner',
    time: '60 min',
    difficulty: 'Medium',
    estimatedGrams: 420,
    ingredients: [
      "1 large eggplant, sliced into rounds",
      "120g breadcrumbs",
      "2 large eggs, beaten",
      "60g flour",
      "300ml marinara sauce",
      "150g shredded mozzarella",
      "40g grated Parmesan",
      "60ml olive oil",
      "1 tbsp fresh basil, torn",
      "Salt and pepper"
    ],
    steps: [
      { text: "Preheat oven to 200°C (400°F). Salt eggplant rounds and let drain in a colander for 15 minutes.", timerMinutes: 15, timerLabel: "Drain eggplant" },
      { text: "Pat dry, then dredge each round in flour, then egg, then breadcrumbs.", timerMinutes: null, timerLabel: null },
      { text: "Heat olive oil in a skillet over medium heat and pan-fry the eggplant in batches until golden on both sides.", timerMinutes: 12, timerLabel: "Fry eggplant" },
      { text: "Layer eggplant, marinara, mozzarella, and Parmesan in a baking dish, repeating once.", timerMinutes: null, timerLabel: null },
      { text: "Bake until cheese is bubbly and golden, then top with fresh basil before serving.", timerMinutes: 22, timerLabel: "Bake parm" }
    ]
  },
  {
    title: 'Beef Tacos',
    emoji: '🌮',
    calories: 520,
    protein: 28,
    carbs: 42,
    fat: 24,
    category: 'dinner',
    time: '20 min',
    difficulty: 'Easy',
    estimatedGrams: 350,
    ingredients: [
      "300g ground beef",
      "6 small corn tortillas",
      "1 packet taco seasoning",
      "100g shredded cheddar cheese",
      "60g shredded lettuce",
      "60g tomato, diced",
      "2 tbsp sour cream",
      "2 tbsp salsa",
      "1/2 lime, cut into wedges"
    ],
    steps: [
      { text: "Brown the ground beef in a skillet over medium-high heat, breaking it apart as it cooks.", timerMinutes: 7, timerLabel: "Brown beef" },
      { text: "Drain excess fat, then stir in taco seasoning with a splash of water and simmer until thickened.", timerMinutes: 3, timerLabel: "Season beef" },
      { text: "Warm the corn tortillas in a dry skillet or over an open flame until pliable.", timerMinutes: 2, timerLabel: "Warm tortillas" },
      { text: "Divide the beef among the tortillas and top with cheese, lettuce, tomato, sour cream, and salsa.", timerMinutes: null, timerLabel: null },
      { text: "Serve with lime wedges on the side.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Pesto Pasta',
    emoji: '🌿',
    calories: 620,
    protein: 18,
    carbs: 72,
    fat: 30,
    category: 'dinner',
    time: '15 min',
    difficulty: 'Easy',
    estimatedGrams: 380,
    ingredients: [
      "200g spaghetti or fusilli",
      "60g fresh basil leaves",
      "30g pine nuts",
      "40g grated Parmesan",
      "2 cloves garlic",
      "80ml extra virgin olive oil",
      "1 tbsp lemon juice",
      "Salt and pepper to taste"
    ],
    steps: [
      { text: "Cook pasta in salted boiling water until al dente, reserving 60ml pasta water before draining.", timerMinutes: 9, timerLabel: "Boil pasta" },
      { text: "Pulse basil, pine nuts, garlic, and Parmesan in a food processor until finely chopped.", timerMinutes: null, timerLabel: null },
      { text: "With the processor running, slowly drizzle in olive oil to form a smooth pesto. Add lemon juice and season.", timerMinutes: null, timerLabel: null },
      { text: "Toss the drained pasta with the pesto, adding pasta water a splash at a time until silky.", timerMinutes: null, timerLabel: null },
      { text: "Plate and top with extra Parmesan and a crack of black pepper before serving.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Apple Slices with Peanut Butter',
    emoji: '🍎',
    calories: 260,
    protein: 8,
    carbs: 32,
    fat: 14,
    category: 'snack',
    time: '3 min',
    difficulty: 'Easy',
    estimatedGrams: 180,
    ingredients: [
      "1 large apple",
      "2 tbsp natural peanut butter",
      "1 tsp honey",
      "1 pinch ground cinnamon"
    ],
    steps: [
      { text: "Wash the apple thoroughly under cold water.", timerMinutes: null, timerLabel: null },
      { text: "Core the apple and slice into 8 even wedges.", timerMinutes: null, timerLabel: null },
      { text: "Arrange the apple slices on a serving plate.", timerMinutes: null, timerLabel: null },
      { text: "Spoon the peanut butter into a small dish for dipping and drizzle honey over it.", timerMinutes: null, timerLabel: null },
      { text: "Dust with a pinch of cinnamon and serve.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Trail Mix',
    emoji: '🥜',
    calories: 320,
    protein: 9,
    carbs: 28,
    fat: 22,
    category: 'snack',
    time: '5 min',
    difficulty: 'Easy',
    estimatedGrams: 60,
    ingredients: [
      "30g raw almonds",
      "30g cashews",
      "20g pumpkin seeds",
      "20g dried cranberries",
      "20g dark chocolate chips",
      "20g raisins"
    ],
    steps: [
      { text: "Measure each ingredient carefully into a mixing bowl.", timerMinutes: null, timerLabel: null },
      { text: "Toss together until evenly distributed.", timerMinutes: null, timerLabel: null },
      { text: "Portion the mix into an airtight container or small snack bags.", timerMinutes: null, timerLabel: null },
      { text: "Store in a cool, dry place away from direct sunlight.", timerMinutes: null, timerLabel: null },
      { text: "Serve a small handful (about 30g) as a quick energy snack.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Cheese Plate',
    emoji: '🧀',
    calories: 480,
    protein: 22,
    carbs: 24,
    fat: 34,
    category: 'snack',
    time: '10 min',
    difficulty: 'Easy',
    estimatedGrams: 280,
    ingredients: [
      "60g aged cheddar",
      "60g brie",
      "60g blue cheese",
      "40g grapes",
      "30g crackers",
      "20g walnuts",
      "1 tbsp honey",
      "1 tbsp fig jam"
    ],
    steps: [
      { text: "Remove cheeses from the fridge 30 minutes before serving to bring them to room temperature.", timerMinutes: 30, timerLabel: "Temper cheeses" },
      { text: "Arrange the cheeses on a wooden board with space between them.", timerMinutes: null, timerLabel: null },
      { text: "Fill the gaps with grapes, walnuts, and small bowls of honey and fig jam.", timerMinutes: null, timerLabel: null },
      { text: "Fan crackers around the edges of the board.", timerMinutes: null, timerLabel: null },
      { text: "Serve with small cheese knives and pair with wine if desired.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Banana Bread',
    emoji: '🍞',
    calories: 320,
    protein: 5,
    carbs: 46,
    fat: 14,
    category: 'snack',
    time: '70 min',
    difficulty: 'Easy',
    estimatedGrams: 90,
    ingredients: [
      "3 very ripe bananas, mashed",
      "100g sugar",
      "80g butter, melted",
      "1 large egg",
      "1 tsp vanilla extract",
      "180g all-purpose flour",
      "1 tsp baking soda",
      "1/2 tsp salt",
      "50g walnuts, chopped (optional)"
    ],
    steps: [
      { text: "Preheat oven to 175°C (350°F) and grease a 9x5 inch loaf pan.", timerMinutes: 10, timerLabel: "Preheat oven" },
      { text: "Mix mashed bananas, melted butter, sugar, egg, and vanilla in a large bowl until smooth.", timerMinutes: null, timerLabel: null },
      { text: "In a separate bowl, whisk together flour, baking soda, and salt.", timerMinutes: null, timerLabel: null },
      { text: "Fold dry ingredients into wet just until combined, then fold in chopped walnuts if using.", timerMinutes: null, timerLabel: null },
      { text: "Pour into the loaf pan and bake until a toothpick comes out clean. Cool before slicing.", timerMinutes: 55, timerLabel: "Bake bread" }
    ]
  },
  {
    title: 'Energy Balls',
    emoji: '⚡',
    calories: 200,
    protein: 6,
    carbs: 22,
    fat: 10,
    category: 'snack',
    time: '15 min',
    difficulty: 'Easy',
    estimatedGrams: 50,
    ingredients: [
      "100g rolled oats",
      "80g peanut butter",
      "60g honey",
      "30g mini chocolate chips",
      "20g ground flaxseed",
      "1 tsp vanilla extract",
      "1 pinch salt"
    ],
    steps: [
      { text: "Combine rolled oats, peanut butter, honey, ground flaxseed, vanilla, and salt in a large bowl.", timerMinutes: null, timerLabel: null },
      { text: "Mix thoroughly until everything sticks together into a uniform dough.", timerMinutes: null, timerLabel: null },
      { text: "Fold in the mini chocolate chips until evenly distributed.", timerMinutes: null, timerLabel: null },
      { text: "Roll the mixture into 1-inch balls and place on a parchment-lined tray.", timerMinutes: null, timerLabel: null },
      { text: "Refrigerate to firm up, then store in an airtight container.", timerMinutes: 15, timerLabel: "Chill balls" }
    ]
  },
  {
    title: 'Roasted Chickpeas',
    emoji: '🌶️',
    calories: 240,
    protein: 11,
    carbs: 32,
    fat: 8,
    category: 'snack',
    time: '45 min',
    difficulty: 'Easy',
    estimatedGrams: 160,
    ingredients: [
      "1 can (400g) chickpeas, drained and rinsed",
      "2 tbsp olive oil",
      "1 tsp smoked paprika",
      "1 tsp cumin",
      "1/2 tsp garlic powder",
      "1/4 tsp cayenne pepper",
      "1 tsp salt"
    ],
    steps: [
      { text: "Preheat oven to 220°C (425°F). Pat the chickpeas very dry with a clean towel.", timerMinutes: 10, timerLabel: "Preheat oven" },
      { text: "Spread chickpeas in a single layer on a baking sheet and drizzle with olive oil.", timerMinutes: null, timerLabel: null },
      { text: "Roast in the oven, shaking the pan halfway through, until golden and crispy.", timerMinutes: 30, timerLabel: "Roast chickpeas" },
      { text: "Toss the hot roasted chickpeas with paprika, cumin, garlic powder, cayenne, and salt.", timerMinutes: null, timerLabel: null },
      { text: "Let cool slightly and serve, or store in an airtight container once fully cool.", timerMinutes: null, timerLabel: null }
    ]
  },
  {
    title: 'Yogurt Berry Cup',
    emoji: '🫐',
    calories: 220,
    protein: 16,
    carbs: 28,
    fat: 4,
    category: 'snack',
    time: '3 min',
    difficulty: 'Easy',
    estimatedGrams: 250,
    ingredients: [
      "180g vanilla Greek yogurt",
      "60g mixed fresh berries",
      "1 tbsp honey",
      "1 tbsp granola",
      "1 tsp chia seeds"
    ],
    steps: [
      { text: "Spoon the vanilla Greek yogurt into a serving cup or small bowl.", timerMinutes: null, timerLabel: null },
      { text: "Wash the mixed berries and pat dry gently with a paper towel.", timerMinutes: null, timerLabel: null },
      { text: "Top the yogurt with the fresh berries.", timerMinutes: null, timerLabel: null },
      { text: "Drizzle honey over everything and sprinkle with chia seeds.", timerMinutes: null, timerLabel: null },
      { text: "Finish with a sprinkle of granola for crunch and serve immediately.", timerMinutes: null, timerLabel: null }
    ]
  }
];

async function upsertGlobalRecipe(r) {
  // Idempotency: find if a global row with this exact title already exists.
  const { data: existing } = await adminClient
    .from('recipes')
    .select('id, image_url')
    .is('user_id', null)
    .eq('title', r.title)
    .maybeSingle();

  const steps = r.steps;
  const instructions = steps.map((s, i) => `${i + 1}. ${s.text}`).join('\n');
  const ingredientsStr = JSON.stringify(r.ingredients);

  const recipeData = {
    user_id: null,
    title: r.title,
    emoji: r.emoji,
    calories: r.calories,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
    ingredients: ingredientsStr,
    instructions: instructions,
    steps: steps,
    nutrition: {
      total: { calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat },
      time: r.time,
      difficulty: r.difficulty,
      category: r.category,
      estimatedGrams: r.estimatedGrams,
    },
    saved_category: r.category,
  };

  if (existing) {
    // Overwrite ingredients/steps to replace placeholders but preserve image_url.
    const { data, error } = await adminClient
      .from('recipes')
      .update(recipeData)
      .eq('id', existing.id)
      .select('id, image_url')
      .single();
    if (error) throw error;
    console.log(`  · updated "${r.title}" details (preserved image_url: ${existing.image_url})`);
    return data;
  } else {
    // Insert new curated recipe row
    const { data, error } = await adminClient
      .from('recipes')
      .insert(recipeData)
      .select('id, image_url')
      .single();
    if (error) throw error;
    console.log(`  · inserted new recipe "${r.title}"`);
    return data;
  }
}

async function attachImage(row, query) {
  if (row.image_url) {
    console.log(`  · image already attached (${row.image_url})`);
    return;
  }
  const photo = await fetchPexelsPhoto(query);
  if (!photo) {
    console.log(`  · no Pexels result for "${query}" — leaving image_url null`);
    return;
  }
  const path = await uploadRecipeImage(row.id, photo.buffer, photo.contentType);
  await adminClient.from('recipes').update({ image_url: path }).eq('id', row.id);
  console.log(`  · uploaded ${path}`);
}

async function main() {
  console.log(`[seed] inserting/updating ${RECIPES.length} curated recipes…`);
  if (!process.env.PEXELS_API_KEY) {
    console.warn('[seed] PEXELS_API_KEY not set — new recipes will be created without images.');
  }

  for (const r of RECIPES) {
    console.log(`→ ${r.title}`);
    try {
      const row = await upsertGlobalRecipe(r);
      await attachImage(row, r.title);
    } catch (err) {
      console.error(`  ✖ ${r.title}: ${err.message}`);
    }
  }
  console.log('[seed] done.');
}

main().catch(err => {
  console.error('[seed] FAILED:', err);
  process.exit(1);
});
