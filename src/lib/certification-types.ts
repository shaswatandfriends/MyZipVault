/**
 * Healthcare Certification Types
 *
 * Comprehensive list of nursing/healthcare certifications organized by
 * category. Used by the credential upload form to provide a searchable
 * dropdown so candidates pick from standardized names (better data
 * quality) while still allowing free-text entry for anything not listed.
 *
 * Sources: AACN, ANCC, AMSN, BCEN, NCBON, PNCB, ONCC, NCC, etc.
 */

export interface CertificationOption {
  /** Display label, e.g. "BLS (Basic Life Support)" */
  label: string;
  /** Short code, e.g. "BLS" — also used for search matching */
  code: string;
}

export interface CertificationCategory {
  /** Category heading, e.g. "Basic & Emergency Certifications" */
  category: string;
  /** Certifications in this category */
  certifications: CertificationOption[];
}

export const CERTIFICATION_CATEGORIES: CertificationCategory[] = [
  {
    category: "Basic & Emergency Certifications",
    certifications: [
      { label: "BLS (Basic Life Support)", code: "BLS" },
      { label: "ACLS (Advanced Cardiovascular Life Support)", code: "ACLS" },
      { label: "PALS (Pediatric Advanced Life Support)", code: "PALS" },
      { label: "NRP (Neonatal Resuscitation Program)", code: "NRP" },
      { label: "TNCC (Trauma Nursing Core Course)", code: "TNCC" },
      { label: "ENPC (Emergency Nursing Pediatric Course)", code: "ENPC" },
      { label: "ATCN (Advanced Trauma Care for Nurses)", code: "ATCN" },
      {
        label:
          "STABLE (Sugar, Temperature, Airway, Blood Pressure, Lab Work, Emotional Support Program)",
        code: "STABLE",
      },
    ],
  },
  {
    category: "Critical Care Certifications",
    certifications: [
      { label: "CCRN (Critical Care Registered Nurse)", code: "CCRN" },
      {
        label:
          "CCRN-K (Knowledge Professional Critical Care Registered Nurse)",
        code: "CCRN-K",
      },
      { label: "PCCN (Progressive Care Certified Nurse)", code: "PCCN" },
      {
        label:
          "PCCN-K (Knowledge Professional Progressive Care Certified Nurse)",
        code: "PCCN-K",
      },
      { label: "CMC (Cardiac Medicine Certification)", code: "CMC" },
      { label: "CSC (Cardiac Surgery Certification)", code: "CSC" },
      { label: "CCRN-E (Critical Care Registered Nurse – Tele-ICU)", code: "CCRN-E" },
      { label: "CCRN-P (Critical Care Registered Nurse – Pediatric)", code: "CCRN-P" },
      { label: "CCRN-N (Critical Care Registered Nurse – Neonatal)", code: "CCRN-N" },
    ],
  },
  {
    category: "Emergency Nursing",
    certifications: [
      { label: "CEN (Certified Emergency Nurse)", code: "CEN" },
      { label: "CPEN (Certified Pediatric Emergency Nurse)", code: "CPEN" },
      { label: "TCRN (Trauma Certified Registered Nurse)", code: "TCRN" },
      { label: "CTRN (Certified Transport Registered Nurse)", code: "CTRN" },
    ],
  },
  {
    category: "Medical-Surgical",
    certifications: [
      {
        label: "MEDSURG-BC (Medical-Surgical Nursing Board Certified)",
        code: "MEDSURG-BC",
      },
      { label: "CMSRN (Certified Medical-Surgical Registered Nurse)", code: "CMSRN" },
    ],
  },
  {
    category: "Perioperative & Surgical",
    certifications: [
      { label: "CNOR (Certified Nurse Operating Room)", code: "CNOR" },
      { label: "CSSM (Certified Surgical Services Manager)", code: "CSSM" },
      {
        label: "CRNFA (Certified Registered Nurse First Assistant)",
        code: "CRNFA",
      },
    ],
  },
  {
    category: "Oncology",
    certifications: [
      { label: "OCN (Oncology Certified Nurse)", code: "OCN" },
      { label: "AOCN (Advanced Oncology Certified Nurse)", code: "AOCN" },
      {
        label: "AOCNP (Advanced Oncology Certified Nurse Practitioner)",
        code: "AOCNP",
      },
      {
        label:
          "AOCNS (Advanced Oncology Clinical Nurse Specialist)",
        code: "AOCNS",
      },
      { label: "CPON (Certified Pediatric Oncology Nurse)", code: "CPON" },
      {
        label: "BMTCN (Blood and Marrow Transplant Certified Nurse)",
        code: "BMTCN",
      },
    ],
  },
  {
    category: "Pediatric",
    certifications: [
      { label: "CPN (Certified Pediatric Nurse)", code: "CPN" },
      { label: "PED-BC (Pediatric Nursing Board Certified)", code: "PED-BC" },
    ],
  },
  {
    category: "Neonatal",
    certifications: [
      {
        label: "RNC-NIC (Neonatal Intensive Care Nursing Certification)",
        code: "RNC-NIC",
      },
      {
        label: "RNC-LRN (Low Risk Neonatal Nursing Certification)",
        code: "RNC-LRN",
      },
      {
        label: "RNC-MNN (Maternal Newborn Nursing Certification)",
        code: "RNC-MNN",
      },
    ],
  },
  {
    category: "Women's Health & Obstetrics",
    certifications: [
      {
        label: "RNC-OB (Inpatient Obstetric Nursing Certification)",
        code: "RNC-OB",
      },
      {
        label: "RNC-MNN (Maternal Newborn Nursing Certification)",
        code: "RNC-MNN",
      },
      {
        label:
          "WHNP-BC (Women's Health Nurse Practitioner – Board Certified)",
        code: "WHNP-BC",
      },
      { label: "C-EFM (Certified Electronic Fetal Monitoring)", code: "C-EFM" },
    ],
  },
  {
    category: "Psychiatric & Mental Health",
    certifications: [
      {
        label: "PMH-BC (Psychiatric-Mental Health Nursing Board Certified)",
        code: "PMH-BC",
      },
      {
        label:
          "PMHNP-BC (Psychiatric-Mental Health Nurse Practitioner – Board Certified)",
        code: "PMHNP-BC",
      },
    ],
  },
  {
    category: "Cardiac & Vascular",
    certifications: [
      {
        label: "CV-BC (Cardiac-Vascular Nursing Board Certified)",
        code: "CV-BC",
      },
      { label: "CMC (Cardiac Medicine Certification)", code: "CMC" },
      { label: "CSC (Cardiac Surgery Certification)", code: "CSC" },
    ],
  },
  {
    category: "Orthopedic",
    certifications: [
      { label: "ONC (Orthopaedic Nurse Certified)", code: "ONC" },
    ],
  },
  {
    category: "Nephrology",
    certifications: [
      { label: "CNN (Certified Nephrology Nurse)", code: "CNN" },
      {
        label: "CNN-NP (Certified Nephrology Nurse Practitioner)",
        code: "CNN-NP",
      },
      { label: "CDN (Certified Dialysis Nurse)", code: "CDN" },
    ],
  },
  {
    category: "Diabetes",
    certifications: [
      {
        label: "CDCES (Certified Diabetes Care and Education Specialist)",
        code: "CDCES",
      },
    ],
  },
  {
    category: "Hospice & Palliative Care",
    certifications: [
      { label: "CHPN (Certified Hospice and Palliative Nurse)", code: "CHPN" },
      {
        label: "ACHPN (Advanced Certified Hospice and Palliative Nurse)",
        code: "ACHPN",
      },
    ],
  },
  {
    category: "Rehabilitation",
    certifications: [
      {
        label: "CRRN (Certified Rehabilitation Registered Nurse)",
        code: "CRRN",
      },
    ],
  },
  {
    category: "Infection Prevention",
    certifications: [
      { label: "CIC (Certification in Infection Control)", code: "CIC" },
    ],
  },
  {
    category: "Wound Care",
    certifications: [
      { label: "CWCN (Certified Wound Care Nurse)", code: "CWCN" },
      {
        label: "CWOCN (Certified Wound, Ostomy, and Continence Nurse)",
        code: "CWOCN",
      },
      { label: "CWON (Certified Wound Ostomy Nurse)", code: "CWON" },
      { label: "COCN (Certified Ostomy Care Nurse)", code: "COCN" },
      { label: "CCCN (Certified Continence Care Nurse)", code: "CCCN" },
    ],
  },
  {
    category: "Case Management",
    certifications: [
      { label: "CCM (Certified Case Manager)", code: "CCM" },
      {
        label: "CMGT-BC (Case Management Board Certified)",
        code: "CMGT-BC",
      },
    ],
  },
  {
    category: "Informatics",
    certifications: [
      { label: "NI-BC (Nursing Informatics Board Certified)", code: "NI-BC" },
    ],
  },
  {
    category: "Ambulatory Care",
    certifications: [
      {
        label: "AMB-BC (Ambulatory Care Nursing Board Certified)",
        code: "AMB-BC",
      },
    ],
  },
  {
    category: "Gerontology",
    certifications: [
      {
        label: "GERO-BC (Gerontological Nursing Board Certified)",
        code: "GERO-BC",
      },
    ],
  },
  {
    category: "Public Health & Community",
    certifications: [
      {
        label: "PHNA-BC (Public Health Nursing – Advanced Board Certified)",
        code: "PHNA-BC",
      },
    ],
  },
  {
    category: "Nursing Leadership",
    certifications: [
      { label: "NE-BC (Nurse Executive Board Certified)", code: "NE-BC" },
      {
        label: "NEA-BC (Nurse Executive Advanced Board Certified)",
        code: "NEA-BC",
      },
      {
        label: "CNML (Certified Nurse Manager and Leader)",
        code: "CNML",
      },
      { label: "CNL (Clinical Nurse Leader)", code: "CNL" },
    ],
  },
  {
    category: "Legal & Forensic",
    certifications: [
      {
        label: "SANE-A (Sexual Assault Nurse Examiner – Adult/Adolescent)",
        code: "SANE-A",
      },
      {
        label: "SANE-P (Sexual Assault Nurse Examiner – Pediatric)",
        code: "SANE-P",
      },
      { label: "DF-AFN (Advanced Forensic Nurse)", code: "DF-AFN" },
    ],
  },
  {
    category: "Advanced Practice (APRN)",
    certifications: [
      {
        label: "FNP-BC (Family Nurse Practitioner – Board Certified)",
        code: "FNP-BC",
      },
      {
        label: "FNP-C (Family Nurse Practitioner – Certified)",
        code: "FNP-C",
      },
      {
        label:
          "AGACNP-BC (Adult-Gerontology Acute Care Nurse Practitioner – Board Certified)",
        code: "AGACNP-BC",
      },
      {
        label:
          "AGPCNP-BC (Adult-Gerontology Primary Care Nurse Practitioner – Board Certified)",
        code: "AGPCNP-BC",
      },
      {
        label: "PNP-AC (Pediatric Nurse Practitioner – Acute Care)",
        code: "PNP-AC",
      },
      {
        label: "PNP-PC (Pediatric Nurse Practitioner – Primary Care)",
        code: "PNP-PC",
      },
      {
        label: "NNP-BC (Neonatal Nurse Practitioner – Board Certified)",
        code: "NNP-BC",
      },
      {
        label: "CRNA (Certified Registered Nurse Anesthetist)",
        code: "CRNA",
      },
      { label: "CNM (Certified Nurse-Midwife)", code: "CNM" },
      { label: "CNS (Clinical Nurse Specialist)", code: "CNS" },
    ],
  },
  {
    category: "Immunizations",
    certifications: [
      { label: "TB Test (PPD/QuantiFERON/T-SPOT)", code: "TB" },
      { label: "Influenza (Flu Vaccine)", code: "FLU" },
      { label: "COVID-19 Vaccination", code: "COVID" },
      { label: "Hepatitis B (HepB)", code: "HEPB" },
      { label: "MMR (Measles, Mumps & Rubella)", code: "MMR" },
      { label: "Varicella (Chickenpox)", code: "VAR" },
      { label: "Tdap (Tetanus, Diphtheria & Pertussis)", code: "TDAP" },
      { label: "Declination/Waiver Forms", code: "WAIVER" },
    ],
  },
  {
    category: "Health Screening",
    certifications: [
      { label: "Physical Examination", code: "PHY" },
      { label: "Drug Screen", code: "DRUG" },
      { label: "Fit Test (N95 Respirator)", code: "N95" },
      { label: "Respirator Medical Evaluation", code: "RESPIRATOR" },
      { label: "Mask Fit Documentation", code: "MASKFIT" },
    ],
  },
  {
    category: "Identity & Employment Documents",
    certifications: [
      { label: "Driver's License / Government ID", code: "DL" },
      { label: "Passport", code: "PASSPORT" },
      { label: "Social Security Card / SSN Verification", code: "SSN" },
      { label: "Work Authorization (I-9, EAD, Green Card, Visa)", code: "I9" },
      { label: "Professional Photo", code: "PHOTO" },
    ],
  },
  {
    category: "Background & Compliance",
    certifications: [
      { label: "Background Check", code: "BG" },
      { label: "OIG Exclusion Check", code: "OIG" },
      { label: "SAM Exclusion Check", code: "SAM" },
      { label: "National Sex Offender Registry Check", code: "NSOR" },
      { label: "Fingerprinting", code: "FINGERPRINT" },
    ],
  },
];

/**
 * Flatten the categorized list into a single searchable array.
 * Used by the combobox to filter as the user types.
 */
export const ALL_CERTIFICATIONS: CertificationOption[] =
  CERTIFICATION_CATEGORIES.flatMap((c) => c.certifications);

/**
 * Sentinel value used by the dropdown to indicate the user picked "Other".
 * The form then shows a free-text input.
 */
export const OTHER_CERTIFICATION_VALUE = "__other__";
