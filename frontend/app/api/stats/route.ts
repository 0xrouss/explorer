import { NextRequest, NextResponse } from "next/server";
import { IntentRepository } from "@/lib/db/repositories/intent-repository";
import { FillRepository } from "@/lib/db/repositories/fill-repository";
import { DepositRepository } from "@/lib/db/repositories/deposit-repository";
import { ensureDatabaseConnections } from "@/lib/db/init-server";
import type { NetworkType } from "@/types";

const intentRepo = new IntentRepository();
const fillRepo = new FillRepository();
const depositRepo = new DepositRepository();
const NETWORK: NetworkType = "FULLY";

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseConnections();

    // Get intent stats and transaction stats in parallel
    const [intentStats, fillStats, depositStats] = await Promise.all([
      intentRepo.getNetworkStats(NETWORK),
      fillRepo.getFillTransactionStats(NETWORK),
      depositRepo.getDepositTransactionStats(NETWORK),
    ]);

    const stats = {
      ...intentStats,
      totalFills: fillStats.totalFills,
      totalDeposits: depositStats.totalDeposits,
      uniqueFillers: fillStats.uniqueFillers,
      gasRefundedCount: depositStats.gasRefundedCount,
      latestFill: fillStats.latestFill,
      latestDeposit: depositStats.latestDeposit,
    };

    return NextResponse.json({
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching network stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch network stats" },
      { status: 500 }
    );
  }
}
