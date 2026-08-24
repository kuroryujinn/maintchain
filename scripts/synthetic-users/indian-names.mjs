// scripts/synthetic-users/indian-names.mjs
// Deterministic Indian name generator for MaintChain synthetic test users.
//
// Generates realistic Indian names by combining first names and surnames
// from curated pools. Each name is deterministic based on index, so
// re-running the generator with the same count produces identical names.
//
// These are SYNTHETIC identities for Stellar Testnet testing only.
// They must not be presented as real human users.

// ── First Names (mixed gender, common across Indian regions) ──────────

const FIRST_NAMES = [
  // Male names
  'Arjun', 'Rahul', 'Amit', 'Vikram', 'Rajesh',
  'Sanjay', 'Deepak', 'Mohan', 'Krishna', 'Suresh',
  'Anil', 'Ravi', 'Kumar', 'Vijay', 'Ajay',
  'Ganesh', 'Prakash', 'Ramesh', 'Manoj', 'Nitin',
  'Karan', 'Nikhil', 'Aakash', 'Rohit', 'Amitabh',
  'Sachin', 'Dinesh', 'Mahesh', 'Narendra', 'Pradeep',
  // Female names
  'Priya', 'Anita', 'Sunita', 'Meera', 'Deepa',
  'Kavita', 'Lakshmi', 'Sita', 'Geeta', 'Pooja',
  'Nisha', 'Rekha', 'Vandana', 'Usha', 'Sarita',
  'Asha', 'Anjali', 'Sumitra', 'Jyoti', 'Kamala',
  'Padma', 'Sudha', 'Veena', 'Shanti', 'Indira',
  'Madhuri', 'Aishwarya', 'Nandini', 'Divya', 'Swati',
];

// ── Surnames (common across Indian states) ───────────────────────────

const SURNAMES = [
  'Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta',
  'Reddy', 'Nair', 'Iyer', 'Deshmukh', 'Joshi',
  'Verma', 'Mishra', 'Choudhary', 'Tiwari', 'Rao',
  'Menon', 'Pillai', 'Bhat', 'Kulkarni', 'Desai',
  'Mehta', 'Shah', 'Trivedi', 'Pandey', 'Srivastava',
  'Chatterjee', 'Mukherjee', 'Banerjee', 'Das', 'Ghosh',
  'Kapoor', 'Malhotra', 'Chopra', 'Khanna', 'Sinha',
  'Yadav', 'Thakur', 'Pandit', 'Naidu', 'Kurup',
];

/**
 * Generate a deterministic Indian name for a given zero-based index.
 *
 * @param {number} index - Zero-based user index (0, 1, 2, ...)
 * @returns {{ firstName: string, lastName: string, fullName: string }}
 */
export function generateIndianName(index) {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = SURNAMES[index % SURNAMES.length];
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
  };
}

/**
 * Generate a batch of Indian names for synthetic users.
 *
 * @param {number} count - Number of names to generate
 * @returns {Array<{ index: number, syntheticId: string, firstName: string, lastName: string, fullName: string }>}
 */
export function generateIndianNameBatch(count) {
  const names = [];
  for (let i = 0; i < count; i++) {
    const syntheticId = `SYNTH-${String(i + 1).padStart(4, '0')}`;
    const name = generateIndianName(i);
    names.push({
      index: i,
      syntheticId,
      ...name,
    });
  }
  return names;
}

/**
 * Get the total number of unique first names available.
 */
export function getFirstNameCount() {
  return FIRST_NAMES.length;
}

/**
 * Get the total number of unique surnames available.
 */
export function getSurnameCount() {
  return SURNAMES.length;
}

// CLI mode: generate and print names
if (process.argv[1] && process.argv[1].endsWith('indian-names.mjs')) {
  const count = parseInt(process.argv[2] || '50', 10);
  const names = generateIndianNameBatch(count);

  console.log(`Generated ${names.length} Indian names:\n`);
  console.log('SYNTH-ID      | Full Name');
  console.log('──────────────┼─────────────────────');
  for (const n of names) {
    console.log(`${n.syntheticId.padEnd(14)}│ ${n.fullName}`);
  }
  console.log(`\nUnique first names: ${getFirstNameCount()}`);
  console.log(`Unique surnames: ${getSurnameCount()}`);
}
