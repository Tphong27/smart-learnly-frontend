import { useState } from "react";
import { Bot, CreditCard, KeyRound, Mail, Video } from "lucide-react";
import { EmailSettingsSection } from "../components/EmailSettingsSection";
import { OAuthSettingsSection } from "../components/OAuthSettingsSection";
import { GoogleMeetSettingsSection } from "../components/GoogleMeetSettingsSection";
import { SePayBankDisplaySettingsSection } from "../components/SePayBankDisplaySettingsSection";
import { AiIntegrationsSettingsSection } from "../components/AiIntegrationsSettingsSection";
import { Tabs } from "@/shared/components/ui";
import "../../admin-shared.css";

// Add new settings groups here to surface them as tabs in System Settings.
const TABS = [
    {
        key: "email",
        label: "Email",
        icon: Mail,
        render: () => <EmailSettingsSection />,
    },
    {
        key: "oauth",
        label: "OAuth Providers",
        icon: KeyRound,
        render: () => <OAuthSettingsSection />,
    },
    {
        key: "google-meet",
        label: "Google Meet",
        icon: Video,
        render: () => <GoogleMeetSettingsSection />,
    },
    {
        key: "sepay-bank",
        label: "SePay Bank",
        icon: CreditCard,
        render: () => <SePayBankDisplaySettingsSection />,
    },
    {
        key: "ai-integrations",
        label: "AI Integrations",
        icon: Bot,
        render: () => <AiIntegrationsSettingsSection />,
    },
];

/** Hiển thị các nhóm thiết lập hệ thống qua tab keyboard-accessible. */
export function AdminSystemSettingsPage() {
    const [activeTab, setActiveTab] = useState(TABS[0].key);
    const current = TABS.find((tab) => tab.key === activeTab) ?? TABS[0];

    return (
        <div className="admin-page">
            <header className="admin-page__header">
                <div>
                    <h1 className="admin-page__title">System Settings</h1>
                </div>
            </header>

            <Tabs
                className="admin-settings-tabs"
                ariaLabel="System settings sections"
                value={activeTab}
                items={TABS.map((tab) => {
                    const Icon = tab.icon;
                    return {
                        value: tab.key,
                        label: tab.label,
                        icon: <Icon size={16} />,
                    };
                })}
                onChange={setActiveTab}
            />

            <section className="admin-card">{current.render()}</section>
        </div>
    );
}
