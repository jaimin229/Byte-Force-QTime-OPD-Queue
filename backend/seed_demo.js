const { createClient } = require('../app/node_modules/@supabase/supabase-js');
const creds = require('../backend-credentials.json');

const supa = createClient(creds.url, creds.service_role_key);

async function seed() {
  console.log('🚀 Starting realistic OPD simulation seeder...');

  // 1. Get or create clinic
  const { data: clinics, error: cErr } = await supa.from('clinics').select('*');
  if (cErr) throw cErr;
  let clinic = clinics[0];
  if (!clinic) {
    const { data: newC, error: ncErr } = await supa.from('clinics').insert({
      name: 'General OPD',
      hospital: 'District HQ Hospital',
      city: 'Central District',
      default_consult_secs: 420,
    }).select().single();
    if (ncErr) throw ncErr;
    clinic = newC;
  }
  console.log('✅ Clinic verified:', clinic.hospital, '-', clinic.name);

  // 2. Clear previous demo tokens
  await supa.from('tokens').delete().eq('clinic_id', clinic.id);
  console.log('🧹 Cleaned previous tokens.');

  // 3. Ensure 3 doctors exist
  const doctorsData = [
    { name: 'Dr. Aslam (General Medicine)', room: 3, avg_consult_secs: 390, consult_samples: 12 },
    { name: 'Dr. Rania (Pediatrics)', room: 4, avg_consult_secs: 480, consult_samples: 8 },
    { name: 'Dr. Sharma (Orthopedics)', room: 5, avg_consult_secs: 540, consult_samples: 15 },
  ];

  const doctors = [];
  for (const doc of doctorsData) {
    const { data: existing } = await supa.from('doctors').select('*').eq('name', doc.name).maybeSingle();
    if (existing) {
      doctors.push(existing);
    } else {
      const { data: inserted, error: dErr } = await supa.from('doctors').insert({
        clinic_id: clinic.id,
        name: doc.name,
        room: doc.room,
        avg_consult_secs: doc.avg_consult_secs,
        consult_samples: doc.consult_samples,
        is_active: true,
      }).select().single();
      if (dErr) throw dErr;
      doctors.push(inserted);
    }
  }
  console.log('✅ 3 Active OPD Doctors initialized.');

  // 4. Seed realistic queue for Doctor 1 (Dr. Aslam)
  const patientNames = [
    { name: 'Anil Kumar', source: 'walk_in', priority: false },
    { name: 'Sunita Devi', source: 'appointment', priority: true, reason: 'Severe breathing difficulty' },
    { name: 'Mohan Lal', source: 'follow_up', priority: false },
    { name: 'Fatima Bi', source: 'referral', priority: false },
    { name: 'Rajesh Patel', source: 'diagnostic', priority: false },
    { name: 'Kavita Singh', source: 'walk_in', priority: false },
    { name: 'Deepak Verma', source: 'appointment', priority: false },
    { name: 'Pooja Sharma', source: 'walk_in', priority: false },
  ];

  const d1 = doctors[0];
  console.log(`📋 Generating tokens for ${d1.name}...`);

  for (let i = 0; i < patientNames.length; i++) {
    const p = patientNames[i];
    const { data: tok, error: tErr } = await supa.from('tokens').insert({
      clinic_id: clinic.id,
      doctor_id: d1.id,
      source: p.source,
      is_priority: p.priority,
      priority_reason: p.reason || null,
      display_label: p.name,
    }).select().single();

    if (tErr) {
      console.error('Error inserting token:', tErr);
      continue;
    }

    // Set first token as currently 'called'
    if (i === 0) {
      await supa.from('tokens').update({
        status: 'called',
        called_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      }).eq('id', tok.id);
      console.log(`  -> Token #${tok.number} (${p.name}): CALLED (Now in Room ${d1.room})`);
    } else {
      console.log(`  -> Token #${tok.number} (${p.name}): Waiting in queue`);
    }
  }

  // 5. Seed tokens for Doctor 2 (Dr. Rania)
  const p2Names = [
    { name: 'Master Aarav (Age 4)', source: 'walk_in', priority: true, reason: 'High fever convulsion' },
    { name: 'Baby Ananya (Age 2)', source: 'appointment', priority: false },
    { name: 'Master Rohan (Age 7)', source: 'follow_up', priority: false },
  ];
  const d2 = doctors[1];
  for (let i = 0; i < p2Names.length; i++) {
    const p = p2Names[i];
    const { data: tok } = await supa.from('tokens').insert({
      clinic_id: clinic.id,
      doctor_id: d2.id,
      source: p.source,
      is_priority: p.priority,
      priority_reason: p.reason || null,
      display_label: p.name,
    }).select().single();

    if (i === 0) {
      await supa.from('tokens').update({
        status: 'called',
        called_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      }).eq('id', tok.id);
      console.log(`  -> Token #${tok.number} (${p.name}): CALLED (Now in Room ${d2.room})`);
    }
  }

  console.log('\n🎉 Simulation seeding successfully complete!');
  console.log('Patients, doctors, and live queues are ready for end-to-end testing.');
}

seed().catch(err => {
  console.error('❌ Seeder failed:', err);
  process.exit(1);
});
