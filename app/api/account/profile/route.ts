import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { CustomerAuthError, requireCustomerRequest } from "@/lib/customer-auth";
import { readCustomerProfile, writeCustomerProfile } from "@/lib/profile/server";

export const dynamic = "force-dynamic";

function failure(error: unknown) {
  const headers = { "Cache-Control": "private, no-store" };
  if (error instanceof CustomerAuthError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
  if (error instanceof ZodError) return NextResponse.json({ error: "Check your account details.", fields: error.flatten().fieldErrors }, { status: 400, headers });
  return NextResponse.json({ error: "Account details are temporarily unavailable." }, { status: 500, headers });
}

export async function GET(request: Request) {
  try { return NextResponse.json(await readCustomerProfile(await requireCustomerRequest(request)), { headers: { "Cache-Control": "private, no-store" } }); } catch (error) { return failure(error); }
}

export async function PUT(request: Request) {
  try {
    const customer = await requireCustomerRequest(request);
    const body: unknown = await request.json();
    return NextResponse.json(await writeCustomerProfile(customer, body), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}
