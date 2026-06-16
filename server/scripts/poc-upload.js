import 'dotenv/config';
import { adminClient } from '../db/client.js';

async function runPOC() {
  const imageUrl = 'https://images.pexels.com/photos/6068717/pexels-photo-6068717.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
  const bucketName = 'images';
  const filePath = 'food-images/poc-pizza.jpg';

  console.log('1. Ensuring public bucket "images" exists in Supabase...');
  try {
    const { data: bucket, error: bucketError } = await adminClient.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png'],
    });
    if (bucketError) {
      console.log('Bucket check message:', bucketError.message);
    } else {
      console.log('Bucket created successfully:', bucket);
    }
  } catch (err) {
    console.log('Bucket check error (likely already exists):', err.message);
  }

  console.log('2. Fetching image from Pexels...');
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log(`Successfully downloaded image buffer (${buffer.length} bytes)`);

  console.log('3. Uploading image to Supabase Storage...');
  const { data: uploadData, error: uploadError } = await adminClient.storage
    .from(bucketName)
    .upload(filePath, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  console.log('Upload successful:', uploadData);

  const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucketName}/${filePath}`;
  console.log('\n--- SUCCESS ---');
  console.log('Public CDN URL is:');
  console.log(publicUrl);
  console.log('---------------\n');
}

runPOC().catch(err => {
  console.error('POC FAILED:', err);
});
