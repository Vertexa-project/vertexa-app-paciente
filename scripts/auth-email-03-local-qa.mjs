/**
 * AUTH-EMAIL-03 — QA local contra o stack isolado + Mailpit.
 * Cria usuários só no Auth local. Não imprime senha, token nem service_role.
 */
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [
  process.env.VERTEXA_AUTHEMAIL_STACK,
  path.join(root, ".tmp-authemail01"),
  path.resolve(root, "..", "vertexa-web-pro", ".tmp-authemail01"),
].filter(Boolean);
const isolated = candidates.find((dir) => existsSync(dir));
const MAIL_URL = "http://127.0.0.1:55624";
const ORIGIN = "http://localhost:8080";
const PASSWORD = "local-qa-ok-8";
const NEW_PASSWORD = "local-qa-ok-9";

function fail(step, detail) {
  console.error(`FAIL ${step}${detail ? ` — ${detail}` : ""}`);
  process.exit(1);
}

function pass(step) {
  console.info(`PASS ${step}`);
}

function loadIsolatedEnv() {
  if (!isolated) fail("stack", "tmpdir isolado ausente");
  const result = spawnSync("npx", ["supabase", "status", "-o", "env"], {
    cwd: isolated,
    encoding: "utf8",
    shell: true,
  });
  if (result.status !== 0) fail("stack", "supabase status falhou");
  const text = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const get = (key) => text.match(new RegExp(`^${key}=(.+)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, "");
  const apiUrl = get("API_URL");
  const anonKey = get("ANON_KEY");
  const serviceKey = get("SERVICE_ROLE_KEY");
  if (!apiUrl || !anonKey || !serviceKey) fail("stack", "env local incompleto");
  if (/supabase\.co/i.test(apiUrl)) fail("stack", "recusou URL remota");
  return { apiUrl, anonKey, serviceKey };
}

async function mailpitMessages() {
  const res = await fetch(`${MAIL_URL}/api/v1/messages`);
  if (!res.ok) return null;
  return res.json();
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractLink(htmlOrText) {
  const source = decodeHtml(htmlOrText ?? "");
  const match = source.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
  const scored = match
    .map((raw) => {
      try {
        const url = new URL(raw);
        const keys = [...url.searchParams.keys()];
        const hasType = keys.includes("type");
        const hasToken = keys.includes("token") || keys.includes("token_hash");
        return { raw, score: (hasType ? 2 : 0) + (hasToken ? 2 : 0) + (url.pathname.includes("verify") ? 1 : 0) };
      } catch {
        return { raw, score: 0 };
      }
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.score ? scored[0].raw : null;
}

async function verifyFromLink(client, link) {
  const res = await fetch(link, { redirect: "manual" });
  const location = res.headers.get("location") ?? "";
  if (!location) {
    return { data: { session: null }, error: { message: `verify HTTP ${res.status}` } };
  }
  let hash = "";
  try {
    hash = new URL(location).hash;
  } catch {
    const idx = location.indexOf("#");
    hash = idx >= 0 ? location.slice(idx) : "";
  }
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) {
    return { data: { session: null }, error: { message: "verify sem sessão no redirect" } };
  }
  return client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
}

function messageRecipients(message) {
  return JSON.stringify(message.To ?? message.to ?? message.recipients ?? "").toLowerCase();
}

async function waitForMail(to, subjectRe, timeoutMs = 20_000) {
  const started = Date.now();
  const needle = to.toLowerCase();
  while (Date.now() - started < timeoutMs) {
    const box = await mailpitMessages();
    const messages = [...(box?.messages ?? box?.items ?? [])].sort((a, b) => {
      const ta = Date.parse(a.Created ?? a.created ?? "") || 0;
      const tb = Date.parse(b.Created ?? b.created ?? "") || 0;
      return tb - ta;
    });
    for (const hit of messages) {
      const subject = String(hit.Subject ?? hit.subject ?? "");
      if (!subjectRe.test(subject)) continue;
      if (!messageRecipients(hit).includes(needle)) continue;
      const id = hit.ID ?? hit.id;
      const full = await fetch(`${MAIL_URL}/api/v1/message/${id}`).then((r) => r.json());
      if (!messageRecipients(full).includes(needle) && !messageRecipients(hit).includes(needle)) continue;
      const body = `${full.HTML ?? full.html ?? ""} ${full.Text ?? full.text ?? ""}`;
      const link = extractLink(body);
      return { subject: full.Subject ?? hit.Subject ?? "", link };
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

function activationPayload(email, fullName) {
  return {
    email,
    password: PASSWORD,
    options: {
      emailRedirectTo: `${ORIGIN}/auth/callback`,
      data: { full_name: fullName, signup_surface: "patient_app" },
    },
  };
}

function assertSafeMetadata(metadata, step) {
  const raw = JSON.stringify(metadata ?? {});
  if (/(role|patient_id|profile_id|clinic_id|professional_id|is_admin)/i.test(raw)) {
    fail(step, "metadata contém autoridade");
  }
}

async function countRows(admin, table, column, value) {
  const { data, error } = await admin.from(table).select("id").eq(column, value);
  if (error) fail(`count-${table}`, error.message);
  return (data ?? []).length;
}

await fetch(`${MAIL_URL}/api/v1/messages`, { method: "DELETE" }).catch(() => undefined);

const env = loadIsolatedEnv();
const admin = createClient(env.apiUrl, env.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const stamp = Date.now();
const staffEmail = `ae03-staff-${stamp}@example.test`;
const patientFirstEmail = `ae03-pfirst-${stamp}@example.test`;
const authFirstEmail = `ae03-afirst-${stamp}@example.test`;
const unconfirmedEmail = `ae03-unconf-${stamp}@example.test`;
const poisonedEmail = `ae03-poison-${stamp}@example.test`;

const staffClient = createClient(env.apiUrl, env.anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const staffSignUp = await staffClient.auth.signUp({
  email: staffEmail,
  password: PASSWORD,
  options: { emailRedirectTo: `${ORIGIN}/auth/callback`, data: { full_name: "QA Staff", signup_surface: "web" } },
});
if (staffSignUp.error) fail("staff-signup", staffSignUp.error.message);
const staffMail = await waitForMail(staffEmail, /confirm/i);
if (!staffMail?.link) fail("staff-mail", "confirmação do staff não capturada");
const staffConfirm = await verifyFromLink(staffClient, staffMail.link);
const staffSession = staffConfirm.data.session
  ? staffConfirm
  : await staffClient.auth.signInWithPassword({ email: staffEmail, password: PASSWORD });
if (staffSession.error || !staffSession.data.session) fail("staff-login", staffSession.error?.message);
const staffEnsure = await staffClient.rpc("ensure_my_profile");
if (staffEnsure.error) fail("staff-ensure", staffEnsure.error.message);
const { data: staffProfile, error: staffProfileErr } = await admin
  .from("profiles")
  .select("id")
  .eq("auth_user_id", staffSession.data.user.id)
  .maybeSingle();
if (staffProfileErr || !staffProfile) fail("staff-profile", staffProfileErr?.message ?? "sem profile");

const clinic = await staffClient.rpc("create_clinic_with_owner", { p_name: `AE03 Clinic ${stamp}` });
let clinicId =
  typeof clinic.data === "string" ? clinic.data : clinic.data?.clinic_id ?? clinic.data?.id;
if (!clinicId) {
  const fixtureClinic = await admin
    .from("clinics")
    .insert({
      name: `AE03 Clinic ${stamp}`,
      owner_profile_id: staffProfile.id,
      join_code: `AE${stamp.toString(36).slice(-6).toUpperCase()}`.slice(0, 8),
    })
    .select("id")
    .single();
  if (fixtureClinic.error || !fixtureClinic.data) {
    fail("staff-clinic", fixtureClinic.error?.message ?? clinic.error?.message ?? "sem clínica");
  }
  clinicId = fixtureClinic.data.id;
  const staffPro = await admin.from("professionals").insert({
    profile_id: staffProfile.id,
    clinic_id: clinicId,
    type: "other",
    clinic_role: "admin",
    status: "active",
  });
  if (staffPro.error) fail("staff-clinic", staffPro.error.message);
  const promoted = await admin
    .from("profiles")
    .update({ role: "professional", status: "active" })
    .eq("id", staffProfile.id);
  if (promoted.error) fail("staff-clinic", promoted.error.message);
}
if (!clinicId) fail("staff-clinic", "id da clínica ausente");
pass("staff-clinic");

const created = await staffClient.rpc("create_patient", {
  p_clinic_id: clinicId,
  p_full_name: "QA Patient First",
  p_email: patientFirstEmail,
});
if (created.error || !created.data) fail("patient-first-fixture", created.error?.message ?? "sem patient");
const fixturePatientId = created.data;
const { data: fixturePatient, error: fixtureErr } = await admin
  .from("patients")
  .select("id, profile_id")
  .eq("id", fixturePatientId)
  .maybeSingle();
if (fixtureErr || !fixturePatient) fail("patient-first-fixture", fixtureErr?.message ?? "patient não lido");
const fixtureProfileId = fixturePatient.profile_id;
const { data: fixtureProfile, error: fixtureProfileErr } = await admin
  .from("profiles")
  .select("id, email, auth_user_id")
  .eq("id", fixtureProfileId)
  .maybeSingle();
if (fixtureProfileErr || !fixtureProfile) fail("patient-first-fixture", fixtureProfileErr?.message ?? "profile não lido");
if (fixtureProfile.auth_user_id) fail("patient-first-fixture", "auth_user_id já ligado");
pass("patient-first-fixture");

const patientClient = createClient(env.apiUrl, env.anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const activateFirst = await patientClient.auth.signUp(activationPayload(patientFirstEmail, "QA Patient First"));
if (activateFirst.error) fail("patient-first-signup", activateFirst.error.message);
if (activateFirst.data.session) fail("patient-first-signup", "sessão inesperada com confirm ON");
assertSafeMetadata(activateFirst.data.user?.user_metadata, "patient-first-metadata");
pass("patient-first-signup-no-session");

const firstMail = await waitForMail(patientFirstEmail, /confirm/i);
if (!firstMail?.link) fail("patient-first-mail", "e-mail de confirmação não capturado");
pass("patient-first-mail");

const firstConfirm = await verifyFromLink(patientClient, firstMail.link);
if (firstConfirm.error) fail("patient-first-confirm", firstConfirm.error.message);
const firstLogin = firstConfirm.data.session
  ? firstConfirm
  : await patientClient.auth.signInWithPassword({ email: patientFirstEmail, password: PASSWORD });
if (firstLogin.error || !firstLogin.data.session) fail("patient-first-login", firstLogin.error?.message);
const firstEnsure = await patientClient.rpc("ensure_my_profile");
if (firstEnsure.error) fail("patient-first-ensure", firstEnsure.error.message);

const { data: linkedProfile, error: linkedErr } = await admin
  .from("profiles")
  .select("id, auth_user_id, email")
  .eq("email", patientFirstEmail)
  .maybeSingle();
if (linkedErr || !linkedProfile) fail("patient-first-link", linkedErr?.message ?? "profile ausente");
if (linkedProfile.id !== fixtureProfileId) fail("patient-first-link", "profile duplicado");
if (linkedProfile.auth_user_id !== firstLogin.data.user.id) fail("patient-first-link", "auth_user_id não ligado");
const profileCount = await countRows(admin, "profiles", "email", patientFirstEmail);
const patientCount = await countRows(admin, "patients", "profile_id", fixtureProfileId);
if (profileCount !== 1 || patientCount !== 1) {
  fail("patient-first-link", `profiles=${profileCount} patients=${patientCount}`);
}
pass("patient-first-linked-home");

const wrong = await patientClient.auth.signInWithPassword({ email: patientFirstEmail, password: "wrong-pass" });
if (!wrong.error) fail("login-wrong", "aceitou senha errada");
pass("login-wrong-safe");

const authFirstClient = createClient(env.apiUrl, env.anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const authFirstSignUp = await authFirstClient.auth.signUp(activationPayload(authFirstEmail, "QA Auth First"));
if (authFirstSignUp.error) fail("auth-first-signup", authFirstSignUp.error.message);
if (authFirstSignUp.data.session) fail("auth-first-signup", "sessão inesperada");
const authFirstMail = await waitForMail(authFirstEmail, /confirm/i);
if (!authFirstMail?.link) fail("auth-first-mail", "confirmação não capturada");
const authFirstConfirm = await verifyFromLink(authFirstClient, authFirstMail.link);
if (authFirstConfirm.error) fail("auth-first-confirm", authFirstConfirm.error.message);
const authFirstLogin = authFirstConfirm.data.session
  ? authFirstConfirm
  : await authFirstClient.auth.signInWithPassword({ email: authFirstEmail, password: PASSWORD });
if (authFirstLogin.error || !authFirstLogin.data.session) fail("auth-first-login", authFirstLogin.error?.message);
const authFirstEnsure = await authFirstClient.rpc("ensure_my_profile");
if (authFirstEnsure.error) fail("auth-first-ensure", authFirstEnsure.error.message);

const { data: pendingProfile, error: pendingErr } = await admin
  .from("profiles")
  .select("id, status, auth_user_id")
  .eq("auth_user_id", authFirstLogin.data.user.id)
  .maybeSingle();
if (pendingErr || !pendingProfile) fail("auth-first-pending", pendingErr?.message ?? "sem profile");
const pendingPatients = await countRows(admin, "patients", "profile_id", pendingProfile.id);
if (pendingPatients !== 0) fail("auth-first-pending", "patient criado no signup");
pass("auth-first-pending");

const claim = await staffClient.rpc("create_patient", {
  p_clinic_id: clinicId,
  p_full_name: "QA Auth First",
  p_email: authFirstEmail,
});
if (claim.error || !claim.data) fail("auth-first-claim", claim.error?.message ?? "create_patient falhou");
const { data: claimed, error: claimedErr } = await admin
  .from("patients")
  .select("id, profile_id")
  .eq("id", claim.data)
  .maybeSingle();
if (claimedErr || !claimed) fail("auth-first-claim", claimedErr?.message ?? "patient ausente");
if (claimed.profile_id !== pendingProfile.id) fail("auth-first-claim", "profile não reutilizado");
const claimedProfiles = await countRows(admin, "profiles", "auth_user_id", authFirstLogin.data.user.id);
if (claimedProfiles !== 1) fail("auth-first-claim", `profiles=${claimedProfiles}`);
pass("auth-first-claimed-home");

const unconfClient = createClient(env.apiUrl, env.anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const unconfSignUp = await unconfClient.auth.signUp(activationPayload(unconfirmedEmail, "QA Unconfirmed"));
if (unconfSignUp.error) fail("unconfirmed-signup", unconfSignUp.error.message);
const unconfLogin = await unconfClient.auth.signInWithPassword({
  email: unconfirmedEmail,
  password: PASSWORD,
});
if (unconfLogin.data.session) fail("unconfirmed-login", "sessão concedida sem confirmar");
pass("unconfirmed-blocked");

const poisonClient = createClient(env.apiUrl, env.anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const poisonSignUp = await poisonClient.auth.signUp({
  email: poisonedEmail,
  password: PASSWORD,
  options: {
    emailRedirectTo: `${ORIGIN}/auth/callback`,
    data: {
      full_name: "QA Poison",
      signup_surface: "patient_app",
      role: "patient",
      patient_id: "00000000-0000-0000-0000-000000000099",
      clinic_id: clinicId,
    },
  },
});
if (poisonSignUp.error) fail("authority-signup", poisonSignUp.error.message);
const poisonMail = await waitForMail(poisonedEmail, /confirm/i);
if (!poisonMail?.link) fail("authority-mail", "confirmação não capturada");
const poisonConfirm = await verifyFromLink(poisonClient, poisonMail.link);
const poisonLogin = poisonConfirm.data.session
  ? poisonConfirm
  : await poisonClient.auth.signInWithPassword({ email: poisonedEmail, password: PASSWORD });
if (poisonLogin.error || !poisonLogin.data.session) fail("authority-login", poisonLogin.error?.message);
await poisonClient.rpc("ensure_my_profile");
const { data: poisonProfile } = await admin
  .from("profiles")
  .select("id")
  .eq("auth_user_id", poisonLogin.data.user.id)
  .maybeSingle();
const poisonPatientRows = poisonProfile ? await countRows(admin, "patients", "profile_id", poisonProfile.id) : 0;
if (poisonPatientRows > 0) fail("authority-patients", "signup criou patient");
const { count: extraClinics } = await admin
  .from("clinics")
  .select("id", { count: "exact", head: true })
  .eq("name", "QA Poison");
if ((extraClinics ?? 0) > 0) fail("authority-clinic", "signup criou clínica");
pass("activation-no-authority");

const reset = await patientClient.auth.resetPasswordForEmail(patientFirstEmail, {
  redirectTo: `${ORIGIN}/auth/update-password`,
});
if (reset.error) fail("forgot-password", reset.error.message);
const resetMail = await waitForMail(patientFirstEmail, /reset|recover|redefin/i);
if (!resetMail?.link) fail("recovery-mail", "e-mail de recovery não capturado");
pass("recovery-mail");
const recoveryClient = createClient(env.apiUrl, env.anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const recoveryVerify = await verifyFromLink(recoveryClient, resetMail.link);
if (recoveryVerify.error || !recoveryVerify.data.session) {
  fail("recovery-verify", recoveryVerify.error?.message ?? "sem sessão de recovery");
}
const updated = await recoveryClient.auth.updateUser({ password: NEW_PASSWORD });
if (updated.error) fail("update-password", updated.error.message);
await recoveryClient.auth.signOut();
const oldLogin = await patientClient.auth.signInWithPassword({ email: patientFirstEmail, password: PASSWORD });
if (oldLogin.data.session) fail("login-new-password", "senha antiga ainda funciona");
const newLogin = await patientClient.auth.signInWithPassword({ email: patientFirstEmail, password: NEW_PASSWORD });
if (newLogin.error || !newLogin.data.session) fail("login-new-password", newLogin.error?.message);
pass("recovery-update-login");

console.info("AUTH-EMAIL-03 local QA complete");
