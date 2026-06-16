import 'dotenv/config';
import { adminClient } from '../db/client.js';

async function testSwipe() {
  console.log('Running swipe query...');
  const max = 20;
  const { data, error } = await adminClient
    .from('recipes')
    .select('id, title, emoji, calories, protein, carbs, fat, ingredients, steps, nutrition, saved_category')
    .is('user_id', null)
    .or('saved_category.is.null,saved_category.neq.food_search')
    .limit(max);

  if (error) {
    console.error('Query failed:', error);
  } else {
    console.log(`Query succeeded. Found ${data?.length ?? 0} rows.`);
    if (data?.length > 0) {
      console.log('First row example:', JSON.stringify(data[0], null, 2));
    }
  }
}

testSwipe();
