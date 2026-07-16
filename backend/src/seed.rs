// backend/src/seed.rs
// Seeds the database with initial data matching frontend/src/data/maintchain.ts
// Run: cargo run --bin seed

use sqlx::PgPool;
use uuid::Uuid;

pub async fn seed_database(pool: &PgPool) -> anyhow::Result<()> {
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM equipment")
        .fetch_one(pool)
        .await?;

    if count.0 > 0 {
        println!("Database already seeded ({} equipment records found), skipping.", count.0);
        return Ok(());
    }

    // Equipment records (mapped from machines in maintchain.ts)
    let equipment = [
        ("MCH-1104", "00000000-0000-0000-0000-000000000001"),
        ("MCH-3301", "00000000-0000-0000-0000-000000000001"),
        ("MCH-5512", "00000000-0000-0000-0000-000000000001"),
    ];

    for (id, owner_id) in &equipment {
        let uuid = Uuid::parse_str(id).unwrap_or_else(|_| Uuid::new_v4());
        sqlx::query(
            "INSERT INTO equipment (id, owner_id, metadata_hash) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
        )
        .bind(uuid)
        .bind(Uuid::parse_str(owner_id).unwrap())
        .bind(Some("initial_seed"))
        .execute(pool)
        .await?;
    }

    // Maintenance records (mapped from workers[].repairs in maintchain.ts)
    let records = [
        ("REC-DE-4471", "MCH-1104", "00000000-0000-0000-0000-000000000002", "VERIFIED", "0xde44a10298cf8810a1b9b61c73d1007a"),
        ("REC-DE-4510", "MCH-1104", "00000000-0000-0000-0000-000000000002", "VERIFIED", "0x5ea3cf89d102ab4d88df7754f1acbe20"),
        ("REC-GH-2210", "MCH-3301", "00000000-0000-0000-0000-000000000003", "VERIFIED", "0x9100aa40fe3307d2b4be01855d92ce71"),
        ("REC-IN-8702", "MCH-5512", "00000000-0000-0000-0000-000000000004", "PENDING_APPROVAL", "0x8122be8f1a7849f0c12ef8c67ea41ba7"),
    ];

    for (id, eq_id, tech_id, status, hash) in &records {
        sqlx::query(
            "INSERT INTO maintenance_records (id, equipment_id, technician_id, status, evidence_hash) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING",
        )
        .bind(Uuid::parse_str(id).unwrap_or_else(|_| Uuid::new_v4()))
        .bind(Uuid::parse_str(eq_id).unwrap_or_else(|_| Uuid::new_v4()))
        .bind(Uuid::parse_str(tech_id).unwrap_or_else(|_| Uuid::new_v4()))
        .bind(status)
        .bind(hash)
        .execute(pool)
        .await?;
    }

    // Approval records
    let approvals = [
        ("REC-DE-4471", "SUPERVISOR", "APPROVED"),
        ("REC-DE-4471", "CUSTOMER", "APPROVED"),
        ("REC-DE-4510", "SUPERVISOR", "APPROVED"),
        ("REC-DE-4510", "CUSTOMER", "APPROVED"),
        ("REC-DE-4510", "COMPLIANCE", "APPROVED"),
        ("REC-GH-2210", "SUPERVISOR", "APPROVED"),
        ("REC-GH-2210", "CUSTOMER", "APPROVED"),
        ("REC-IN-8702", "SUPERVISOR", "APPROVED"),
    ];

    for (rec_id, role, decision) in &approvals {
        sqlx::query(
            "INSERT INTO approvals (maintenance_id, approver_id, role, decision, approval_timestamp, note) VALUES ($1, $2, $3, $4, now(), $5) ON CONFLICT DO NOTHING",
        )
        .bind(Uuid::parse_str(rec_id).unwrap_or_else(|_| Uuid::new_v4()))
        .bind(Uuid::nil())
        .bind(role)
        .bind(decision)
        .bind::<Option<String>>(None)
        .execute(pool)
        .await?;
    }

    println!("Database seeded successfully!");
    Ok(())
}
