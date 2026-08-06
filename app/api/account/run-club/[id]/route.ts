import { ZodError } from "zod";
import { requireCustomerRequest,CustomerAuthError } from "@/lib/customer-auth";
import { CustomerRunClubError,editOwnedRun,removeOwnedRun } from "@/lib/run-club/customer";
export const dynamic="force-dynamic";
function fail(error:unknown){const status=error instanceof CustomerAuthError||error instanceof CustomerRunClubError?error.status:error instanceof ZodError?400:500;return Response.json({error:error instanceof Error?error.message:"Run Club request failed."},{status,headers:{"Cache-Control":"private, no-store"}})}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const customer=await requireCustomerRequest(request),{id}=await params;await editOwnedRun(customer,id,await request.json());return Response.json({ok:true},{headers:{"Cache-Control":"private, no-store"}})}catch(error){return fail(error)}}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){try{const customer=await requireCustomerRequest(request),{id}=await params;await removeOwnedRun(customer,id);return Response.json({ok:true},{headers:{"Cache-Control":"private, no-store"}})}catch(error){return fail(error)}}
