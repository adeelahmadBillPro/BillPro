"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getInviteByToken, acceptInvite } from "@/lib/supabase/database";
import { Receipt, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invite, setInvite] = useState<any>(null);
  const [status, setStatus] = useState<"loading" | "found" | "accepting" | "success" | "error" | "expired" | "login_needed">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadInvite();
  }, [token]);

  async function loadInvite() {
    const { data, error } = await getInviteByToken(token);

    if (error || !data) {
      setStatus("error");
      setErrorMsg("Invalid or already used invite link.");
      return;
    }

    if (new Date(data.expires_at) < new Date()) {
      setStatus("expired");
      return;
    }

    setInvite(data);

    // Check if user is logged in
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      setStatus("login_needed");
      return;
    }

    setStatus("found");
  }

  async function handleAccept() {
    setStatus("accepting");
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      setStatus("login_needed");
      return;
    }

    const { error } = await acceptInvite(token, session.user.id);

    if (error) {
      setStatus("error");
      setErrorMsg(typeof error === "object" && "message" in error ? (error as any).message : "Failed to accept invite.");
      return;
    }

    setStatus("success");
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">BillPro</h1>
          <p className="text-sm text-muted mt-1">Team Invitation</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          {status === "loading" && (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
              <p className="text-muted">Loading invite...</p>
            </div>
          )}

          {status === "found" && invite && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  You&apos;re invited to join
                </h2>
                <p className="text-2xl font-bold text-primary">
                  {invite.business?.name_en}
                </p>
                {invite.business?.name_ur && (
                  <p className="text-lg text-muted font-urdu mt-1">
                    {invite.business.name_ur}
                  </p>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-muted">Your role will be</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">{invite.role}</p>
              </div>
              <button
                onClick={handleAccept}
                className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors"
              >
                Accept Invitation
              </button>
            </div>
          )}

          {status === "accepting" && (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
              <p className="text-muted">Joining team...</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-lg font-semibold text-gray-900">Welcome to the team!</h2>
              <p className="text-muted">Redirecting to dashboard...</p>
            </div>
          )}

          {status === "login_needed" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  You&apos;re invited to join
                </h2>
                {invite && (
                  <p className="text-xl font-bold text-primary">
                    {invite.business?.name_en}
                  </p>
                )}
              </div>
              <p className="text-muted">Please log in or create an account to accept this invitation.</p>
              <div className="flex gap-3">
                <Link
                  href={`/auth/login?redirect=/auth/invite/${token}`}
                  className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors text-center"
                >
                  Login
                </Link>
                <Link
                  href={`/auth/signup?redirect=/auth/invite/${token}`}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors text-center"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          )}

          {status === "expired" && (
            <div className="space-y-4">
              <XCircle className="w-16 h-16 text-amber-500 mx-auto" />
              <h2 className="text-lg font-semibold text-gray-900">Invite Expired</h2>
              <p className="text-muted">This invitation has expired. Please ask the business owner for a new invite.</p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <XCircle className="w-16 h-16 text-red-500 mx-auto" />
              <h2 className="text-lg font-semibold text-gray-900">Invalid Invite</h2>
              <p className="text-muted">{errorMsg}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
