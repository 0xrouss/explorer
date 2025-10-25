import { NextResponse } from "next/server";
import { dbManager } from "@/lib/db/client";
import { ensureDatabaseConnections } from "@/lib/db/init-server";

export async function GET() {
  try {
    await ensureDatabaseConnections();

    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      databases: {
        FULLY: dbManager.isHealthy("FULLY"),
      },
      environment: {
        hasFullyUrl: !!process.env.DATABASE_URL_FULLY,
        hasFallbackUrl: !!process.env.DATABASE_URL,
      },
    };

    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        environment: {
          hasFullyUrl: !!process.env.DATABASE_URL_FULLY,
          hasFallbackUrl: !!process.env.DATABASE_URL,
        },
      },
      { status: 500 }
    );
  }
}
