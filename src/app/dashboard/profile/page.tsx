"use client";

import React from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/loading-screen";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import ProfileHeader from "@/components/profile/ProfileHeader";
import AccountInfoCard from "@/components/profile/AccountInfoCard";
import SocialIntegrationsCard from "@/components/profile/SocialIntegrationsCard";
import WorkspacesCard from "@/components/profile/WorkspacesCard";
import SubscriptionCard from "@/components/profile/SubscriptionCard";
import PaymentMethodCard from "@/components/profile/PaymentMethodCard";
import TelegramGuideModal from "@/components/profile/TelegramGuideModal";
import { useProfile } from "@/hooks/useProfile";
import { useBilling } from "@/hooks/useBilling";
import { useFacebook } from "@/hooks/useFacebook";
import { useTelegram } from "@/hooks/useTelegram";

export default function Profile() {
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [showTelegramGuide, setShowTelegramGuide] = React.useState(false);

  // Custom hooks
  const { email, tenants, loading, supabase } = useProfile();
  const { billing, card, portalLoading, openPortal, getPlanLabel, formatDate } = useBilling();
  const facebook = useFacebook();
  const telegram = useTelegram();

  async function onLogoutConfirmed() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <ProfileHeader onLogout={() => setShowLogoutConfirm(true)} />

      {loading ? (
        <LoadingScreen />
      ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
            <AccountInfoCard email={email} />
            <SocialIntegrationsCard
              facebook={facebook}
              telegram={telegram}
              onShowTelegramGuide={() => setShowTelegramGuide(true)}
            />
            <WorkspacesCard tenants={tenants} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
            <SubscriptionCard
              billing={billing}
              portalLoading={portalLoading}
              onManage={openPortal}
              getPlanLabel={getPlanLabel}
              formatDate={formatDate}
            />
            <PaymentMethodCard card={card} portalLoading={portalLoading} onManage={openPortal} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Sign out"
        description="Are you sure you want to log out?"
        confirmText="Log out"
        destructive
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={onLogoutConfirmed}
      />

      <TelegramGuideModal isOpen={showTelegramGuide} onClose={() => setShowTelegramGuide(false)} />
    </div>
  );
}