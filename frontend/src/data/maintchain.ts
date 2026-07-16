export type StatusTone = 'verified' | 'pending' | 'critical' | 'info';

export type TrustReplayStage = {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  details: Array<{ label: string; value: string }>;
};

export type WorkerReview = {
  id: string;
  company: string;
  ratingLabel: string;
  quote: string;
  linkedRepairId: string;
  createdAt: string;
};

export type WorkerCertificate = {
  certificateId: string;
  title: string;
  issuedAt: string;
  authority: string;
  relatedRepairId: string;
};

export type RepairRecord = {
  id: string;
  title: string;
  machineId: string;
  completedAt: string;
  location: string;
  status: StatusTone;
  partsReplaced: string[];
  evidence: Array<{ kind: 'image' | 'video' | 'document'; label: string }>;
  review: string;
  approvalChain: string[];
  blockchainHash: string;
};

export type Worker = {
  slug: string;
  name: string;
  specialization: string;
  location: string;
  country: string;
  trustScore: number;
  verifiedRepairs: number;
  globalRank: number;
  availability: string;
  industry: string;
  certifications: string[];
  equipmentExpertise: string[];
  summary: string;
  reputation: Array<{ label: string; value: number }>;
  skills: Array<{ label: string; level: string }>;
  reviews: WorkerReview[];
  certificates: WorkerCertificate[];
  repairs: RepairRecord[];
};

export type MachineEvent = {
  id: string;
  title: string;
  date: string;
  status: StatusTone;
  summary: string;
};

export type Machine = {
  id: string;
  name: string;
  industry: string;
  status: string;
  site: string;
  serial: string;
  installedAt: string;
  overview: string;
  technicians: string[];
  certificates: string[];
  inspectionReports: string[];
  events: MachineEvent[];
};

export type Certificate = {
  id: string;
  title: string;
  machineId: string;
  machineName: string;
  technician: string;
  company: string;
  repairDate: string;
  approvalChain: string[];
  verificationStatus: string;
  blockchainRecord: string;
  issuingAuthority: string;
  summary: string;
};

export type LiveNetworkEvent = {
  id: string;
  country: string;
  city: string;
  industry: string;
  equipment: string;
  repairType: string;
  title: string;
  trustCue: string;
  status: string;
  statusTone: StatusTone;
  timeWindow: string;
};

export type LeaderboardEntry = {
  rank: number;
  label: string;
  value: string;
  supportingText: string;
};

export type LeaderboardGroup = {
  id: string;
  title: string;
  description: string;
  entries: LeaderboardEntry[];
};

export type Industry = {
  slug: string;
  name: string;
  summary: string;
  trustFocus: string;
  evidenceExamples: string[];
};

export type DashboardSnapshot = {
  trustScoreToday: string;
  weeklyRank: string;
  monthlyRepairs: string;
  certificatesEarned: string;
  trustGrowth: string;
  upcomingJobs: string[];
  latestReviews: string[];
  verificationStatus: string;
};

