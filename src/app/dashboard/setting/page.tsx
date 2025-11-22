"use client";

import React from "react";
import Card from "@/components/ui/card";
import TextField from "@/components/ui/text-field";
import TextArea from "@/components/ui/text-area";
import PasswordField from "@/components/ui/password-field";
import Button from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import LoadingScreen from "@/components/loading-screen";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";

type BotPersonality = "friendly" | "professional" | "casual";

export default function Setting() {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // User Profile
  const [userId, setUserId] = React.useState<string>("");
  const [email, setEmail] = React.useState("");
  const [tenantId, setTenantId] = React.useState<string>("");
  
  // Password
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [changingPassword, setChangingPassword] = React.useState(false);

  // Bot Settings
  const [botPersonality, setBotPersonality] = React.useState<BotPersonality>("friendly");
  const [welcomeMessage, setWelcomeMessage] = React.useState("");
  const [awayMessage, setAwayMessage] = React.useState("");
  const [fallbackMessage, setFallbackMessage] = React.useState("");
  const [promptTemplate, setPromptTemplate] = React.useState("");
  const [enableAutoResponse, setEnableAutoResponse] = React.useState(true);
  const [enableRag, setEnableRag] = React.useState(true);
  
  // Bot Memory
  const [clearingMemory, setClearingMemory] = React.useState(false);
  const [showClearMemoryConfirm, setShowClearMemoryConfirm] = React.useState(false);

  // Accordion state
  const [expandedSection, setExpandedSection] = React.useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Load user and bot settings
  React.useEffect(() => {
    let cancelled = false;
    
    async function loadSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        setUserId(user.id);
        setEmail(user.email || "");

        // Get user's tenant
        const { data: userTenant } = await supabase
          .from("user_tenants")
          .select("tenant_id")
          .eq("user_id", user.id)
          .limit(1)
          .single();

        if (!userTenant || cancelled) {
          setLoading(false);
          return;
        }

        setTenantId(userTenant.tenant_id);

        // Load bot settings from database
        const { data: settings } = await supabase
          .from("tenant_settings")
          .select("*")
          .eq("tenant_id", userTenant.tenant_id)
          .limit(1)
          .single();

        if (settings && !cancelled) {
          const personality = settings.bot_personality || "friendly";
          setBotPersonality(personality);
          setWelcomeMessage(settings.welcome_message || "");
          setAwayMessage(settings.away_message || "");
          setFallbackMessage(settings.fallback_message || "");
          setPromptTemplate(settings.prompt_template || getDefaultPrompt(personality));
          setEnableAutoResponse(settings.enable_auto_response ?? true);
          setEnableRag(settings.enable_rag ?? true);
        } else if (!settings && !cancelled) {
          // No settings found, use defaults
          setPromptTemplate(getDefaultPrompt("friendly"));
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSettings();
    return () => { cancelled = true; };
  }, [supabase]);

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Password changed successfully!");
      setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleSaveBotSettings() {
    if (!tenantId) {
      toast.error("Tenant not found");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("tenant_settings")
        .upsert(
          {
            tenant_id: tenantId,
            bot_personality: botPersonality,
            welcome_message: welcomeMessage,
            away_message: awayMessage,
            fallback_message: fallbackMessage,
            prompt_template: promptTemplate,
            enable_auto_response: enableAutoResponse,
            enable_rag: enableRag,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "tenant_id"
          }
        );

      if (error) throw error;

      toast.success("Bot settings saved successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save bot settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearBotMemory() {
    setClearingMemory(true);
    setShowClearMemoryConfirm(false);
    
    try {
      const response = await fetch("/api/bot/clear-memory", { method: "DELETE" });
      const data = await response.json();
      
      if (response.ok) {
        toast.success(`Successfully cleared ${data.sessionsDeleted || 0} sessions and ${data.messagesDeleted || 0} messages!`);
      } else {
        toast.error(data.error || "Failed to clear bot memory");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to clear bot memory");
    } finally {
      setClearingMemory(false);
    }
  }

  const personalityOptions = [
    {
      value: "friendly" as BotPersonality,
      label: "Friendly",
      description: "Warm, approachable, and conversational tone",
      emoji: "😊"
    },
    {
      value: "professional" as BotPersonality,
      label: "Professional",
      description: "Formal, polished, and business-oriented tone",
      emoji: "💼"
    },
    {
      value: "casual" as BotPersonality,
      label: "Casual",
      description: "Relaxed, informal, and easy-going tone",
      emoji: "😎"
    }
  ];

  const defaultPromptTemplates: Record<BotPersonality, string> = {
    friendly: `You are a friendly and helpful AI sales assistant for an online store. Your goal is to help customers find products, answer questions, and complete orders in a warm and conversational way.

Guidelines:
- Be warm, approachable, and use a conversational tone
- Use emojis occasionally to add personality (👋 😊 🎉)
- Show genuine interest in helping the customer
- Be patient and understanding
- Make shopping feel easy and enjoyable
- Recommend products based on customer needs
- Help customers complete their orders smoothly

Remember: You represent a friendly brand that cares about customer satisfaction!`,

    professional: `You are a professional AI sales assistant representing an online store. Your role is to provide accurate product information, assist with purchases, and deliver excellent customer service in a polished, business-oriented manner.

Guidelines:
- Maintain a formal and professional tone at all times
- Provide clear, accurate, and detailed information
- Be efficient and respect the customer's time
- Use proper grammar and business language
- Focus on product features and benefits
- Guide customers through the purchase process professionally
- Address concerns with expertise and confidence

Remember: You represent a professional brand committed to quality service.`,

    casual: `Hey! You're a laid-back AI sales assistant helping people shop online. Keep things chill, easy-going, and fun while helping customers find what they need and complete their orders.

Guidelines:
- Keep it relaxed and informal - like chatting with a friend
- Use casual language and slang when appropriate
- Don't stress the small stuff
- Make shopping feel easy and no-pressure
- Be helpful without being pushy
- Keep responses short and to the point
- Have a sense of humor when appropriate

Remember: You're here to make shopping easy and enjoyable, no stress!`
  };

  function getDefaultPrompt(personality: BotPersonality): string {
    return defaultPromptTemplates[personality];
  }

  function handlePersonalityChange(newPersonality: BotPersonality) {
    setBotPersonality(newPersonality);
    // Auto-fill with default prompt for this personality
    setPromptTemplate(getDefaultPrompt(newPersonality));
  }

  function resetPromptToDefault() {
    setPromptTemplate(getDefaultPrompt(botPersonality));
    toast.success("Prompt reset to default template");
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your account and bot configuration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account Information Card */}
          <Card>
            <div className="border-b-2 border-brand-gradient-horizontal pb-4 mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Account Information
              </h2>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <TextField type="email" value={email} disabled />
              <p className="mt-2 text-xs text-gray-500">Your email cannot be changed. Contact support if you need to update it.</p>
            </div>
          </Card>

          {/* Prompt Template Card */}
          <Card>
            <button
              onClick={() => toggleSection('prompt')}
              className="w-full flex items-center justify-between p-4 hover:bg-brand-subtle transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="text-left">
                  <h2 className="text-lg font-bold text-gray-900">Bot Prompt Template</h2>
                  <p className="text-sm text-gray-600">Customize how your bot behaves</p>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transform transition-transform ${
                  expandedSection === 'prompt' ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedSection === 'prompt' && (
              <div className="px-4 pb-4 border-t pt-4">
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">This template defines your bot's behavior and personality</p>
                      <p className="text-blue-700">Each personality has a default template. Feel free to customize it to match your brand!</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      System Prompt
                    </label>
                    <button
                      onClick={resetPromptToDefault}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset to Default
                    </button>
                  </div>
                  <TextArea
                    rows={12}
                    placeholder="Enter your custom bot prompt template..."
                    value={promptTemplate}
                    onChange={(e) => setPromptTemplate(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    💡 Tip: Include guidelines on tone, how to handle questions, product recommendations, and order processing.
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t bg-gray-50 -mx-4 px-4 pb-4 rounded-b-lg">
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="font-medium text-gray-700 mb-2">Variables you can use:</div>
                    <div><code className="bg-gray-200 px-1.5 py-0.5 rounded">{`{customer_name}`}</code> - Customer's name</div>
                    <div><code className="bg-gray-200 px-1.5 py-0.5 rounded">{`{store_name}`}</code> - Your store name</div>
                    <div><code className="bg-gray-200 px-1.5 py-0.5 rounded">{`{product_catalog}`}</code> - Available products</div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t flex justify-end gap-3">
                  <Button 
                    variant="outline"
                    onClick={resetPromptToDefault}
                  >
                    Reset to Default
                  </Button>
                  <Button 
                    onClick={handleSaveBotSettings}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Bot Messages Card */}
          <Card>
            <button
              onClick={() => toggleSection('messages')}
              className="w-full flex items-center justify-between p-4 hover:bg-brand-subtle transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <div className="text-left">
                  <h2 className="text-lg font-bold text-gray-900">Message Templates</h2>
                  <p className="text-sm text-gray-600">Customize automatic messages</p>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transform transition-transform ${
                  expandedSection === 'messages' ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedSection === 'messages' && (
              <div className="px-4 pb-4 space-y-4 border-t pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Welcome Message
                  </label>
                  <TextArea
                    rows={3}
                    placeholder="Hi! 👋 Welcome to our store. How can I help you today?"
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Sent when a customer starts a conversation
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Away Message
                  </label>
                  <TextArea
                    rows={3}
                    placeholder="We're currently away but we'll get back to you soon!"
                    value={awayMessage}
                    onChange={(e) => setAwayMessage(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Sent when you're offline or unavailable
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fallback Message
                  </label>
                  <TextArea
                    rows={3}
                    placeholder="I'm not sure I understand. Could you rephrase that?"
                    value={fallbackMessage}
                    onChange={(e) => setFallbackMessage(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Sent when the bot doesn't understand the customer's request
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t flex justify-end">
                  <Button 
                    onClick={handleSaveBotSettings}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            )}
        </Card>

          {/* Security Card */}
        <Card>
            <button
              onClick={() => toggleSection('password')}
              className="w-full flex items-center justify-between p-4 hover:bg-brand-subtle transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div className="text-left">
                  <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
                  <p className="text-sm text-gray-600">Update your account password</p>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transform transition-transform ${
                  expandedSection === 'password' ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {expandedSection === 'password' && (
              <div className="px-4 pb-4 border-t pt-4">
          <div className="space-y-4">
            <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                    <PasswordField
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                      <PasswordField
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                      <PasswordField
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>

                  {newPassword && (
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className={newPassword.length >= 6 ? "text-green-600" : "text-gray-500"}>
                        {newPassword.length >= 6 ? "✓" : "○"} At least 6 characters
                      </div>
                      <div className={newPassword === confirmPassword && confirmPassword ? "text-green-600" : "text-gray-500"}>
                        {newPassword === confirmPassword && confirmPassword ? "✓" : "○"} Passwords match
            </div>
          </div>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t flex justify-end">
                  <Button 
                    variant="outline" 
                    onClick={handleChangePassword}
                    disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                  >
                    {changingPassword ? "Changing..." : "Change Password"}
                  </Button>
                </div>
          </div>
            )}
        </Card>
      </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Danger Zone Card */}
      <Card>
            <div className="border-b-2 border-rose-300 pb-4 mb-6">
              <h2 className="text-lg font-bold text-rose-600 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Danger Zone
              </h2>
            </div>

        <div className="space-y-4">
          <div>
                <div className="text-sm font-bold text-gray-900 mb-2">Clear Bot Memory</div>
                <div className="text-sm text-gray-700 mb-3">
                  Delete all conversation history and customer sessions. The bot will start fresh with all customers.
            </div>
              <Button 
                variant="outline" 
                  className="w-full border-rose-200 text-rose-600 hover:bg-rose-50"
                  onClick={() => setShowClearMemoryConfirm(true)}
                disabled={clearingMemory}
              >
                {clearingMemory ? (
                  <>
                      <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Clearing...
                  </>
                ) : (
                  <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear All Bot Memory
                  </>
                )}
              </Button>
                </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Clear Memory Confirmation Dialog */}
      <ConfirmDialog
        open={showClearMemoryConfirm}
        title="Clear Bot Memory"
        description="Are you sure you want to clear all bot chat memory? This will delete all conversation history and customer sessions. This action cannot be undone."
        confirmText="Clear Memory"
        destructive
        onCancel={() => setShowClearMemoryConfirm(false)}
        onConfirm={handleClearBotMemory}
      />
    </div>
  );
}
