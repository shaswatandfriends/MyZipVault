"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Settings,
  Lock,
  Trash2,
  Loader2,
  ShieldAlert,
  Eye,
  EyeOff,
  User,
  Phone,
  Save,
  Bell,
  Mail,
  Smartphone,
  AlarmClock,
} from "@/lib/icons";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { signOut, useSession } from "next-auth/react";

interface NotificationPreferences {
  email_notifications: boolean;
  sms_notifications: boolean;
  reminder_notifications: boolean;
}

export default function CandidateSettingsPage() {
  const { user } = useAuth();
  const { update: updateSession } = useSession();

  // Profile state
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [yearsTotal, setYearsTotal] = useState("");
  const [yearsSpecialty, setYearsSpecialty] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    email_notifications: true,
    sms_notifications: false,
    reminder_notifications: true,
  });
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  // Fetch profile data — loads from onboarding-details API which has all fields
  useEffect(() => {
    async function fetchProfile() {
      try {
        // Fetch notification preferences + phone from the profile API
        const profileRes = await fetch("/api/candidate/profile");
        if (profileRes.ok) {
          const data = await profileRes.json();
          setPhone(data.phone || "");
          if (data.notification_preferences) {
            setNotificationPrefs(data.notification_preferences);
          }
        }

        // Fetch all onboarding fields from the onboarding-details API
        const obRes = await fetch("/api/candidate/onboarding-details", { cache: "no-store" });
        if (obRes.ok) {
          const obData = await obRes.json();
          if (obData.profile) {
            setFirstName(obData.profile.first_name || "");
            setMiddleName(obData.profile.middle_name || "");
            setLastName(obData.profile.last_name || "");
            setPhone(obData.profile.phone || phone);
            setJobTitle(obData.profile.job_title || "");
            setSpecialty(obData.profile.specialty || "");
            setCity(obData.profile.city || "");
            setState(obData.profile.state || "");
            setZipCode(obData.profile.zip_code || "");
            setYearsTotal(obData.profile.years_experience_total ?? "");
            setYearsSpecialty(obData.profile.years_experience_specialty ?? "");
          }
        }
      } catch {
        // Silently fail — fields will remain with auth context defaults
      } finally {
        setIsProfileLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) {
      toast.error("First name is required");
      return;
    }

    setIsSavingProfile(true);
    try {
      // Save all fields via the onboarding-details API (handles upsert
      // + syncs first_name/last_name to User record)
      const res = await fetch("/api/candidate/onboarding-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          middle_name: middleName.trim() || undefined,
          last_name: lastName.trim(),
          phone: phone.trim(),
          job_title: jobTitle.trim(),
          specialty: specialty.trim(),
          city: city.trim(),
          state: state.trim(),
          zip_code: zipCode.trim(),
          years_experience_total: yearsTotal || 0,
          years_experience_specialty: yearsSpecialty || 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("Failed to save profile", { description: data.error });
        return;
      }

      // Refresh the session so auth context picks up updated firstName/lastName
      await updateSession();

      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSavingNotifications(true);
    try {
      const res = await fetch("/api/candidate/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification_preferences: notificationPrefs,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("Failed to save notification preferences", { description: data.error });
        return;
      }

      toast.success("Notification preferences updated");
    } catch {
      toast.error("Failed to save notification preferences");
    } finally {
      setIsSavingNotifications(false);
    }
  };

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Delete account state
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.error("New password must contain uppercase, lowercase, and a number");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("Failed to change password", { description: data.error });
        return;
      }

      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch {
      toast.error("Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const res = await fetch("/api/users/delete-account", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("Failed to delete account", { description: data.error });
        return;
      }

      toast.success("Account scheduled for deletion", {
        description: "You have 30 days to restore your account by contacting support.",
      });

      // Sign out the user
      await signOut({ redirect: false });
      window.location.href = "/login";
    } catch {
      toast.error("Failed to delete account");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Settings"
        description="Manage your account settings and preferences."
      />

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-5 text-primary" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Enter your first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isSavingProfile || isProfileLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input
                  id="middleName"
                  type="text"
                  placeholder="(optional)"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  disabled={isSavingProfile || isProfileLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Enter your last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isSavingProfile || isProfileLoading}
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1.5">
                <Phone className="size-3.5 text-muted-foreground" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isSavingProfile || isProfileLoading}
              />
            </div>

            {/* Job title + specialty */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  type="text"
                  placeholder="e.g. Registered Nurse"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  disabled={isSavingProfile || isProfileLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialty">Specialty</Label>
                <Input
                  id="specialty"
                  type="text"
                  placeholder="e.g. ICU, ER, Labor &amp; Delivery"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  disabled={isSavingProfile || isProfileLoading}
                />
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="e.g. Austin"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={isSavingProfile || isProfileLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  type="text"
                  placeholder="e.g. TX"
                  maxLength={2}
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  disabled={isSavingProfile || isProfileLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  type="text"
                  placeholder="e.g. 78701"
                  maxLength={10}
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  disabled={isSavingProfile || isProfileLoading}
                />
              </div>
            </div>

            {/* Years of experience */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yearsTotal">Total Years of Work Experience</Label>
                <Input
                  id="yearsTotal"
                  type="number"
                  min="0"
                  max="80"
                  placeholder="e.g. 5"
                  value={yearsTotal}
                  onChange={(e) => setYearsTotal(e.target.value)}
                  disabled={isSavingProfile || isProfileLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearsSpecialty">Years in Current Specialty</Label>
                <Input
                  id="yearsSpecialty"
                  type="number"
                  min="0"
                  max="80"
                  placeholder="e.g. 3"
                  value={yearsSpecialty}
                  onChange={(e) => setYearsSpecialty(e.target.value)}
                  disabled={isSavingProfile || isProfileLoading}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSavingProfile || isProfileLoading}
                className="gap-2"
              >
                {isSavingProfile ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Save Profile
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-5 text-primary" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Notifications */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Mail className="size-4 text-primary" />
              </div>
              <div>
                <Label htmlFor="email-notifications" className="text-sm font-medium">
                  Email Notifications
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Receive email alerts for credential expiry, reference requests, and sharing requests
                </p>
              </div>
            </div>
            <Switch
              id="email-notifications"
              checked={notificationPrefs.email_notifications}
              onCheckedChange={(checked) =>
                setNotificationPrefs((prev) => ({ ...prev, email_notifications: checked }))
              }
              disabled={isSavingNotifications}
            />
          </div>

          {/* SMS Notifications */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Smartphone className="size-4 text-primary" />
              </div>
              <div>
                <Label htmlFor="sms-notifications" className="text-sm font-medium">
                  SMS Notifications
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Receive text message alerts {phone ? `at ${phone}` : "(phone number required)"}
                </p>
              </div>
            </div>
            <Switch
              id="sms-notifications"
              checked={notificationPrefs.sms_notifications}
              onCheckedChange={(checked) =>
                setNotificationPrefs((prev) => ({ ...prev, sms_notifications: checked }))
              }
              disabled={isSavingNotifications || !phone}
            />
          </div>

          {/* Reminder Notifications */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <AlarmClock className="size-4 text-primary" />
              </div>
              <div>
                <Label htmlFor="reminder-notifications" className="text-sm font-medium">
                  Credential Expiry Reminders
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Get reminded 30 days before your credentials expire
                </p>
              </div>
            </div>
            <Switch
              id="reminder-notifications"
              checked={notificationPrefs.reminder_notifications}
              onCheckedChange={(checked) =>
                setNotificationPrefs((prev) => ({ ...prev, reminder_notifications: checked }))
              }
              disabled={isSavingNotifications}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveNotifications}
              disabled={isSavingNotifications || isProfileLoading}
              className="gap-2"
            >
              {isSavingNotifications ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="size-5 text-primary" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                value="Candidate"
                disabled
                className="bg-muted"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="size-5 text-primary" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isChangingPassword}
                  className="pr-10"
                  autoComplete="current-password"
                  maxLength={128}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="size-4 text-muted-foreground" />
                  ) : (
                    <Eye className="size-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isChangingPassword}
                    className="pr-10"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="size-4 text-muted-foreground" />
                    ) : (
                      <Eye className="size-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                <PasswordInput
                  id="confirmNewPassword"
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  disabled={isChangingPassword}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isChangingPassword} className="gap-2">
                {isChangingPassword ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Password"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <ShieldAlert className="size-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Delete My Account</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently delete your account and all associated data
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="gap-2 shrink-0"
                  disabled={isDeletingAccount}
                >
                  <Trash2 className="size-4" />
                  Delete My Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <span className="block">
                      This will suspend your account and revoke all recruiter access immediately.
                    </span>
                    <span className="block font-medium text-foreground">
                      You have 30 days to restore your account by contacting support.
                    </span>
                    <span className="block">
                      After 30 days, your account and all associated data will be permanently deleted.
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeletingAccount}
                  >
                    {isDeletingAccount ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-2" />
                        Deleting...
                      </>
                    ) : (
                      "Yes, Delete My Account"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