export const trustReplayStages: TrustReplayStage[] = [
  {
    id: 'fault-detected',
    title: 'Machine Fault Detected',
    description: 'An anomaly report is logged with the asset, location, and urgency so the job enters the network with context.',
    status: 'completed',
    details: [
      { label: 'Asset', value: 'Hydraulic Press HP-2207' },
      { label: 'Urgency', value: 'High-pressure seal loss' },
      { label: 'Timestamp', value: '2026-07-04 08:16 UTC' },
      { label: 'Job ID', value: 'REC-240704-SG-118' },
    ],
  },
  {
    id: 'worker-accepts',
    title: 'Worker Accepts Job',
    description: 'A technician with matching equipment history claims the work and confirms readiness before travel.',
    status: 'completed',
    details: [
      { label: 'Technician', value: 'Elena Fischer' },
      { label: 'Expertise', value: 'Rotating equipment, fluid power' },
      { label: 'Availability', value: 'On-site within 2 hours' },
      { label: 'Trust Score', value: '99 / 100' },
    ],
  },
  {
    id: 'evidence-uploaded',
    title: 'Evidence Uploaded',
    description: 'Photos, torque readings, notes, and part identifiers are attached so the repair can be reviewed on facts.',
    status: 'completed',
    details: [
      { label: 'Media', value: '6 photos, 1 short inspection video' },
      { label: 'Parts', value: 'Seal kit SK-882, pressure line PL-14' },
      { label: 'Notes', value: 'Leak isolated to upper manifold' },
      { label: 'Hash', value: '0x8f2cabd91e4d2a7c9014e1c1' },
    ],
  },
  {
    id: 'evidence-verified',
    title: 'Evidence Verified',
    description: 'An independent reviewer checks that the uploaded proof matches the repair scope and safety requirements.',
    status: 'current',
    details: [
      { label: 'Reviewer', value: 'Plant reliability supervisor' },
      { label: 'Checklist', value: 'Safety, parts traceability, outcome evidence' },
      { label: 'Outcome', value: 'Awaiting final customer confirmation' },
      { label: 'Window', value: 'Expected close in 14 minutes' },
    ],
  },
  {
    id: 'approval-chain',
    title: 'Approval Chain Completed',
    description: 'Supervisor, customer, and compliance roles finalize the record so it is ready for permanent certification.',
    status: 'upcoming',
    details: [
      { label: 'Supervisor', value: 'Pending' },
      { label: 'Customer', value: 'Pending' },
      { label: 'Compliance', value: 'Pending' },
      { label: 'Policy', value: '3-of-3 approval required' },
    ],
  },
  {
    id: 'certificate-generated',
    title: 'Certificate Generated',
    description: 'A public certificate is issued with the machine, technician, and approval chain preserved for future verification.',
    status: 'upcoming',
    details: [
      { label: 'Certificate ID', value: 'CERT-SG-2026-118' },
      { label: 'Machine Passport', value: 'Will link on issue' },
      { label: 'Public Lookup', value: 'Searchable certificate directory' },
      { label: 'Soroban', value: 'Record after approval close' },
    ],
  },
];

export const liveNetworkEvents: LiveNetworkEvent[] = [
  {
    id: 'ln-1',
    country: 'Singapore',
    city: 'Jurong',
    industry: 'Manufacturing',
    equipment: 'Hydraulic Press',
    repairType: 'Seal Replacement',
    title: 'Hydraulic press seal replacement verified',
    trustCue: 'Evidence quality: Excellent',
    status: 'Verified',
    statusTone: 'verified',
    timeWindow: 'Last 15 minutes',
  },
  {
    id: 'ln-2',
    country: 'India',
    city: 'Mumbai',
    industry: 'Energy',
    equipment: 'Boiler System',
    repairType: 'Inspection',
    title: 'Boiler inspection completed and awaiting approval',
    trustCue: 'Review queue: 2 approvers left',
    status: 'Pending approval',
    statusTone: 'pending',
    timeWindow: 'Last hour',
  },
  {
    id: 'ln-3',
    country: 'Germany',
    city: 'Berlin',
    industry: 'Automotive',
    equipment: 'Drive Motor',
    repairType: 'Replacement',
    title: 'Drive motor replacement approved with certificate trail',
    trustCue: 'Customer confirmation attached',
    status: 'Certificate issued',
    statusTone: 'verified',
    timeWindow: 'Today',
  },
  {
    id: 'ln-4',
    country: 'South Africa',
    city: 'Johannesburg',
    industry: 'Mining',
    equipment: 'Crusher',
    repairType: 'Safety Review',
    title: 'Crusher safety review logged for auditor sign-off',
    trustCue: 'Critical machine back online',
    status: 'Compliance review',
    statusTone: 'info',
    timeWindow: 'Today',
  },
  {
    id: 'ln-5',
    country: 'United States',
    city: 'Houston',
    industry: 'Oil & Gas',
    equipment: 'Compressor',
    repairType: 'Bearing Service',
    title: 'Compressor bearing service passed final verification',
    trustCue: 'Trust score updated +1.6',
    status: 'Verified',
    statusTone: 'verified',
    timeWindow: 'Today',
  },
];

