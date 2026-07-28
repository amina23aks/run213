import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { CustomerAuthError, requireCustomerRequest } from "@/lib/customer-auth";
import { readCustomerProfile, writeCustomerProfile } from "@/lib/profile/server";

export const dynamic = "force-dynamic";

function failure(error: unknown) {
  if (error instanceof CustomerAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: "Check your account details.", fields: error.flatten().fieldErrors }, { status: 400 });
  return NextResponse.json({ error: "Account details are temporarily unavailable." }, { status: 500 });
}

export async function GET(request: Request) {
  try { return NextResponse.json(await readCustomerProfile(await requireCustomerRequest(request))); } catch (error) { return failure(error); }
}

export async function PUT(request: Request) {
  try {
    const customer = await requireCustomerRequest(request);
    const body: unknown = await request.json();
    return NextResponse.json(await writeCustomerProfile(customer, body as never));
  } catch (error) { return failure(error); }
}
