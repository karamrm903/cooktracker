/**
 * Mock parsed recipe used while real video-parsing backend is not yet connected.
 * Swap MOCK_RECIPE for the real API response to plug in live data.
 */

export const MOCK_RECIPE = {
  id: 'mock_lemon_chicken',
  title: 'One-Pan Lemon Herb Chicken',
  emoji: '🍗',

  ingredients: [
    '4 boneless, skinless chicken thighs',
    '3 cloves garlic, minced',
    '1 lemon, sliced into rounds',
    '2 tbsp olive oil',
    '1 tsp dried oregano',
    '1 tsp smoked paprika',
    '½ tsp black pepper',
    '1 tsp salt',
    '200 g baby potatoes, halved',
    'Handful of fresh parsley, to garnish',
  ],

  steps: [
    {
      text: 'Preheat your oven to 200 °C (400 °F). Pat the chicken thighs completely dry with paper towels — this is key to getting a golden, crispy crust.',
      timerMinutes: null,
      timerLabel:   null,
    },
    {
      text: 'In a small bowl, whisk together the olive oil, minced garlic, oregano, paprika, salt and black pepper to make a quick marinade.',
      timerMinutes: null,
      timerLabel:   null,
    },
    {
      text: 'Add the chicken and halved baby potatoes to a large oven-safe pan. Pour the marinade over everything and toss until evenly coated.',
      timerMinutes: null,
      timerLabel:   null,
    },
    {
      text: 'Arrange the lemon slices on top of the chicken. Place the pan in the oven and bake for 25 minutes until the chicken is golden and cooked through.',
      timerMinutes: 25,
      timerLabel:   'Oven — chicken',
    },
    {
      text: 'Remove the pan from the oven. Let the chicken rest for 5 minutes so the juices redistribute back into the meat.',
      timerMinutes: 5,
      timerLabel:   'Resting time',
    },
    {
      text: 'Scatter fresh parsley over the top, squeeze over any remaining lemon juice, and serve immediately. Enjoy!',
      timerMinutes: null,
      timerLabel:   null,
    },
  ],

  nutrition: {
    calories: 520,
    protein:  48,
    carbs:    22,
    fat:      24,
  },
};