export const workers: Worker[] = [
  {
    slug: 'elena-fischer',
    name: 'Elena Fischer',
    specialization: 'Rotating Equipment Lead',
    location: 'Hamburg, Germany',
    country: 'Germany',
    trustScore: 99,
    verifiedRepairs: 308,
    globalRank: 7,
    availability: 'Bookable this week',
    industry: 'Automotive',
    certifications: ['Precision Alignment', 'Critical Systems Safety', 'Compressor Service'],
    equipmentExpertise: ['Drive Motors', 'Compressors', 'Assembly Line Pumps'],
    summary: 'Elena specializes in high-uptime production environments where evidence quality and approval accuracy matter as much as repair speed.',
    reputation: [
      { label: 'Overall Trust', value: 99 },
      { label: 'Evidence Quality', value: 96 },
      { label: 'Customer Satisfaction', value: 98 },
      { label: 'Safety', value: 99 },
      { label: 'Timeliness', value: 92 },
      { label: 'Approval Accuracy', value: 98 },
    ],
    skills: [
      { label: 'Mechanical', level: 'Expert' },
      { label: 'Electrical', level: 'Advanced' },
      { label: 'Hydraulics', level: 'Advanced' },
      { label: 'Heavy Equipment', level: 'Expert' },
    ],
    reviews: [
      {
        id: 'wr-1',
        company: 'NordWerk Manufacturing',
        ratingLabel: 'Verified review',
        quote: 'Clear evidence, disciplined handoff, and a repair record we could trust without follow-up calls.',
        linkedRepairId: 'REC-DE-4471',
        createdAt: '2026-06-28',
      },
      {
        id: 'wr-2',
        company: 'Atlas Motion Systems',
        ratingLabel: 'Verified review',
        quote: 'The approval chain was spotless and the machine passport made audit prep dramatically easier.',
        linkedRepairId: 'REC-DE-4510',
        createdAt: '2026-06-11',
      },
    ],
    certificates: [
      {
        certificateId: 'CERT-DE-4471',
        title: 'Drive Motor Replacement Certificate',
        issuedAt: '2026-06-29',
        authority: 'NordWerk Compliance Office',
        relatedRepairId: 'REC-DE-4471',
      },
      {
        certificateId: 'CERT-DE-4510',
        title: 'Compressor Alignment Certificate',
        issuedAt: '2026-06-11',
        authority: 'MaintChain Public Registry',
        relatedRepairId: 'REC-DE-4510',
      },
    ],
    repairs: [
      {
        id: 'REC-DE-4471',
        title: 'Drive motor replacement and alignment',
        machineId: 'MCH-1104',
        completedAt: '2026-06-28 16:24 UTC',
        location: 'Berlin, Germany',
        status: 'verified',
        partsReplaced: ['Motor assembly MA-44', 'Alignment coupling AC-08'],
        evidence: [
          { kind: 'image', label: 'Pre-repair vibration dashboard' },
          { kind: 'image', label: 'Post-install alignment check' },
          { kind: 'video', label: 'Run-up verification clip' },
        ],
        review: 'Customer confirmed downtime recovery within planned window.',
        approvalChain: ['Technician', 'Supervisor', 'Customer'],
        blockchainHash: '0xde44a10298cf8810a1b9b61c73d1007a',
      },
      {
        id: 'REC-DE-4510',
        title: 'Compressor bearing service',
        machineId: 'MCH-2022',
        completedAt: '2026-06-11 09:05 UTC',
        location: 'Hamburg, Germany',
        status: 'verified',
        partsReplaced: ['Bearing set BR-302', 'Seal pack SP-77'],
        evidence: [
          { kind: 'image', label: 'Bearing wear inspection' },
          { kind: 'document', label: 'Torque checklist' },
        ],
        review: 'The machine returned to line pressure without vibration drift.',
        approvalChain: ['Technician', 'Supervisor', 'Customer', 'Compliance'],
        blockchainHash: '0x5ea3cf89d102ab4d88df7754f1acbe20',
      },
    ],
  },
  {
    slug: 'ava-mensah',
    name: 'Ava Mensah',
    specialization: 'Hydraulics Specialist',
    location: 'Accra, Ghana',
    country: 'Ghana',
    trustScore: 98,
    verifiedRepairs: 264,
    globalRank: 12,
    availability: 'Available in 2 days',
    industry: 'Manufacturing',
    certifications: ['Hydraulic Diagnostics', 'Safety Champion', 'Emergency Response'],
    equipmentExpertise: ['Presses', 'Lift Systems', 'Injection Lines'],
    summary: 'Ava is known for disciplined hydraulic diagnosis and exceptionally complete evidence trails on urgent industrial repairs.',
    reputation: [
      { label: 'Overall Trust', value: 98 },
      { label: 'Evidence Quality', value: 99 },
      { label: 'Customer Satisfaction', value: 95 },
      { label: 'Safety', value: 97 },
      { label: 'Timeliness', value: 94 },
      { label: 'Approval Accuracy', value: 98 },
    ],
    skills: [
      { label: 'Hydraulics', level: 'Expert' },
      { label: 'Mechanical', level: 'Advanced' },
      { label: 'Heavy Equipment', level: 'Advanced' },
      { label: 'HVAC', level: 'Intermediate' },
    ],
    reviews: [
      {
        id: 'wr-3',
        company: 'Accra Precision Works',
        ratingLabel: 'Verified review',
        quote: 'Every replaced part was traceable and the evidence package answered our audit questions before we had them.',
        linkedRepairId: 'REC-GH-2210',
        createdAt: '2026-06-19',
      },
    ],
    certificates: [
      {
        certificateId: 'CERT-GH-2210',
        title: 'Press Hydraulic Circuit Certificate',
        issuedAt: '2026-06-19',
        authority: 'MaintChain Public Registry',
        relatedRepairId: 'REC-GH-2210',
      },
    ],
    repairs: [
      {
        id: 'REC-GH-2210',
        title: 'Hydraulic circuit pressure recovery',
        machineId: 'MCH-3301',
        completedAt: '2026-06-18 14:11 UTC',
        location: 'Tema, Ghana',
        status: 'verified',
        partsReplaced: ['Valve core VC-22', 'Pressure hose PH-09'],
        evidence: [
          { kind: 'image', label: 'Pressure manifold before repair' },
          { kind: 'video', label: 'Leak test completion' },
        ],
        review: 'Fast recovery with outstanding documentation.',
        approvalChain: ['Technician', 'Supervisor', 'Customer'],
        blockchainHash: '0x9100aa40fe3307d2b4be01855d92ce71',
      },
    ],
  },
  {
    slug: 'rohan-patel',
    name: 'Rohan Patel',
    specialization: 'Industrial Electrician',
    location: 'Pune, India',
    country: 'India',
    trustScore: 96,
    verifiedRepairs: 219,
    globalRank: 24,
    availability: 'Available today',
    industry: 'Energy',
    certifications: ['Critical Equipment Specialist', 'Zero Failed Inspection'],
    equipmentExpertise: ['Boilers', 'Control Panels', 'Power Distribution'],
    summary: 'Rohan works on high-responsibility electrical infrastructure where rapid response and clean approval chains are essential.',
    reputation: [
      { label: 'Overall Trust', value: 96 },
      { label: 'Evidence Quality', value: 92 },
      { label: 'Customer Satisfaction', value: 97 },
      { label: 'Safety', value: 99 },
      { label: 'Timeliness', value: 95 },
      { label: 'Approval Accuracy', value: 94 },
    ],
    skills: [
      { label: 'Electrical', level: 'Expert' },
      { label: 'Robotics', level: 'Intermediate' },
      { label: 'Heavy Equipment', level: 'Advanced' },
      { label: 'HVAC', level: 'Intermediate' },
    ],
    reviews: [
      {
        id: 'wr-4',
        company: 'Konkan Thermal Systems',
        ratingLabel: 'Verified review',
        quote: 'Response time was excellent and every approval step stayed visible to our operations team.',
        linkedRepairId: 'REC-IN-8702',
        createdAt: '2026-06-25',
      },
    ],
    certificates: [
      {
        certificateId: 'CERT-IN-8702',
        title: 'Boiler Control Panel Repair Certificate',
        issuedAt: '2026-06-26',
        authority: 'Konkan Thermal Compliance',
        relatedRepairId: 'REC-IN-8702',
      },
    ],
    repairs: [
      {
        id: 'REC-IN-8702',
        title: 'Boiler control panel stabilization',
        machineId: 'MCH-5512',
        completedAt: '2026-06-25 17:54 UTC',
        location: 'Mumbai, India',
        status: 'pending',
        partsReplaced: ['Contactor CT-18', 'Breaker module BM-10'],
        evidence: [
          { kind: 'image', label: 'Control panel inspection' },
          { kind: 'document', label: 'Electrical continuity report' },
        ],
        review: 'Operational recovery confirmed, final customer approval pending.',
        approvalChain: ['Technician', 'Supervisor'],
        blockchainHash: '0x8122be8f1a7849f0c12ef8c67ea41ba7',
      },
    ],
  },
];

