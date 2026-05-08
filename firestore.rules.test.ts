import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { serverTimestamp } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-smartnagar',
    firestore: {
      rules: readFileSync('DRAFT_firestore.rules', 'utf8'),
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('SmartNagar AI Security Rules - Dirty Dozen Payloads', () => {
  // 1. Identity Spoofing
  it('Identity Spoofing: Creating a complaint with userId of another citizen', async () => {
    const asadDb = testEnv.authenticatedContext('asad123', { email: 'asad@test.com' }).firestore();
    await assertFails(
      asadDb.collection('complaints').doc('comp1').set({
        userId: 'hacker999',
        title: 'Broken Light',
        category: 'Infrastructure',
        locationName: 'Street 1',
        latitude: 12.9,
        longitude: 77.5,
        status: 'Pending Review',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    );
  });

  // 2. Ghost Field Injection
  it('Ghost Field Injection: Adding isVerified to user profile', async () => {
    const db = testEnv.authenticatedContext('asad123', { email: 'asad@test.com' }).firestore();
    await assertFails(
      db.collection('users').doc('asad123').set({
        email: 'asad@test.com',
        role: 'citizen',
        createdAt: serverTimestamp(),
        isVerified: true
      })
    );
  });

  // 3. Privilege Escalation
  it('Privilege Escalation: Creating a user profile with role admin', async () => {
    const db = testEnv.authenticatedContext('hacker999', { email: 'hacker@test.com' }).firestore();
    await assertFails(
      db.collection('users').doc('hacker999').set({
        email: 'hacker@test.com',
        role: 'admin',
        createdAt: serverTimestamp()
      })
    );
  });

  // 4. State Shortcutting
  it('State Shortcutting: Creating a complaint with status Resolved', async () => {
    const db = testEnv.authenticatedContext('asad123', { email: 'asad@test.com' }).firestore();
    await assertFails(
      db.collection('complaints').doc('comp1').set({
        userId: 'asad123',
        title: 'Broken Light',
        category: 'Infrastructure',
        locationName: 'Street 1',
        latitude: 12.9,
        longitude: 77.5,
        status: 'Resolved',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    );
  });

  // 5. PII Leak
  it('PII Leak: Querying all user profiles when not admin', async () => {
    const db = testEnv.authenticatedContext('asad123', { email: 'asad@test.com' }).firestore();
    await assertFails(db.collection('users').get());
  });

  // 6. Value Poisoning
  it('Value Poisoning: Passing a long category', async () => {
    const db = testEnv.authenticatedContext('asad123', { email: 'asad@test.com' }).firestore();
    await assertFails(
      db.collection('complaints').doc('comp1').set({
        userId: 'asad123',
        title: 'Broken Light',
        category: 'a'.repeat(2500),
        locationName: 'Street 1',
        latitude: 12.9,
        longitude: 77.5,
        status: 'Pending Review',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    );
  });

  // 7. Orphaned Vote
  it('Orphaned Vote: Creating a vote in a non-existent complaint', async () => {
    const db = testEnv.authenticatedContext('asad123', { email: 'asad@test.com' }).firestore();
    await assertFails(
      db.collection('complaints').doc('nonexistent').collection('votes').doc('asad123').set({
        userId: 'asad123',
        createdAt: serverTimestamp()
      })
    );
  });

  // 9. Timestamp Forgery
  it('Timestamp Forgery: Creating a complaint with past timestamp', async () => {
    const db = testEnv.authenticatedContext('asad123', { email: 'asad@test.com' }).firestore();
    await assertFails(
      db.collection('complaints').doc('comp1').set({
        userId: 'asad123',
        title: 'Broken Light',
        category: 'Infrastructure',
        locationName: 'Street 1',
        latitude: 12.9,
        longitude: 77.5,
        status: 'Pending Review',
        createdAt: new Date('2020-01-01'),
        updatedAt: new Date('2020-01-01')
      })
    );
  });

  // 11. Malicious ID Injection
  it('Malicious ID Injection: Complaint ID too long', async () => {
    const db = testEnv.authenticatedContext('asad123', { email: 'asad@test.com' }).firestore();
    const maliciousId = 'a'.repeat(200);
    await assertFails(
      db.collection('complaints').doc(maliciousId).set({
        userId: 'asad123',
        title: 'Broken Light',
        category: 'Infrastructure',
        locationName: 'Street 1',
        latitude: 12.9,
        longitude: 77.5,
        status: 'Pending Review',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    );
  });

  // 12. Unauthorized Update
  it('Unauthorized Update: Citizen updating status to Resolved', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      await context.firestore().collection('complaints').doc('comp1').set({
        userId: 'asad123',
        title: 'Broken Light',
        category: 'Infrastructure',
        locationName: 'Street 1',
        latitude: 12.9,
        longitude: 77.5,
        status: 'Pending Review',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    const db = testEnv.authenticatedContext('asad123', { email: 'asad@test.com' }).firestore();
    await assertFails(
      db.collection('complaints').doc('comp1').update({
        status: 'Resolved',
        updatedAt: serverTimestamp()
      })
    );
  });
});
