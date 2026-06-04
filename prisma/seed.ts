import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── 0. Clean up existing data ────────────────────────────────────
  console.log('  🧹 Cleaning existing data...');
  await prisma.notification.deleteMany();
  await prisma.unlockedDocument.deleteMany();
  await prisma.consentShare.deleteMany();
  await prisma.shareRequest.deleteMany();
  await prisma.creditTransaction.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.skillRating.deleteMany();
  await prisma.candidateChecklistResponse.deleteMany();
  await prisma.checklistRequest.deleteMany();
  await prisma.credential.deleteMany();
  await prisma.resume.deleteMany();
  await prisma.candidateProfile.deleteMany();
  await prisma.candidateReference.deleteMany();
  await prisma.referenceResponse.deleteMany();
  await prisma.referenceQuestion.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.documentFlag.deleteMany();
  await prisma.systemErrorLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.pendingReminder.deleteMany();
  await prisma.automatedRule.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.platformSetting.deleteMany();
  await prisma.adminPermission.deleteMany();
  await prisma.inviteToken.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.checklistTemplate.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  console.log('  ✓ Data cleaned');

  // Hash the default password
  const passwordHash = await bcrypt.hash('Admin123!', 12);

  // ─── 1. Create Organization ─────────────────────────────────────
  const org = await prisma.organization.create({
    data: {
      name: 'Acme Staffing',
      credits_balance: 85,
      baa_status: 'pending',
      seat_limit: 5,
    },
  });
  console.log(`  ✓ Organization: ${org.name} (id=${org.id})`);

  // ─── 2. Create Users ────────────────────────────────────────────
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@myzipvault.com',
      password_hash: passwordHash,
      role: 'super_admin',
      is_approved: true,
      first_name: 'Super',
      last_name: 'Admin',
    },
  });
  console.log(`  ✓ Super Admin: ${superAdmin.email}`);

  const platformAdmin = await prisma.user.create({
    data: {
      email: 'admin@myzipvault.com',
      password_hash: passwordHash,
      role: 'platform_admin',
      is_approved: true,
      first_name: 'Platform',
      last_name: 'Admin',
    },
  });
  console.log(`  ✓ Platform Admin: ${platformAdmin.email}`);

  const clientAdmin = await prisma.user.create({
    data: {
      email: 'clientadmin@acme.com',
      password_hash: passwordHash,
      role: 'client_admin',
      organization_id: org.id,
      is_approved: true,
      first_name: 'Client',
      last_name: 'Admin',
      last_activity_at: new Date(),
    },
  });
  console.log(`  ✓ Client Admin: ${clientAdmin.email}`);

  const clientRecruiter = await prisma.user.create({
    data: {
      email: 'recruiter@acme.com',
      password_hash: passwordHash,
      role: 'client_recruiter',
      organization_id: org.id,
      is_approved: true,
      first_name: 'Sarah',
      last_name: 'Recruiter',
      last_activity_at: new Date(Date.now() - 3600000),
    },
  });
  console.log(`  ✓ Client Recruiter: ${clientRecruiter.email}`);

  // ─── 3. Create Candidates ───────────────────────────────────────
  const candidates = [];
  const candidateData = [
    { email: 'nurse@example.com', first: 'Jane', last: 'Nurse', phone: '(555) 123-4567' },
    { email: 'john.icu@email.com', first: 'John', last: 'Smith', phone: '(555) 234-5678' },
    { email: 'maria.er@email.com', first: 'Maria', last: 'Garcia', phone: '(555) 345-6789' },
    { email: 'david.or@email.com', first: 'David', last: 'Chen', phone: '(555) 456-7890' },
    { email: 'lisa.peds@email.com', first: 'Lisa', last: 'Johnson', phone: '(555) 567-8901' },
  ];

  for (const cd of candidateData) {
    const candidate = await prisma.user.create({
      data: {
        email: cd.email,
        password_hash: passwordHash,
        role: 'candidate',
        is_approved: true,
        first_name: cd.first,
        last_name: cd.last,
        phone: cd.phone,
        last_activity_at: new Date(Date.now() - Math.random() * 7 * 24 * 3600000),
      },
    });
    candidates.push(candidate);

    await prisma.candidateProfile.create({
      data: {
        user_id: candidate.id,
        first_name: cd.first,
        last_name: cd.last,
        phone: cd.phone,
        profile_completion_pct: Math.floor(Math.random() * 60) + 40,
      },
    });
  }
  console.log(`  ✓ Candidates: ${candidates.length} created`);

  // ─── 4. Create Checklist Templates ──────────────────────────────
  const templates = [];
  const templateData = [
    { profession: 'RN', specialty: 'ICU', name: 'ICU Nurse Skills Checklist' },
    { profession: 'RN', specialty: 'ER', name: 'Emergency Room Nurse Skills Checklist' },
    { profession: 'RN', specialty: 'OR', name: 'Operating Room Nurse Skills Checklist' },
    { profession: 'RN', specialty: 'Pediatrics', name: 'Pediatric Nurse Skills Checklist' },
    { profession: 'RN', specialty: 'MedSurg', name: 'Medical-Surgical Nurse Skills Checklist' },
    { profession: 'LPN', specialty: 'General', name: 'LPN General Skills Checklist' },
    { profession: 'CNA', specialty: 'General', name: 'CNA Skills Checklist' },
    { profession: 'RT', specialty: 'General', name: 'Respiratory Therapist Skills Checklist' },
  ];

  for (const td of templateData) {
    const template = await prisma.checklistTemplate.create({
      data: {
        profession: td.profession,
        specialty: td.specialty,
        name: td.name,
        is_active: true,
      },
    });
    templates.push(template);
  }
  console.log(`  ✓ Checklist Templates: ${templates.length} created`);

  // ─── 5. Create Skills for first template ────────────────────────
  const skillsData = [
    { skill_name: 'Patient Assessment', category: 'Patient Care', question_type: 'rating_1_5', sort_order: 1 },
    { skill_name: 'Vital Signs Monitoring', category: 'Patient Care', question_type: 'rating_1_5', sort_order: 2 },
    { skill_name: 'IV Line Management', category: 'Patient Care', question_type: 'rating_1_5', sort_order: 3 },
    { skill_name: 'Wound Care & Dressing', category: 'Patient Care', question_type: 'yes_no', sort_order: 4 },
    { skill_name: 'Ventilator Management', category: 'Equipment', question_type: 'rating_1_5', sort_order: 5 },
    { skill_name: 'Cardiac Monitor Interpretation', category: 'Equipment', question_type: 'rating_1_5', sort_order: 6 },
    { skill_name: 'Defibrillator Operation', category: 'Equipment', question_type: 'yes_no', sort_order: 7 },
    { skill_name: 'Medication Administration', category: 'Medications', question_type: 'rating_1_5', sort_order: 8 },
    { skill_name: 'Dosage Calculation', category: 'Medications', question_type: 'rating_1_5', sort_order: 9 },
    { skill_name: 'Blood Transfusion Protocol', category: 'Medications', question_type: 'yes_no', sort_order: 10 },
    { skill_name: 'Code Blue Response', category: 'Critical Care', question_type: 'rating_1_5', sort_order: 11 },
    { skill_name: 'Central Line Care', category: 'Critical Care', question_type: 'rating_1_5', sort_order: 12 },
    { skill_name: 'Patient & Family Education', category: 'Communication', question_type: 'rating_1_5', sort_order: 13 },
    { skill_name: 'Shift Handoff / SBAR', category: 'Communication', question_type: 'rating_1_5', sort_order: 14 },
  ];

  for (const skill of skillsData) {
    await prisma.skill.create({
      data: {
        checklist_template_id: templates[0].id,
        skill_name: skill.skill_name,
        category: skill.category,
        question_type: skill.question_type,
        sort_order: skill.sort_order,
        has_na_option: true,
      },
    });
  }
  console.log(`  ✓ Skills: ${skillsData.length} created for ICU template`);

  // Add skills for ER template
  const erSkills = [
    { skill_name: 'Triage Assessment', category: 'Patient Care', question_type: 'rating_1_5', sort_order: 1 },
    { skill_name: 'Trauma Assessment', category: 'Patient Care', question_type: 'rating_1_5', sort_order: 2 },
    { skill_name: 'Wound Management', category: 'Patient Care', question_type: 'rating_1_5', sort_order: 3 },
    { skill_name: 'Chest Tube Management', category: 'Procedures', question_type: 'rating_1_5', sort_order: 4 },
    { skill_name: 'Intubation Assist', category: 'Procedures', question_type: 'yes_no', sort_order: 5 },
    { skill_name: 'Conscious Sedation Monitoring', category: 'Medications', question_type: 'rating_1_5', sort_order: 6 },
  ];
  for (const skill of erSkills) {
    await prisma.skill.create({
      data: {
        checklist_template_id: templates[1].id,
        skill_name: skill.skill_name,
        category: skill.category,
        question_type: skill.question_type,
        sort_order: skill.sort_order,
        has_na_option: true,
      },
    });
  }
  console.log(`  ✓ Skills: ${erSkills.length} created for ER template`);

  // ─── 6. Create Checklist Requests ───────────────────────────────
  const now = Date.now();
  const checklistRequests = [];

  // Jane Nurse - completed checklist
  const cr1 = await prisma.checklistRequest.create({
    data: {
      client_user_id: clientRecruiter.id,
      candidate_user_id: candidates[0].id,
      checklist_template_id: templates[0].id,
      status: 'completed',
      completion_pct: 100,
      opened_at: new Date(now - 10 * 24 * 3600000),
      created_at: new Date(now - 12 * 24 * 3600000),
    },
  });
  checklistRequests.push(cr1);

  // John Smith - in progress
  const cr2 = await prisma.checklistRequest.create({
    data: {
      client_user_id: clientRecruiter.id,
      candidate_user_id: candidates[1].id,
      checklist_template_id: templates[0].id,
      status: 'in_progress',
      completion_pct: 65,
      opened_at: new Date(now - 3 * 24 * 3600000),
      created_at: new Date(now - 5 * 24 * 3600000),
    },
  });
  checklistRequests.push(cr2);

  // Maria Garcia - sent (not yet opened)
  const cr3 = await prisma.checklistRequest.create({
    data: {
      client_user_id: clientRecruiter.id,
      candidate_user_id: candidates[2].id,
      checklist_template_id: templates[1].id,
      status: 'sent',
      completion_pct: 0,
      created_at: new Date(now - 1 * 24 * 3600000),
    },
  });
  checklistRequests.push(cr3);

  // David Chen - in progress
  const cr4 = await prisma.checklistRequest.create({
    data: {
      client_user_id: clientAdmin.id,
      candidate_user_id: candidates[3].id,
      checklist_template_id: templates[3].id,
      status: 'in_progress',
      completion_pct: 30,
      opened_at: new Date(now - 2 * 24 * 3600000),
      created_at: new Date(now - 4 * 24 * 3600000),
    },
  });
  checklistRequests.push(cr4);

  // Lisa Johnson - completed
  const cr5 = await prisma.checklistRequest.create({
    data: {
      client_user_id: clientRecruiter.id,
      candidate_user_id: candidates[4].id,
      checklist_template_id: templates[2].id,
      status: 'completed',
      completion_pct: 100,
      opened_at: new Date(now - 8 * 24 * 3600000),
      created_at: new Date(now - 14 * 24 * 3600000),
    },
  });
  checklistRequests.push(cr5);

  console.log(`  ✓ Checklist Requests: ${checklistRequests.length} created`);

  // ─── 7. Create Candidate Checklist Response for completed ones ──
  const response1 = await prisma.candidateChecklistResponse.create({
    data: {
      candidate_user_id: candidates[0].id,
      checklist_template_id: templates[0].id,
      status: 'submitted',
      valid_until: new Date(now + 30 * 24 * 3600000),
      submitted_at: new Date(now - 9 * 24 * 3600000),
      digital_signature: 'data:image/png;base64,signature1',
      candidate_name_signed: 'Jane Nurse',
      signature_date: new Date(now - 9 * 24 * 3600000),
    },
  });

  const response5 = await prisma.candidateChecklistResponse.create({
    data: {
      candidate_user_id: candidates[4].id,
      checklist_template_id: templates[2].id,
      status: 'submitted',
      valid_until: new Date(now + 30 * 24 * 3600000),
      submitted_at: new Date(now - 7 * 24 * 3600000),
      digital_signature: 'data:image/png;base64,signature2',
      candidate_name_signed: 'Lisa Johnson',
      signature_date: new Date(now - 7 * 24 * 3600000),
    },
  });

  // Update checklist requests with response IDs
  await prisma.checklistRequest.update({
    where: { id: cr1.id },
    data: { candidate_response_id: response1.id },
  });
  await prisma.checklistRequest.update({
    where: { id: cr5.id },
    data: { candidate_response_id: response5.id },
  });

  // Create skill ratings for completed response
  const skills = await prisma.skill.findMany({
    where: { checklist_template_id: templates[0].id },
  });
  for (const skill of skills) {
    await prisma.skillRating.create({
      data: {
        checklist_response_id: response1.id,
        skill_id: skill.id,
        rating_value: String(Math.floor(Math.random() * 3) + 3), // 3-5
        is_na: false,
      },
    });
  }
  console.log('  ✓ Checklist Responses & Skill Ratings created');

  // ─── 8. Create Credentials for candidates ───────────────────────
  const creds = [];
  for (let i = 0; i < candidates.length; i++) {
    const cred = await prisma.credential.create({
      data: {
        candidate_user_id: candidates[i].id,
        document_name: i % 2 === 0 ? 'BLS Certification' : 'ACLS Certification',
        file_url: `/uploads/credential_${i + 1}.pdf`,
        expiration_date: new Date(now + (180 + Math.random() * 180) * 24 * 3600000),
        reminder_enabled: true,
        status: 'active',
        verification_status: 'verified',
        uploaded_at: new Date(now - (30 + Math.random() * 60) * 24 * 3600000),
      },
    });
    creds.push(cred);
  }
  console.log(`  ✓ Credentials: ${creds.length} created`);

  // ─── 9. Create Resumes ──────────────────────────────────────────
  for (let i = 0; i < candidates.length; i++) {
    await prisma.resume.create({
      data: {
        candidate_user_id: candidates[i].id,
        file_url: `/uploads/resume_${i + 1}.pdf`,
        parsed_data: JSON.stringify({ summary: `${candidates[i].first_name} is an experienced healthcare professional.` }),
        is_builder_resume: i % 2 === 0,
      },
    });
  }
  console.log(`  ✓ Resumes: ${candidates.length} created`);

  // ─── 10. Create Consent Shares ──────────────────────────────────
  const shares = [];
  // Jane Nurse shared checklist with recruiter
  const share1 = await prisma.consentShare.create({
    data: {
      candidate_user_id: candidates[0].id,
      client_user_id: clientRecruiter.id,
      checklist_response_id: response1.id,
      shared_at: new Date(now - 8 * 24 * 3600000),
      expires_at: new Date(now + 22 * 24 * 3600000),
    },
  });
  shares.push(share1);

  // Jane Nurse shared resume
  const resume0 = await prisma.resume.findFirst({ where: { candidate_user_id: candidates[0].id } });
  let share2Id = 0;
  let resume0Id = 0;
  if (resume0) {
    const share2 = await prisma.consentShare.create({
      data: {
        candidate_user_id: candidates[0].id,
        client_user_id: clientRecruiter.id,
        resume_id: resume0.id,
        shared_at: new Date(now - 8 * 24 * 3600000),
        expires_at: new Date(now + 22 * 24 * 3600000),
      },
    });
    shares.push(share2);
    share2Id = share2.id;
    resume0Id = resume0.id;
  }

  // Jane Nurse shared credential (BLS)
  const share3 = await prisma.consentShare.create({
    data: {
      candidate_user_id: candidates[0].id,
      client_user_id: clientRecruiter.id,
      credential_id: creds[0].id,
      shared_at: new Date(now - 7 * 24 * 3600000),
      expires_at: new Date(now + 23 * 24 * 3600000),
    },
  });
  shares.push(share3);

  // Lisa Johnson shared checklist
  const share4 = await prisma.consentShare.create({
    data: {
      candidate_user_id: candidates[4].id,
      client_user_id: clientRecruiter.id,
      checklist_response_id: response5.id,
      shared_at: new Date(now - 6 * 24 * 3600000),
      expires_at: new Date(now + 24 * 24 * 3600000),
    },
  });
  shares.push(share4);

  console.log(`  ✓ Consent Shares: ${shares.length} created`);

  // ─── 11. Create Unlocked Documents ──────────────────────────────
  // Recruiter unlocked Jane's checklist and resume
  await prisma.unlockedDocument.create({
    data: {
      client_user_id: clientRecruiter.id,
      consent_share_id: share1.id,
      entity_type: 'checklist',
      entity_id: response1.id,
      credits_charged: 1,
      unlocked_at: new Date(now - 7 * 24 * 3600000),
    },
  });

  if (share2Id && resume0Id) {
    await prisma.unlockedDocument.create({
      data: {
        client_user_id: clientRecruiter.id,
        consent_share_id: share2Id,
        entity_type: 'resume',
        entity_id: resume0Id,
        credits_charged: 1,
        unlocked_at: new Date(now - 7 * 24 * 3600000),
      },
    });
  }

  console.log('  ✓ Unlocked Documents: 2 created');

  // ─── 12. Create Candidate References ────────────────────────────
  await prisma.candidateReference.create({
    data: {
      candidate_user_id: candidates[0].id,
      manager_email: 'manager@hospital.com',
      manager_phone: '(555) 999-0000',
      facility_name: 'City General Hospital',
      employment_status: 'current',
      status: 'completed',
      requested_at: new Date(now - 20 * 24 * 3600000),
    },
  });

  await prisma.candidateReference.create({
    data: {
      candidate_user_id: candidates[0].id,
      manager_email: 'manager2@hospital.com',
      manager_phone: '(555) 888-0000',
      facility_name: 'Metro Medical Center',
      employment_status: 'past',
      status: 'pending_request',
      requested_at: new Date(now - 2 * 24 * 3600000),
    },
  });
  console.log('  ✓ Candidate References: 2 created');

  // ─── 13. Create Platform Settings ───────────────────────────────
  const baaContent = `BUSINESS ASSOCIATE AGREEMENT

This Business Associate Agreement ("Agreement") is entered into by and between MyZipVault, Inc. ("Business Associate") and the undersigned healthcare organization ("Covered Entity").

1. PURPOSE
This Agreement is entered into to comply with the Health Insurance Portability and Accountability Act of 1996 ("HIPAA"), the Health Information Technology for Economic and Clinical Health Act ("HITECH Act"), and their implementing regulations.

2. DEFINITIONS
2.1 "Protected Health Information" or "PHI" means individually identifiable health information held by Business Associate on behalf of Covered Entity.
2.2 "Breach" means the acquisition, access, use, or disclosure of PHI in a manner not permitted by HIPAA.
2.3 "Designated Record Set" means a group of records maintained by or for Covered Entity.

3. OBLIGATIONS OF BUSINESS ASSOCIATE
3.1 Business Associate shall not use or disclose PHI other than as permitted or required by this Agreement or as required by law.
3.2 Business Associate shall implement appropriate safeguards to prevent use or disclosure of PHI other than as provided for by this Agreement.
3.3 Business Associate shall report to Covered Entity any use or disclosure of PHI not provided for by this Agreement of which Business Associate becomes aware, including any Breach of Unsecured PHI.
3.4 Business Associate shall ensure that any subcontractors that create, receive, maintain, or transmit PHI on behalf of Business Associate agree to the same restrictions and conditions that apply to Business Associate.

4. OBLIGATIONS OF COVERED ENTITY
4.1 Covered Entity shall not request Business Associate to use or disclose PHI in any manner that would not be permissible under HIPAA if done by Covered Entity.
4.2 Covered Entity shall notify Business Associate of any limitation(s) in its notice of privacy practices or any changes to permission or restriction.

5. TERM AND TERMINATION
5.1 This Agreement shall be effective as of the date of execution and shall terminate upon the earlier of: (a) termination of the service agreement between the parties; or (b) mutual written agreement.
5.2 Upon termination, Business Associate shall return or destroy all PHI received from Covered Entity.

6. MISCELLANEOUS
6.1 This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware.
6.2 Any ambiguity in this Agreement shall be resolved in favor of a interpretation that permits compliance with HIPAA.
6.3 This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date set forth below.`;

  const platformSettings = [
    { setting_key: 'checklist_validity_days', setting_value: '30' },
    { setting_key: 'share_expiry_options', setting_value: '7,14,30' },
    { setting_key: 'credit_cost_per_document', setting_value: '1' },
    { setting_key: 'baa_content', setting_value: baaContent },
    { setting_key: 'baa_required', setting_value: 'true' },
    { setting_key: 'sms_enabled', setting_value: 'false' },
    { setting_key: 'credit_price_per_unit', setting_value: '2.99' },
  ];

  for (const setting of platformSettings) {
    await prisma.platformSetting.create({ data: setting });
  }
  console.log(`  ✓ Platform Settings: ${platformSettings.length} created`);

  // ─── 14. Create Feature Flags ───────────────────────────────────
  const featureFlags = [
    { flag_name: 'sms_notifications', is_enabled: false },
    { flag_name: 'resume_builder', is_enabled: true },
    { flag_name: 'reference_engine', is_enabled: true },
    { flag_name: 'credit_upsell', is_enabled: true },
    { flag_name: 'document_verification_queue', is_enabled: true },
  ];

  for (const flag of featureFlags) {
    await prisma.featureFlag.create({ data: flag });
  }
  console.log(`  ✓ Feature Flags: ${featureFlags.length} created`);

  // ─── 15. Create Email Templates ─────────────────────────────────
  const emailTemplates = [
    {
      template_key: 'checklist_request',
      subject: 'Skills Checklist Request from {{client_name}}',
      body: 'Hello {{candidate_name}},\n\n{{client_name}} has requested that you complete the {{checklist_name}} skills checklist.\n\nPlease log in to your MyZipVault account to complete this checklist at your earliest convenience.\n\nIf you have any questions, please contact {{client_name}} directly.\n\nThank you,\nMyZipVault Team',
    },
    {
      template_key: 'existing_candidate_checklist',
      subject: 'New Checklist Request from {{client_name}}',
      body: 'Hello {{candidate_name}},\n\n{{client_name}} has sent you a new skills checklist request.\n\nPlease log in to your MyZipVault account to view and complete this request.\n\nThank you,\nMyZipVault Team',
    },
    {
      template_key: 'candidate_invite',
      subject: 'You\'re Invited to MyZipVault!',
      body: 'Hello {{candidate_name}},\n\n{{client_name}} has invited you to join MyZipVault to complete a skills checklist.\n\nPlease click the following link to set up your account:\n{{invite_link}}\n\nThank you,\nMyZipVault Team',
    },
    {
      template_key: 'checklist_reminder',
      subject: 'Reminder: Complete Your Skills Checklist',
      body: 'Hello {{candidate_name}},\n\nThis is a friendly reminder that you still have a pending skills checklist request from {{client_name}}.\n\nPlease log in to your MyZipVault account to complete the {{checklist_name}} checklist.\n\nThank you,\nMyZipVault Team',
    },
    {
      template_key: 'reference_request',
      subject: 'Reference Request for {{candidate_name}}',
      body: 'Hello {{manager_name}},\n\n{{candidate_name}} has listed you as a professional reference from {{facility_name}}.\n\nPlease log in to MyZipVault to complete the reference questionnaire.\n\nThank you for your time,\nMyZipVault Team',
    },
    {
      template_key: 'reference_reminder',
      subject: 'Reminder: Reference Request for {{candidate_name}}',
      body: 'Hello {{manager_name}},\n\nThis is a reminder that {{candidate_name}} has requested a professional reference from you.\n\nPlease log in to MyZipVault to complete the reference questionnaire.\n\nThank you,\nMyZipVault Team',
    },
    {
      template_key: 'credential_expiry_warning',
      subject: 'Credential Expiring Soon: {{credential_name}}',
      body: 'Hello {{candidate_name}},\n\nYour credential "{{credential_name}}" is set to expire on {{expiration_date}}.\n\nPlease update your credentials in MyZipVault to keep your profile current.\n\nThank you,\nMyZipVault Team',
    },
    {
      template_key: 'consent_share_notification',
      subject: '{{client_name}} Has Requested Access to Your Documents',
      body: 'Hello {{candidate_name}},\n\n{{client_name}} has requested access to your documents on MyZipVault.\n\nPlease log in to review and approve or deny this request.\n\nThank you,\nMyZipVault Team',
    },
    {
      template_key: 'document_unlocked',
      subject: 'Document Unlocked: {{document_type}}',
      body: 'Hello {{client_name}},\n\nThe {{document_type}} for {{candidate_name}} has been unlocked and is now available for viewing.\n\nThank you,\nMyZipVault Team',
    },
    {
      template_key: 'account_approval',
      subject: 'Your MyZipVault Account Has Been Approved',
      body: 'Hello {{user_name}},\n\nYour MyZipVault account has been approved. You can now log in and start using the platform.\n\nThank you,\nMyZipVault Team',
    },
    {
      template_key: 'welcome_candidate',
      subject: 'Welcome to MyZipVault!',
      body: 'Hello {{candidate_name}},\n\nWelcome to MyZipVault! Your account has been created.\n\nPlease log in to complete your profile, upload credentials, and build your professional resume.\n\nThank you,\nMyZipVault Team',
    },
    {
      template_key: 'welcome_client',
      subject: 'Welcome to MyZipVault!',
      body: 'Hello {{client_name}},\n\nWelcome to MyZipVault! Your organization account has been set up.\n\nYou can now start requesting skills checklists, verifying credentials, and connecting with healthcare professionals.\n\nThank you,\nMyZipVault Team',
    },
    {
      template_key: 'password_reset',
      subject: 'Reset Your MyZipVault Password',
      body: 'Hello {{user_name}},\n\nWe received a request to reset your password. Please click the link below to set a new password:\n\n{{reset_link}}\n\nIf you did not request this, please ignore this email.\n\nThank you,\nMyZipVault Team',
    },
    {
      template_key: 'credit_low_warning',
      subject: 'Low Credit Balance Alert',
      body: 'Hello {{admin_name}},\n\nYour organization {{organization_name}} has a low credit balance of {{credits_balance}} credits remaining.\n\nPlease purchase additional credits to ensure uninterrupted access to document verification services.\n\nThank you,\nMyZipVault Team',
    },
    {
      template_key: 'manager_invite',
      subject: "You're Invited to Complete a Reference for {{nurse_name}}",
      body: 'Hello {{manager_name}},\n\n{{nurse_name}} has listed you as a professional reference and we would like to invite you to complete a reference on their behalf.\n\n{{nurse_name}} is seeking opportunities at {{facility_name}} and your feedback would be greatly valued.\n\nPlease click the following link to complete the reference questionnaire:\n{{invite_link}}\n\nThank you for your time and consideration,\nMyZipVault Team',
    },
    {
      template_key: 'credential_rejected',
      subject: 'Credential Rejected: {{document_name}}',
      body: 'Hello {{candidate_name}},\n\nWe regret to inform you that your credential "{{document_name}}" has been rejected after review.\n\nReview Notes: {{review_notes}}\n\nPlease log in to your MyZipVault account to address the issues and re-upload the corrected document.\n\n{{login_link}}\n\nThank you,\nMyZipVault Team',
    },
    {
      template_key: 'low_credit_alert',
      subject: 'Low Credit Balance Alert - {{organization_name}}',
      body: 'Hello,\n\nThis is an alert that your organization {{organization_name}} has a critically low credit balance of {{credits_remaining}} credits remaining.\n\nTo avoid any interruption in service, please purchase additional credits at your earliest convenience.\n\n{{purchase_link}}\n\nThank you,\nMyZipVault Team',
    },
    {
      template_key: 'baa_expiry',
      subject: 'BAA Expiration Notice - {{organization_name}}',
      body: 'Hello {{organization_name}},\n\nThis notice is to inform you that your Business Associate Agreement (BAA) is approaching its expiration date on {{expiry_date}}.\n\nTo ensure continued compliance with HIPAA regulations and uninterrupted access to platform services, please renew your BAA before it expires.\n\n{{renewal_link}}\n\nIf you have any questions, please contact our support team.\n\nThank you,\nMyZipVault Team',
    },
    {
      template_key: 'account_suspension_confirmation',
      subject: 'Account Scheduled for Deletion',
      body: 'Hello {{candidate_name}},\n\nWe are writing to confirm that your MyZipVault account has been scheduled for deletion on {{deletion_date}}.\n\nYou are currently within the grace period. If you wish to keep your account active, please contact our support team before the deletion date.\n\n{{support_link}}\n\nThank you,\nMyZipVault Team',
    },
  ];

  for (const tmpl of emailTemplates) {
    await prisma.emailTemplate.create({ data: tmpl });
  }
  console.log(`  ✓ Email Templates: ${emailTemplates.length} created`);

  // ─── 16. Create Automated Rules ─────────────────────────────────
  const referenceReminderTemplate = await prisma.emailTemplate.findUnique({
    where: { template_key: 'reference_reminder' },
  });
  const credentialExpiryTemplate = await prisma.emailTemplate.findUnique({
    where: { template_key: 'credential_expiry_warning' },
  });

  await prisma.automatedRule.create({
    data: {
      rule_name: 'reference_reminder_3_day',
      trigger_condition: JSON.stringify({
        event: 'reference_request_sent',
        delay_days: 3,
        condition: 'status == pending_request',
      }),
      action_type: 'email',
      template_id: referenceReminderTemplate?.id ?? null,
      is_active: true,
    },
  });

  await prisma.automatedRule.create({
    data: {
      rule_name: 'credential_expiry_30_day',
      trigger_condition: JSON.stringify({
        event: 'credential_expiry_approaching',
        days_before_expiry: 30,
        condition: 'reminder_enabled == true',
      }),
      action_type: 'email',
      template_id: credentialExpiryTemplate?.id ?? null,
      is_active: true,
    },
  });

  const baaExpiryTemplate = await prisma.emailTemplate.findUnique({
    where: { template_key: 'baa_expiry' },
  });

  await prisma.automatedRule.create({
    data: {
      rule_name: 'baa_expiry_reminder',
      trigger_condition: JSON.stringify({
        event: 'baa_expiry_approaching',
        days_before_expiry: 30,
        condition: 'baa_status == active',
      }),
      action_type: 'email',
      template_id: baaExpiryTemplate?.id ?? null,
      is_active: true,
    },
  });
  console.log('  ✓ Automated Rules: 3 created');

  // ─── 17. Create Reference Questions ─────────────────────────────
  const currentQuestions = [
    { employment_status: 'current', question_text: 'Is this candidate currently employed at your facility?', response_type: 'yes_no', sort_order: 1 },
    { employment_status: 'current', question_text: 'How would you rate the candidate\'s clinical competence?', response_type: 'rating_1_5', sort_order: 2 },
    { employment_status: 'current', question_text: 'How would you rate the candidate\'s professionalism and work ethic?', response_type: 'rating_1_5', sort_order: 3 },
    { employment_status: 'current', question_text: 'Does the candidate work well within a team?', response_type: 'rating_1_5', sort_order: 4 },
    { employment_status: 'current', question_text: 'Would you recommend this candidate for a similar position?', response_type: 'yes_no', sort_order: 5 },
  ];

  const endingContractQuestions = [
    { employment_status: 'ending_contract', question_text: 'Is this candidate\'s contract ending on schedule?', response_type: 'yes_no', sort_order: 1 },
    { employment_status: 'ending_contract', question_text: 'How would you rate the candidate\'s overall performance during the contract?', response_type: 'rating_1_5', sort_order: 2 },
    { employment_status: 'ending_contract', question_text: 'Did the candidate fulfill all contract obligations satisfactorily?', response_type: 'yes_no', sort_order: 3 },
    { employment_status: 'ending_contract', question_text: 'How would you rate the candidate\'s adaptability to changing situations?', response_type: 'rating_1_5', sort_order: 4 },
    { employment_status: 'ending_contract', question_text: 'Would you rehire this candidate for a future contract?', response_type: 'yes_no', sort_order: 5 },
  ];

  const pastQuestions = [
    { employment_status: 'past', question_text: 'How long did the candidate work at your facility?', response_type: 'text', sort_order: 1 },
    { employment_status: 'past', question_text: 'How would you rate the candidate\'s clinical skills during their employment?', response_type: 'rating_1_5', sort_order: 2 },
    { employment_status: 'past', question_text: 'Was the candidate\'s departure voluntary?', response_type: 'yes_no', sort_order: 3 },
    { employment_status: 'past', question_text: 'How would you rate the candidate\'s reliability and attendance?', response_type: 'rating_1_5', sort_order: 4 },
    { employment_status: 'past', question_text: 'Would you recommend this candidate for rehire?', response_type: 'yes_no', sort_order: 5 },
  ];

  const allRefQuestions = [...currentQuestions, ...endingContractQuestions, ...pastQuestions];
  for (const q of allRefQuestions) {
    await prisma.referenceQuestion.create({ data: q });
  }
  console.log(`  ✓ Reference Questions: ${allRefQuestions.length} created`);

  // ─── 18. Create Admin Permissions for platform_admin ────────────
  const adminPerms = [
    { user_id: platformAdmin.id, permission_name: 'manage_users', is_allowed: true },
    { user_id: platformAdmin.id, permission_name: 'manage_organizations', is_allowed: true },
    { user_id: platformAdmin.id, permission_name: 'manage_checklists', is_allowed: true },
    { user_id: platformAdmin.id, permission_name: 'manage_billing', is_allowed: false },
    { user_id: platformAdmin.id, permission_name: 'view_audit_logs', is_allowed: true },
    { user_id: platformAdmin.id, permission_name: 'manage_settings', is_allowed: false },
    { user_id: platformAdmin.id, permission_name: 'manage_email_templates', is_allowed: false },
  ];

  for (const perm of adminPerms) {
    await prisma.adminPermission.create({ data: perm });
  }
  console.log(`  ✓ Admin Permissions: ${adminPerms.length} created`);

  // ─── 19. Create Credit Transactions ─────────────────────────────
  const transactions = [
    { transaction_type: 'purchase', credit_amount: 100, description: 'Initial credit purchase', days_ago: 30 },
    { transaction_type: 'deduction', credit_amount: -1, description: 'Unlock checklist for Jane Nurse', days_ago: 7 },
    { transaction_type: 'deduction', credit_amount: -1, description: 'Unlock resume for Jane Nurse', days_ago: 7 },
    { transaction_type: 'deduction', credit_amount: -1, description: 'Send checklist request to Maria Garcia', days_ago: 1 },
    { transaction_type: 'deduction', credit_amount: -5, description: 'Document bundle unlock for Lisa Johnson', days_ago: 6 },
    { transaction_type: 'deduction', credit_amount: -1, description: 'Send checklist request to David Chen', days_ago: 4 },
    { transaction_type: 'deduction', credit_amount: -1, description: 'Unlock credential (BLS) for Jane Nurse', days_ago: 5 },
    { transaction_type: 'deduction', credit_amount: -5, description: 'Send checklist request to John Smith', days_ago: 5 },
  ];

  let runningBalance = 0;
  for (const tx of transactions) {
    runningBalance += tx.credit_amount;
    await prisma.creditTransaction.create({
      data: {
        organization_id: org.id,
        transaction_type: tx.transaction_type,
        credit_amount: tx.credit_amount,
        description: tx.description,
        created_at: new Date(now - tx.days_ago * 24 * 3600000),
      },
    });
  }
  console.log(`  ✓ Credit Transactions: ${transactions.length} created`);

  // ─── 20. Create Invoices ────────────────────────────────────────
  await prisma.invoice.create({
    data: {
      organization_id: org.id,
      credit_amount: 100,
      total_price: 299.00,
      pdf_url: '/invoices/INV-001.pdf',
      created_at: new Date(now - 30 * 24 * 3600000),
    },
  });
  console.log('  ✓ Invoice: 1 created');

  // ─── 21. Create Notifications ───────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { user_id: clientRecruiter.id, message: 'Jane Nurse completed the ICU Nurse Skills Checklist', type: 'checklist_completed', is_read: true, created_at: new Date(now - 9 * 24 * 3600000) },
      { user_id: clientRecruiter.id, message: 'Maria Garcia has not yet opened your checklist request', type: 'checklist_pending', is_read: false, created_at: new Date(now - 1 * 24 * 3600000) },
      { user_id: clientAdmin.id, message: 'Your BAA requires signature before accessing candidate data', type: 'baa_reminder', is_read: false, created_at: new Date(now - 2 * 24 * 3600000) },
    ],
  });
  console.log('  ✓ Notifications: 3 created');

  // ─── 22. Create welcome announcement ────────────────────────────
  await prisma.announcement.create({
    data: {
      message: 'Welcome to MyZipVault! Please complete your profile to get started.',
      target_role: 'candidate',
      is_active: true,
    },
  });
  console.log('  ✓ Welcome Announcement created');

  console.log('\n✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