export const machines: Machine[] = [
  {
    id: 'MCH-1104',
    name: 'Drive Motor Assembly 44',
    industry: 'Automotive',
    status: 'Passport active',
    site: 'Berlin Assembly Campus',
    serial: 'DMA-44-DE-882104',
    installedAt: '2022-03-14',
    overview: 'A mission-critical drive motor supporting a high-throughput assembly line with a complete repair and inspection history.',
    technicians: ['Elena Fischer', 'Martin Vogt'],
    certificates: ['CERT-DE-4471', 'CERT-DE-4510'],
    inspectionReports: ['Quarterly vibration report', 'Bearing wear assessment'],
    events: [
      {
        id: 'me-1',
        title: 'Installation record created',
        date: '2022-03-14',
        status: 'verified',
        summary: 'Commissioning details and baseline diagnostics captured.',
      },
      {
        id: 'me-2',
        title: 'Preventive maintenance completed',
        date: '2025-11-09',
        status: 'verified',
        summary: 'Routine alignment and lubrication recorded by verified team.',
      },
      {
        id: 'me-3',
        title: 'Drive motor replacement approved',
        date: '2026-06-28',
        status: 'verified',
        summary: 'Replacement evidence, approval chain, and certificate linked.',
      },
    ],
  },
  {
    id: 'MCH-3301',
    name: 'Hydraulic Press HP-2207',
    industry: 'Manufacturing',
    status: 'Under review',
    site: 'Tema Precision Works',
    serial: 'HP-2207-GH-3301',
    installedAt: '2021-08-02',
    overview: 'High-pressure press with frequent compliance inspections and dense evidence history for hydraulic jobs.',
    technicians: ['Ava Mensah'],
    certificates: ['CERT-GH-2210'],
    inspectionReports: ['Safety interlock inspection', 'Pressure manifold review'],
    events: [
      {
        id: 'me-4',
        title: 'Hydraulic circuit pressure recovery',
        date: '2026-06-18',
        status: 'verified',
        summary: 'Recovered operating pressure with traceable part replacement.',
      },
      {
        id: 'me-5',
        title: 'Scheduled safety inspection',
        date: '2026-07-02',
        status: 'pending',
        summary: 'Awaiting final compliance note from plant operations.',
      },
    ],
  },
  {
    id: 'MCH-5512',
    name: 'Boiler Control Array 12',
    industry: 'Energy',
    status: 'Approval pending',
    site: 'Konkan Thermal Plant',
    serial: 'BCA-12-IN-5512',
    installedAt: '2020-01-18',
    overview: 'A control system with strict uptime expectations and a strong need for documented electrical evidence.',
    technicians: ['Rohan Patel'],
    certificates: ['CERT-IN-8702'],
    inspectionReports: ['Thermal compliance log', 'Panel continuity check'],
    events: [
      {
        id: 'me-6',
        title: 'Control panel stabilization completed',
        date: '2026-06-25',
        status: 'pending',
        summary: 'Supervisor approved, customer confirmation still open.',
      },
    ],
  },
];

