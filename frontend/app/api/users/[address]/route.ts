import { NextRequest, NextResponse } from "next/server";
import { IntentRepository } from "@/lib/db/repositories/intent-repository";
import { ensureDatabaseConnections } from "@/lib/db/init-server";
import type { NetworkType, UserStats, DatabaseIntent } from "@/types";
import { getIntentStatus } from "@/types";

const NETWORK: NetworkType = "FULLY";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    await ensureDatabaseConnections();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const { address } = await params;

    const intentRepo = new IntentRepository();

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Get user stats and intents in parallel
    const [userStats, intentsResult] = await Promise.all([
      intentRepo.getUserStats(address, NETWORK),
      intentRepo.getIntentsBySignatureAddress(address, NETWORK, limit, offset),
    ]);

    const totalIntents = await intentRepo.getIntentCountBySignatureAddress(
      address,
      NETWORK
    );

    const totalPages = Math.ceil(totalIntents / limit);

    // Get sources, destinations, and EVM deposits for all intents
    const intentIds = intentsResult.map((i) => i.id);
    const [sourcesMap, destinationsMap, evmDepositsMap] = await Promise.all([
      intentRepo.getSourcesForIntents(intentIds, NETWORK),
      intentRepo.getDestinationsForIntents(intentIds, NETWORK),
      intentRepo.getEvmDepositsForIntents(intentIds, NETWORK),
    ]);

    // Add computed status, sources, destinations, and EVM deposits to each intent
    const intentsWithStatus = intentsResult.map((intent) => ({
      ...intent,
      status: getIntentStatus(intent),
      sources: sourcesMap.get(intent.id) || [],
      destinations: destinationsMap.get(intent.id) || [],
      evmDeposits: evmDepositsMap.get(intent.id) || [],
    }));

    const stats: UserStats = {
      totalIntents: userStats.totalIntents,
      pendingIntents: userStats.pendingIntents,
      depositedIntents: userStats.depositedIntents,
      fulfilledIntents: userStats.fulfilledIntents,
      refundedIntents: userStats.refundedIntents,
      firstIntentDate: userStats.firstIntentDate,
      lastIntentDate: userStats.lastIntentDate,
    };

    return NextResponse.json({
      data: {
        stats,
        intents: intentsWithStatus,
      },
      pagination: {
        page,
        limit,
        total: totalIntents,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
