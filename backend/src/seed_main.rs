// backend/src/seed_main.rs
// Run: cargo run --bin seed

mod seed;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL")
        .or_else(|_| std::env::var("POSTGRES_URL"))
        .unwrap_or_else(|_| "postgres://maintchain:maintchain@localhost:5432/maintchain".to_string());

    let pool = sqlx::PgPool::connect(&database_url).await?;
    seed::seed_database(&pool).await?;

    Ok(())
}