export const certificates: Certificate[] = [
  {
    id: 'CERT-DE-4471',
    title: 'Drive Motor Replacement Certificate',
    machineId: 'MCH-1104',
    machineName: 'Drive Motor Assembly 44',
    technician: 'Elena Fischer',
    company: 'NordWerk Manufacturing',
    repairDate: '2026-06-28',
    approvalChain: ['Technician', 'Supervisor', 'Customer'],
    verificationStatus: 'Publicly verifiable',
    blockchainRecord: '0xde44a10298cf8810a1b9b61c73d1007a',
    issuingAuthority: 'NordWerk Compliance Office',
    summary: 'Confirms machine restoration, evidence review, and completed approval chain for a critical drive motor replacement.',
  },
  {
    id: 'CERT-GH-2210',
    title: 'Hydraulic Circuit Certificate',
    machineId: 'MCH-3301',
    machineName: 'Hydraulic Press HP-2207',
    technician: 'Ava Mensah',
    company: 'Accra Precision Works',
    repairDate: '2026-06-18',
    approvalChain: ['Technician', 'Supervisor', 'Customer'],
    verificationStatus: 'Publicly verifiable',
    blockchainRecord: '0x9100aa40fe3307d2b4be01855d92ce71',
    issuingAuthority: 'MaintChain Public Registry',
    summary: 'Shows verified hydraulic pressure recovery with linked parts, evidence media, and approval records.',
  },
  {
    id: 'CERT-IN-8702',
    title: 'Boiler Control Panel Repair Certificate',
    machineId: 'MCH-5512',
    machineName: 'Boiler Control Array 12',
    technician: 'Rohan Patel',
    company: 'Konkan Thermal Systems',
    repairDate: '2026-06-25',
    approvalChain: ['Technician', 'Supervisor'],
    verificationStatus: 'Pending customer confirmation',
    blockchainRecord: '0x8122be8f1a7849f0c12ef8c67ea41ba7',
    issuingAuthority: 'Konkan Thermal Compliance',
    summary: 'Electrical stabilization record that remains visible while the final customer approval step is pending.',
  },
];

