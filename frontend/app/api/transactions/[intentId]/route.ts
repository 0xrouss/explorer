import { NextRequest, NextResponse } from "next/server";
import { FillRepository } from "@/lib/db/repositories/fill-repository";
import { DepositRepository } from "@/lib/db/repositories/deposit-repository";
import { EvmFillRepository } from "@/lib/db/repositories/evm-fill-repository";
import { EvmDepositRepository } from "@/lib/db/repositories/evm-deposit-repository";
import { ensureDatabaseConnections } from "@/lib/db/init-server";
import type { NetworkType } from "@/types";

const fillRepo = new FillRepository();
const depositRepo = new DepositRepository();
const evmFillRepo = new EvmFillRepository();
const evmDepositRepo = new EvmDepositRepository();
const NETWORK: NetworkType = "FULLY";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ intentId: string }> }
) {
  try {
    await ensureDatabaseConnections();
    const { intentId } = await params;

    const intentIdNum = parseInt(intentId, 10);
    if (isNaN(intentIdNum)) {
      return NextResponse.json({ error: "Invalid intent ID" }, { status: 400 });
    }

    // Get fills, deposits, and EVM events in parallel
    const [fills, deposits, evmFills, evmDeposits] = await Promise.all([
      fillRepo.getFillsByIntentId(intentIdNum, NETWORK),
      depositRepo.getDepositsByIntentId(intentIdNum, NETWORK),
      evmFillRepo.getFillEventsByIntentId(intentIdNum, NETWORK),
      evmDepositRepo.getDepositEventsByIntentId(intentIdNum, NETWORK),
    ]);

    return NextResponse.json({
      data: {
        fills,
        deposits,
        evmFills,
        evmDeposits,
      },
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
