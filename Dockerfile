# ── Multi-stage Docker build for MaintChain Axum backend ──
#
# Build context: repo root (no subdirectory prefix needed).
# This file is at the repo root to avoid Render context issues.
# Stage 1: Build the Rust binary
# Stage 2: Copy only the binary into a slim runtime image

# ─── Stage 1: Builder ────────────────────────────────────
FROM rust:1.80-slim-bookworm AS builder

# Install build dependencies for sqlx (postgres) and Soroban
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifest files first for layer caching
COPY backend/Cargo.toml backend/Cargo.lock ./

# Copy source code
COPY backend/src/ src/
COPY backend/migrations/ migrations/

# Build release binary (all dependencies compiled here)
RUN cargo build --release

# ─── Stage 2: Runtime ────────────────────────────────────
FROM debian:bookworm-slim

# Install runtime dependencies (OpenSSL for sqlx TLS)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled binary from the builder stage
COPY --from=builder /app/target/release/maintchain-backend /app/maintchain-backend

# Copy migration files (for reference)
COPY backend/migrations/ /app/migrations/

# Expose the port (Render injects its own PORT env var)
EXPOSE 8081

# Run the backend
CMD ["./maintchain-backend"]