export const leaderboardGroups: LeaderboardGroup[] = [
  {
    id: 'top-worldwide',
    title: 'Top Workers Worldwide',
    description: 'Ranked by verified repair depth, evidence quality, and approval accuracy across the full network.',
    entries: [
      { rank: 1, label: 'Elena Fischer', value: 'Trust 99', supportingText: '308 verified repairs' },
      { rank: 2, label: 'Ava Mensah', value: 'Trust 98', supportingText: '264 verified repairs' },
      { rank: 3, label: 'Rohan Patel', value: 'Trust 96', supportingText: '219 verified repairs' },
    ],
  },
  {
    id: 'trust-growth',
    title: 'Highest Trust Growth',
    description: 'Workers whose recent repair history shows the strongest month-over-month trust increase.',
    entries: [
      { rank: 1, label: 'Ava Mensah', value: '+14.2%', supportingText: 'Evidence quality + safety streak' },
      { rank: 2, label: 'Rohan Patel', value: '+9.4%', supportingText: 'Fast response on critical systems' },
      { rank: 3, label: 'Elena Fischer', value: '+6.1%', supportingText: 'Zero complaint month' },
    ],
  },
  {
    id: 'evidence-quality',
    title: 'Best Evidence Quality',
    description: 'Recognizes workers whose proof packages consistently make approvals easy to review and trust.',
    entries: [
      { rank: 1, label: 'Ava Mensah', value: '99 / 100', supportingText: 'Detailed media and traceability' },
      { rank: 2, label: 'Elena Fischer', value: '96 / 100', supportingText: 'Strong inspection documentation' },
      { rank: 3, label: 'Rohan Patel', value: '92 / 100', supportingText: 'Clear electrical reports' },
    ],
  },
  {
    id: 'zero-complaint',
    title: 'Zero Complaint Workers',
    description: 'Highlights professionals maintaining flawless customer outcomes while staying fully verifiable.',
    entries: [
      { rank: 1, label: '72 workers', value: '0 complaints', supportingText: 'Across 11 countries' },
      { rank: 2, label: 'Automotive sector', value: '22 workers', supportingText: 'Highest concentration' },
      { rank: 3, label: 'Energy sector', value: '15 workers', supportingText: 'Strong growth this quarter' },
    ],
  },
];

