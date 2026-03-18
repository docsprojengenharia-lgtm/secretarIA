import 'dotenv/config';
import { resolve } from 'path';
import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: resolve(process.cwd(), '../../.env') });

import { db } from '@secretaria/db';
import { clinics, clinicSettings, users, professionals, services, professionalServices, workingHours, contacts, appointments } from '@secretaria/db';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Seeding database...');

  // 1. Create clinic
  const [clinic] = await db.insert(clinics).values({
    name: 'Barbearia do Ze',
    slug: 'barbearia-do-ze',
    segment: 'barbearia',
    phone: '5511999999999',
    email: 'ze@barbearia.com',
    address: 'Rua das Flores, 123 - Centro',
    city: 'Sao Paulo',
    state: 'SP',
    plan: 'professional',
    trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  }).returning();
  console.log('Clinic created:', clinic.name);

  // 2. Create settings
  await db.insert(clinicSettings).values({
    clinicId: clinic.id,
    aiAlwaysOn: true, // For testing
  });

  // 3. Create owner
  const passwordHash = await bcrypt.hash('senha123', 12);
  const [owner] = await db.insert(users).values({
    clinicId: clinic.id,
    name: 'Ze da Barbearia',
    email: 'ze@barbearia.com',
    passwordHash,
    phone: '5511999999999',
    role: 'owner',
  }).returning();
  console.log('Owner created:', owner.email, '/ senha: senha123');

  // 4. Create professionals
  const profData = [
    { name: 'Ze', phone: '5511999999001' },
    { name: 'Carlos', phone: '5511999999002' },
    { name: 'Maria', phone: '5511999999003' },
  ];
  const profs = [];
  for (const p of profData) {
    const [prof] = await db.insert(professionals).values({ clinicId: clinic.id, ...p }).returning();
    profs.push(prof);
  }
  console.log('Professionals created:', profs.map(p => p.name).join(', '));

  // 5. Create services
  const svcData = [
    { name: 'Corte Masculino', category: 'Corte', durationMinutes: 30, priceInCents: 4500 },
    { name: 'Barba', category: 'Barba', durationMinutes: 20, priceInCents: 3000 },
    { name: 'Corte + Barba', category: 'Combo', durationMinutes: 45, priceInCents: 6500 },
    { name: 'Coloracao', category: 'Coloracao', durationMinutes: 60, priceInCents: 8000 },
    { name: 'Hidratacao', category: 'Tratamento', durationMinutes: 30, priceInCents: 5000 },
  ];
  const svcs = [];
  for (const s of svcData) {
    const [svc] = await db.insert(services).values({ clinicId: clinic.id, ...s }).returning();
    svcs.push(svc);
  }
  console.log('Services created:', svcs.map(s => s.name).join(', '));

  // 6. Link services to professionals
  // Ze: all services
  for (const svc of svcs) {
    await db.insert(professionalServices).values({ clinicId: clinic.id, professionalId: profs[0].id, serviceId: svc.id });
  }
  // Carlos: Corte, Barba, Combo
  for (const svc of svcs.slice(0, 3)) {
    await db.insert(professionalServices).values({ clinicId: clinic.id, professionalId: profs[1].id, serviceId: svc.id });
  }
  // Maria: all services
  for (const svc of svcs) {
    await db.insert(professionalServices).values({ clinicId: clinic.id, professionalId: profs[2].id, serviceId: svc.id });
  }
  console.log('Professional-service links created');

  // 7. Working hours
  const schedules = [
    { prof: profs[0], days: [1, 2, 3, 4, 5, 6], start: '09:00', end: '18:00' }, // Ze: seg-sab
    { prof: profs[1], days: [1, 2, 3, 4, 5], start: '10:00', end: '19:00' },     // Carlos: seg-sex
    { prof: profs[2], days: [2, 3, 4, 5, 6], start: '09:00', end: '17:00' },     // Maria: ter-sab
  ];
  for (const s of schedules) {
    for (const day of s.days) {
      await db.insert(workingHours).values({
        clinicId: clinic.id,
        professionalId: s.prof.id,
        dayOfWeek: day,
        startTime: s.start,
        endTime: s.end,
      });
    }
  }
  console.log('Working hours created');

  // 8. Create contacts
  const contactData = [
    { name: 'Joao Silva', phone: '5511988880001' },
    { name: 'Pedro Santos', phone: '5511988880002' },
    { name: 'Ana Costa', phone: '5511988880003' },
    { name: 'Lucas Oliveira', phone: '5511988880004' },
    { name: 'Mariana Lima', phone: '5511988880005' },
    { name: 'Rafael Souza', phone: '5511988880006' },
    { name: 'Camila Ferreira', phone: '5511988880007' },
    { name: 'Bruno Almeida', phone: '5511988880008' },
    { name: 'Julia Ribeiro', phone: '5511988880009' },
    { name: 'Fernando Gomes', phone: '5511988880010' },
  ];
  const cts = [];
  for (const c of contactData) {
    const [ct] = await db.insert(contacts).values({
      clinicId: clinic.id,
      ...c,
      status: 'active',
      lastContactAt: new Date(),
    }).returning();
    cts.push(ct);
  }
  console.log('Contacts created:', cts.length);

  // 9. Create appointments for next 7 days
  const now = new Date();
  let apptCount = 0;
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);
    const dayOfWeek = day.getDay();

    // Skip sundays
    if (dayOfWeek === 0) continue;

    // 2-3 appointments per day
    const hours = [9, 11, 14];
    for (let i = 0; i < Math.min(hours.length, 3); i++) {
      const contact = cts[apptCount % cts.length];
      const prof = profs[apptCount % profs.length];
      const svc = svcs[apptCount % svcs.length];

      const startAt = new Date(day);
      startAt.setHours(hours[i], 0, 0, 0);
      const endAt = new Date(startAt.getTime() + svc.durationMinutes * 60 * 1000);

      // Only future appointments
      if (startAt > now) {
        await db.insert(appointments).values({
          clinicId: clinic.id,
          contactId: contact.id,
          professionalId: prof.id,
          serviceId: svc.id,
          startAt,
          endAt,
          status: 'confirmed',
          source: 'ai',
        });
        apptCount++;
      }
    }
  }
  console.log(`Appointments created: ${apptCount}`);

  console.log('\n--- Seed complete! ---');
  console.log(`Login: ze@barbearia.com / senha123`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
