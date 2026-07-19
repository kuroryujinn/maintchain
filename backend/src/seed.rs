// backend/src/seed.rs
// Seeds the database with initial data matching the Tech-stack.md spec demo scenario.
// Run: cargo run --bin seed

use sqlx::PgPool;
use uuid::Uuid;

pub async fn seed_database(pool: &PgPool) -> anyhow::Result<()> {
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM equipment")
        .fetch_one(pool)
        .await?;

    if count.0 > 0 {
        println!(
            "Database already seeded ({} equipment records found), skipping.",
            count.0
        );
        return Ok(());
    }

    // ─── 1. Users (4 roles per Tech-stack.md spec) ────────────────────────
    let users = [
        // Technician — Elena Fischer
        (
            "GABC1234567890TECHNICIAN111111111111111111111111",
            "Elena Fischer",
            "TECHNICIAN",
            Some("Stellar Maintenance Co."),
        ),
        // Supervisor — S-102
        (
            "GDEF2345678901SUPERVISOR222222222222222222222222",
            "Supervisor S-102",
            "SUPERVISOR",
            Some("Stellar Maintenance Co."),
        ),
        // Auditor
        (
            "GHIJ3456789012AUDITOR3333333333333333333333333333",
            "Auditor A-771",
            "AUDITOR",
            Some("Independent Audit Group"),
        ),
        // Asset Owner
        (
            "GKLM4567890123OWNER44444444444444444444444444444",
            "Plant Manager Owen",
            "OWNER",
            Some("Stellar Manufacturing"),
        ),
    ];

    let mut user_ids: Vec<Uuid> = Vec::new();
    for (stellar_addr, name, role, org) in &users {
        let id = Uuid::new_v4();
        sqlx::query(
            "INSERT INTO users (id, stellar_address, name, role, organization) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (stellar_address) DO NOTHING",
        )
        .bind(id)
        .bind(*stellar_addr)
        .bind(*name)
        .bind(*role)
        .bind(*org)
        .execute(pool)
        .await?;
        user_ids.push(id);
    }

    // ─── 2. Equipment (3 items with serial_number, name, location) ────────
    let equipment = [
        (
            Uuid::parse_str("11111111-1111-1111-1111-111111111101").unwrap(),
            user_ids[3], // Owner
            "SN-MCH-1104-001",
            "CNC Mill #1104",
            "Plant A — Bay 7",
        ),
        (
            Uuid::parse_str("11111111-1111-1111-1111-111111111102").unwrap(),
            user_ids[3],
            "SN-MCH-3301-001",
            "Hydraulic Press #3301",
            "Plant B — Line 3",
        ),
        (
            Uuid::parse_str("11111111-1111-1111-1111-111111111103").unwrap(),
            user_ids[3],
            "SN-MCH-5512-001",
            "Laser Cutter #5512",
            "Plant A — Bay 12",
        ),
    ];

    for (id, owner_id, serial, name, location) in &equipment {
        sqlx::query(
            "INSERT INTO equipment (id, owner_id, metadata_hash, serial_number, name, location) \
             VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING",
        )
        .bind(id)
        .bind(owner_id)
        .bind(Some("initial_seed"))
        .bind(Some(*serial))
        .bind(Some(*name))
        .bind(Some(*location))
        .execute(pool)
        .await?;
    }

    // ─── 3. Maintenance Records (2 orders — one compliant, one pending) ───
    // Record A: Successfully completed (with rejection + resubmission path)
    let rec_a = Uuid::parse_str("22222222-2222-2222-2222-222222222201").unwrap();
    // Record B: Still pending supervisor approval
    let rec_b = Uuid::parse_str("22222222-2222-2222-2222-222222222202").unwrap();

    sqlx::query(
        "INSERT INTO maintenance_records (id, equipment_id, technician_id, status, evidence_hash) \
         VALUES ($1, $2, $3, 'COMPLIANT', $4) ON CONFLICT (id) DO NOTHING",
    )
    .bind(rec_a)
    .bind(equipment[0].0)
    .bind(user_ids[0]) // Elena Fischer
    .bind("0xde44a10298cf8810a1b9b61c73d1007a8f2cabd91e4d2a7c9014e1c1a3b5f6d8")
    .execute(pool)
    .await?;

    sqlx::query(
        "INSERT INTO maintenance_records (id, equipment_id, technician_id, status, evidence_hash) \
         VALUES ($1, $2, $3, 'PENDING_APPROVAL', $4) ON CONFLICT (id) DO NOTHING",
    )
    .bind(rec_b)
    .bind(equipment[1].0)
    .bind(user_ids[0]) // Elena Fischer
    .bind("0x5ea3cf89d102ab4d88df7754f1acbe209100aa40fe3307d2b4be01855d92ce71")
    .execute(pool)
    .await?;

    // ─── 4. Approval Records (rejection + resubmission + full chain) ─────
    let approvals = [
        // Record A: Supervisor initially REJECTED, then APPROVED after resubmission
        (rec_a, user_ids[1], "SUPERVISOR", "REJECTED", Some("Missing torque wrench calibration certificate")),
        (rec_a, user_ids[1], "SUPERVISOR", "APPROVED", Some("Evidence verified, parts traceable")),
        (rec_a, user_ids[2], "AUDITOR", "APPROVED", Some("Full compliance verified — all approvals complete")),
        // Record B: Supervisor still reviewing
        (rec_b, user_ids[1], "SUPERVISOR", "APPROVED", Some("Preliminary review passed")),
    ];

    for (maintenance_id, approver_id, role, decision, note) in &approvals {
        sqlx::query(
            "INSERT INTO approvals (maintenance_id, approver_id, role, decision, approval_timestamp, note) \
             VALUES ($1, $2, $3, $4, now(), $5) ON CONFLICT DO NOTHING",
        )
        .bind(maintenance_id)
        .bind(approver_id)
        .bind(role)
        .bind(decision)
        .bind(note)
        .execute(pool)
        .await?;
    }

    println!("Database seeded with spec demo scenario:");
    println!("  - 4 users (Technician, Supervisor, Auditor, Owner)");
    println!("  - 3 equipment items with serial/name/location");
    println!("  - 2 maintenance records (1 compliant, 1 pending)");
    println!("  - 4 approval events (incl. rejection + resubmission)");
    Ok(())
}