export const industries: Industry[] = [
  {
    slug: 'manufacturing',
    name: 'Manufacturing',
    summary: 'High-throughput plants depend on trustworthy repair records that reduce downtime and simplify internal audits.',
    trustFocus: 'Parts traceability and restart confidence',
    evidenceExamples: ['Machine photos', 'Pressure readings', 'Shift handoff notes'],
  },
  {
    slug: 'automotive',
    name: 'Automotive',
    summary: 'Assembly environments need fast service backed by evidence that quality and safety standards still hold after repair.',
    trustFocus: 'Repeatability and quality assurance',
    evidenceExamples: ['Alignment reports', 'Run-up checks', 'Supervisor approvals'],
  },
  {
    slug: 'mining',
    name: 'Mining',
    summary: 'Remote and high-risk equipment work benefits from durable proof chains that remain visible long after crews leave site.',
    trustFocus: 'Remote accountability and safety verification',
    evidenceExamples: ['Safety review photos', 'Inspection videos', 'Compliance sign-off'],
  },
  {
    slug: 'oil-gas',
    name: 'Oil & Gas',
    summary: 'Strict compliance environments require transparent approval chains and machine histories that can survive regulatory review.',
    trustFocus: 'Compliance continuity',
    evidenceExamples: ['Inspection records', 'Sensor snapshots', 'Maintenance certificates'],
  },
  {
    slug: 'energy',
    name: 'Energy',
    summary: 'Critical infrastructure teams need to know who fixed what, how it was verified, and whether the system is ready for sustained load.',
    trustFocus: 'Operational readiness',
    evidenceExamples: ['Continuity checks', 'Breaker replacement logs', 'Customer confirmation'],
  },
  {
    slug: 'construction',
    name: 'Construction',
    summary: 'Field equipment changes hands across crews and locations, making portable trust especially useful.',
    trustFocus: 'Portable worker reputation',
    evidenceExamples: ['Site photos', 'Equipment inspections', 'Repair sign-off'],
  },
  {
    slug: 'pharmaceuticals',
    name: 'Pharmaceuticals',
    summary: 'Evidence-first maintenance helps preserve auditability on sensitive production lines without increasing operator overhead.',
    trustFocus: 'Clean audit trails',
    evidenceExamples: ['Sanitation proof', 'Calibration records', 'Supervisor review'],
  },
  {
    slug: 'food-processing',
    name: 'Food Processing',
    summary: 'Facilities need service records that connect machine upkeep to hygiene, uptime, and regulatory confidence.',
    trustFocus: 'Service transparency with compliance context',
    evidenceExamples: ['Inspection images', 'Parts records', 'Repair verification'],
  },
];

export const dashboardSnapshot: DashboardSnapshot = {
  trustScoreToday: '97.8',
  weeklyRank: '#9 worldwide',
  monthlyRepairs: '18 completed',
  certificatesEarned: '3 issued',
  trustGrowth: '+6.4% this month',
  upcomingJobs: [
    'Bearing inspection at Berlin Assembly Campus',
    'Hydraulic calibration review at Tema Precision Works',
    'Customer walkthrough for compressor certificate closeout',
  ],
  latestReviews: [
    'NordWerk: "Clear evidence and flawless handoff."',
    'Atlas Motion Systems: "The machine passport saved our audit prep."',
  ],
  verificationStatus: 'Fully verified on Stellar Testnet workflow',
};

export const homepageMetrics = [
  { label: 'Verified Repairs', value: '124,893', helper: 'Permanent repair history across the network' },
  { label: 'Certificates Issued', value: '31,402', helper: 'Publicly searchable trust records' },
  { label: 'Active Workers', value: '18,270', helper: 'Professionals building reputation through real work' },
];

export const countries = ['Global', ...new Set(liveNetworkEvents.map((event) => event.country))];
export const workerSortOptions = ['Highest trust', 'Most experienced', 'Highest rated', 'Recently active', 'Fastest response'];

export function getWorkerBySlug(slug: string) {
  return workers.find((worker) => worker.slug === slug);
}

export function getMachineById(id: string) {
  return machines.find((machine) => machine.id === id);
}

export function getCertificateById(id: string) {
  return certificates.find((certificate) => certificate.id === id);
}
