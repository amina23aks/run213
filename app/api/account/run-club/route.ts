import { requireCustomerRequest,CustomerAuthError } from "@/lib/customer-auth";
import { listOwnedRuns } from "@/lib/run-club/customer";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{const customer=await requireCustomerRequest(request),cursor=new URL(request.url).searchParams.get("cursor");return Response.json(await listOwnedRuns(customer,cursor),{headers:{"Cache-Control":"private, no-store"}});}catch(error){return Response.json({error:error instanceof CustomerAuthError?error.message:"Run Club activity is unavailable."},{status:error instanceof CustomerAuthError?error.status:500,headers:{"Cache-Control":"private, no-store"}})}}
