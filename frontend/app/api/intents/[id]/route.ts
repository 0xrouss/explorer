import { NextRequest, NextResponse } from "next/server";
import { IntentRepository } from "@/lib/db/repositories/intent-repository";
import { ensureDatabaseConnections } from "@/lib/db/init-server";
import type { NetworkType } from "@/types";
import { getIntentStatus } from "@/types";

const intentRepo = new IntentRepository();
const NETWORK: NetworkType = "FULLY";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseConnections();
    const { id } = await params;

    const intentId = parseInt(id, 10);
    if (isNaN(intentId)) {
      return NextResponse.json({ error: "Invalid intent ID" }, { status: 400 });
    }

    const intentWithRelations = await intentRepo.getIntentWithRelations(
      intentId,
      NETWORK
    );

    if (!intentWithRelations) {
      return NextResponse.json({ error: "Intent not found" }, { status: 404 });
    }

    // Add computed status
    const intentWithStatus = {
      ...intentWithRelations,
      status: getIntentStatus(intentWithRelations),
    };

    return NextResponse.json({
      data: intentWithStatus,
    });
  } catch (error) {
    console.error("Error fetching intent:", error);
    return NextResponse.json(
      { error: "Failed to fetch intent" },
      { status: 500 }
    );
  }
}
