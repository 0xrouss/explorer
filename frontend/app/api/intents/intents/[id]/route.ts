import { NextRequest, NextResponse } from "next/server";
import { IntentRepository } from "@/lib/db/repositories/intent-repository";
import { ensureDatabaseConnections } from "@/lib/db/init-server";
import type { NetworkType } from "@/types";
import { getIntentStatus } from "@/types";
import { NETWORKS } from "@/lib/constants";

const intentRepo = new IntentRepository();

function validateNetwork(network: string): network is NetworkType {
  return NETWORKS.includes(network as NetworkType);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ network: string; id: string }> }
) {
  try {
    await ensureDatabaseConnections();
    const { network, id } = await params;

    if (!validateNetwork(network)) {
      return NextResponse.json(
        { error: `Invalid network. Must be one of: ${NETWORKS.join(", ")}` },
        { status: 400 }
      );
    }

    const intentId = parseInt(id, 10);
    if (isNaN(intentId)) {
      return NextResponse.json({ error: "Invalid intent ID" }, { status: 400 });
    }

    const intentWithRelations = await intentRepo.getIntentWithRelations(
      intentId,
      network
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
