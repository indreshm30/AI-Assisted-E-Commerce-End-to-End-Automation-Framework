import bcrypt from 'bcrypt';

async function generateHash() {
  const hash = await bcrypt.hash('password123', 12);
  console.log('Password hash for "password123":', hash);
}

generateHash().catch(console.error);