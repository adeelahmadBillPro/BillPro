"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import Modal from "@/components/Modal";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getBusinessMembers,
  getBusinessInvites,
  createInvite,
  deleteInvite,
  updateMemberRole,
  removeMember,
} from "@/lib/supabase/database";
import { t, formatDate } from "@/lib/i18n";
import { hasPermission } from "@/lib/permissions";
import type { BusinessMember, BusinessInvite, UserRole } from "@/types";
import { ArrowLeft, UserPlus, Trash2, Copy, Check, Shield } from "lucide-react";

const ROLES: UserRole[] = ["admin", "accountant", "viewer"];

export default function TeamPage() {
  const { lang } = useLanguage();
  const { business, user, role, loading: authLoading } = useAuth();

  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [invites, setInvites] = useState<BusinessInvite[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("viewer");
  const [saving, setSaving] = useState(false);

  // Copy link state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canManage = hasPermission(role, "manage_team");

  useEffect(() => {
    if (authLoading || !business) {
      if (!authLoading) setLoading(false);
      return;
    }
    loadData();
  }, [business, authLoading]);

  async function loadData() {
    if (!business) return;
    setLoading(true);
    const [memRes, invRes] = await Promise.all([
      getBusinessMembers(business.id),
      getBusinessInvites(business.id),
    ]);
    setMembers(memRes.data || []);
    setInvites(invRes.data || []);
    setLoading(false);
  }

  async function handleInvite() {
    if (!business || !user || !inviteEmail) return;
    setSaving(true);
    await createInvite(business.id, inviteEmail, inviteRole, user.id);
    setSaving(false);
    setModalOpen(false);
    setInviteEmail("");
    setInviteRole("viewer");
    loadData();
  }

  async function handleDeleteInvite(id: string) {
    if (!confirm(t("common_confirm_delete", lang))) return;
    await deleteInvite(id);
    loadData();
  }

  async function handleChangeRole(memberId: string, newRole: UserRole) {
    await updateMemberRole(memberId, newRole);
    loadData();
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm(t("common_confirm_delete", lang))) return;
    await removeMember(memberId);
    loadData();
  }

  function copyInviteLink(token: string, inviteId: string) {
    const link = `${window.location.origin}/auth/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(inviteId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const roleLabel = (r: UserRole) => t(`role_${r}`, lang);

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/settings"
              className="p-2 text-muted hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className={`text-2xl font-bold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
              {t("team_title", lang)}
            </h1>
          </div>
          {canManage && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span className={lang === "ur" ? "font-urdu" : ""}>{t("team_invite", lang)}</span>
            </button>
          )}
        </div>

        {/* Members List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">{t("team_title", lang)}</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-muted text-sm">{t("common_loading", lang)}</div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-muted text-sm">{t("team_no_members", lang)}</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {members.map((member) => {
                const isCurrentUser = member.user_id === user?.id;
                const isOwner = member.role === "owner";
                return (
                  <div key={member.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {member.user_id.slice(0, 8)}...
                          </span>
                          {isCurrentUser && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {t("team_you", lang)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted">
                          {t("team_member_since", lang)}: {formatDate(member.created_at, lang)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {canManage && !isOwner && !isCurrentUser ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleChangeRole(member.id, e.target.value as UserRole)}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                        >
                          {(["admin", "accountant", "viewer"] as UserRole[]).map((r) => (
                            <option key={r} value={r}>{roleLabel(r)}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`text-sm font-medium px-3 py-1.5 rounded-lg ${
                          isOwner ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {roleLabel(member.role)}
                        </span>
                      )}
                      {canManage && !isOwner && !isCurrentUser && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-1.5 text-muted hover:text-danger rounded-md hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Invites */}
        {canManage && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">{t("team_pending_invites", lang)}</h2>
            </div>
            {invites.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">{t("team_no_invites", lang)}</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {invites.map((invite) => (
                  <div key={invite.id} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{invite.email}</p>
                      <p className="text-xs text-muted">
                        {roleLabel(invite.role)} — {t("team_invite_expires", lang)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyInviteLink(invite.token, invite.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        {copiedId === invite.id ? (
                          <><Check className="w-3.5 h-3.5 text-green-600" /> {t("team_link_copied", lang)}</>
                        ) : (
                          <><Copy className="w-3.5 h-3.5" /> {t("team_copy_link", lang)}</>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteInvite(invite.id)}
                        className="p-1.5 text-muted hover:text-danger rounded-md hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("team_invite", lang)}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("team_invite_email", lang)} *
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("team_role", lang)}
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{roleLabel(r)}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted">{t("team_invite_expires", lang)}</p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleInvite}
              disabled={saving || !inviteEmail}
              className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {saving ? t("common_loading", lang) : t("team_invite", lang)}
            </button>
            <button
              onClick={() => setModalOpen(false)}
              className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {t("common_cancel", lang)}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
