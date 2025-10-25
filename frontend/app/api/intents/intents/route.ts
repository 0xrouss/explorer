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
  { params }: { params: Promise<{ network: string }> }
) {
  try {
    await ensureDatabaseConnections();
    const { network } = await params;

    if (!validateNetwork(network)) {
      return NextResponse.json(
        { error: `Invalid network. Must be one of: ${NETWORKS.join(", ")}` },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      100
    );
    const statusParam = searchParams.get("status") || "all";
    const search = searchParams.get("search");

    const offset = (page - 1) * limit;

    let intents;
    let totalCount;

    // Convert status param to filter object
    // Status hierarchy: fulfilled > refunded > failed (expired) > deposited > pending
    const statusFilter =
      statusParam === "all"
        ? undefined
        : statusParam === "fulfilled"
        ? { fulfilled: true }
        : statusParam === "refunded"
        ? { refunded: true, fulfilled: false }
        : statusParam === "deposited"
        ? { deposited: true, fulfilled: false, refunded: false }
        : statusParam === "pending"
        ? { deposited: false, fulfilled: false, refunded: false }
        : undefined;

    if (search) {
      // Search functionality
      intents = await intentRepo.searchIntents(search, network, limit, offset);
      totalCount = intents.length; // For search, we don't have a separate count query
    } else if (statusParam === "failed") {
      // Special handling for "failed" status (expired intents)
      // Failed = expired AND not fulfilled AND not refunded (deposited doesn't matter)
      const allIntents = await intentRepo.getIntentsByNetwork(
        network,
        limit * 10, // Fetch more to account for filtering
        0,
        { fulfilled: false, refunded: false }
      );

      const now = Math.floor(Date.now() / 1000);
      const failedIntents = allIntents.filter((intent) => intent.expiry < now);

      // Apply pagination to filtered results
      intents = failedIntents.slice(offset, offset + limit);
      totalCount = failedIntents.length;
    } else if (statusParam === "deposited") {
      // Special handling for "deposited" status
      // Deposited = deposited AND not fulfilled AND not refunded AND not expired
      const allIntents = await intentRepo.getIntentsByNetwork(
        network,
        limit * 10, // Fetch more to account for filtering
        0,
        { deposited: true, fulfilled: false, refunded: false }
      );

      const now = Math.floor(Date.now() / 1000);
      const depositedIntents = allIntents.filter(
        (intent) => intent.expiry >= now
      );

      // Apply pagination to filtered results
      intents = depositedIntents.slice(offset, offset + limit);
      totalCount = depositedIntents.length;
    } else {
      // Regular listing with status filters
      intents = await intentRepo.getIntentsByNetwork(
        network,
        limit,
        offset,
        statusFilter
      );
      totalCount = await intentRepo.getIntentCount(network, statusFilter);
    }

    // Get universe 0 signature addresses, sources, destinations, and EVM deposits for all intents
    const intentIds = intents.map((i) => i.id);
    const [signatureMap, sourcesMap, destinationsMap, evmDepositsMap] =
      await Promise.all([
        intentRepo.getUniverse0SignaturesForIntents(intentIds, network),
        intentRepo.getSourcesForIntents(intentIds, network),
        intentRepo.getDestinationsForIntents(intentIds, network),
        intentRepo.getEvmDepositsForIntents(intentIds, network),
      ]);

    // Add computed status, signature address, sources, destinations, and EVM deposits to each intent
    const intentsWithStatus = intents.map((intent) => ({
      ...intent,
      status: getIntentStatus(intent),
      signature_address: signatureMap.get(intent.id) || null,
      sources: sourcesMap.get(intent.id) || [],
      destinations: destinationsMap.get(intent.id) || [],
      evmDeposits: evmDepositsMap.get(intent.id) || [],
    }));

    // For search results, filter by computed status if a status filter was requested
    let finalIntents = intentsWithStatus;
    if (search && statusParam !== "all") {
      finalIntents = intentsWithStatus.filter(
        (intent) => intent.status === statusParam
      );
      totalCount = finalIntents.length;
    }

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: finalIntents,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching intents:", error);
    return NextResponse.json(
      { error: "Failed to fetch intents" },
      { status: 500 }
    );
  }
}
