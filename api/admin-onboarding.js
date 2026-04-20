function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function getEnv(name, required = true) {
  const v = String(process.env[name] || '').trim()
  if (!v && required) throw new Error(`Falta variable de entorno: ${name}`)
  return v
}

function getOptionalEnv(name) {
  return String(process.env[name] || '').trim()
}

function randomPassword(length = 14) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*'
  let out = ''
  for (let i = 0; i < length; i += 1) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

function generateCommerceId() {
  const base = (globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`).replace(/-/g, '')
  return `com_${base.slice(0, 20)}`
}

function generateLicenseKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `GCOM-${seg()}-${seg()}-${seg()}`
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function parseJsonOrText(res) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

async function verifyCaller(req, supabaseUrl, anonKey) {
  const auth = String(req.headers?.authorization || '')
  const m = auth.match(/^Bearer\s+(.+)$/i)
  if (!m) return { ok: false, status: 401, error: 'Falta Authorization: Bearer <access_token>' }
  const accessToken = m[1].trim()

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }
  })
  if (!userRes.ok) return { ok: false, status: 401, error: 'Sesión inválida o expirada' }
  const user = await userRes.json()
  const email = String(user?.email || '').trim().toLowerCase()
  if (!email) return { ok: false, status: 401, error: 'La sesión no contiene email' }

  const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/license_admin_from_jwt`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: '{}'
  })
  const raw = await rpcRes.text()
  if (!rpcRes.ok) {
    let detail = `HTTP ${rpcRes.status}`
    try {
      const b = JSON.parse(raw)
      detail = b.message || b.details || b.hint || detail
    } catch {
      if (raw) detail = `${detail}: ${raw.slice(0, 280)}`
    }
    return { ok: false, status: 500, error: `No se pudo verificar la allowlist de admins (${detail})` }
  }
  let allowed = false
  try {
    allowed = JSON.parse(raw)
  } catch {
    return { ok: false, status: 500, error: 'No se pudo verificar la allowlist de admins (respuesta inválida)' }
  }
  if (allowed !== true) {
    return { ok: false, status: 403, error: 'Tu email no está autorizado para provisión' }
  }
  return { ok: true, email }
}

async function getDemoRequest(supabaseUrl, serviceKey, requestId) {
  const q = new URLSearchParams()
  q.set('select', '*')
  q.set('id', `eq.${requestId}`)
  q.set('limit', '1')
  const res = await fetch(`${supabaseUrl}/rest/v1/demo_onboarding_requests?${q.toString()}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  })
  if (!res.ok) throw new Error('No se pudo leer la solicitud demo')
  const rows = await res.json()
  return rows[0] || null
}

async function deleteDemoOnboardingAndLicense(supabaseUrl, serviceKey, payload) {
  const requestId = String(payload?.requestId || '').trim()
  const commerceId = String(payload?.commerceId || '').trim()
  const activationKey = String(payload?.activationKey || '').trim()
  if (!requestId) throw new Error('Falta requestId')
  if (!commerceId && !activationKey) {
    throw new Error('Falta referencia de licencia (commerceId o activationKey)')
  }

  const qReq = `id=eq.${encodeURIComponent(requestId)}`
  const deletedReqRows = await postgrestDelete(supabaseUrl, serviceKey, 'demo_onboarding_requests', qReq)

  const qLic = commerceId
    ? `commerce_id=eq.${encodeURIComponent(commerceId)}&es_demo=eq.true`
    : `clave=eq.${encodeURIComponent(activationKey)}&es_demo=eq.true`
  const deletedLicRows = await postgrestDelete(supabaseUrl, serviceKey, 'licencias', qLic)

  for (const lic of deletedLicRows) {
    await postgrestInsert(supabaseUrl, serviceKey, 'license_deletions_history', {
      actor_email: String(payload?.actorEmail || '').trim().toLowerCase() || null,
      source: 'altas',
      reason: 'delete_onboarding_full',
      commerce_id: lic?.commerce_id || null,
      license_key: lic?.clave || null,
      license_snapshot: lic,
      onboarding_snapshot: deletedReqRows?.[0] || null
    })
  }
}

async function deleteLicenseAndRelatedOnboarding(supabaseUrl, serviceKey, payload) {
  const licenseId = String(payload?.licenseId || '').trim()
  const commerceId = String(payload?.commerceId || '').trim()
  const activationKey = String(payload?.activationKey || '').trim()
  if (!licenseId && !commerceId && !activationKey) throw new Error('Falta referencia de licencia')

  const qLic = licenseId
    ? `id=eq.${encodeURIComponent(licenseId)}`
    : commerceId
      ? `commerce_id=eq.${encodeURIComponent(commerceId)}`
      : `clave=eq.${encodeURIComponent(activationKey)}`
  const deletedLicRows = await postgrestDelete(supabaseUrl, serviceKey, 'licencias', qLic)

  for (const lic of deletedLicRows) {
    const cid = String(lic?.commerce_id || '').trim()
    const key = String(lic?.clave || '').trim()
    const qReq = cid
      ? `commerce_id=eq.${encodeURIComponent(cid)}`
      : key
        ? `activation_key=eq.${encodeURIComponent(key)}`
        : ''
    const deletedReqRows = qReq
      ? await postgrestDelete(supabaseUrl, serviceKey, 'demo_onboarding_requests', qReq)
      : []
    await postgrestInsert(supabaseUrl, serviceKey, 'license_deletions_history', {
      actor_email: String(payload?.actorEmail || '').trim().toLowerCase() || null,
      source: 'licencias',
      reason: 'delete_license_full',
      commerce_id: cid || null,
      license_key: key || null,
      license_snapshot: lic,
      onboarding_snapshot: deletedReqRows?.[0] || null
    })
  }
}

async function listAuthUsersPage(supabaseUrl, serviceKey, page = 1, perPage = 200) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  })
  if (!res.ok) return { ok: false, users: [] }
  const data = await res.json()
  const users = Array.isArray(data?.users) ? data.users : []
  return { ok: true, users }
}

async function findAuthUserByEmail(supabaseUrl, serviceKey, email) {
  const normalized = String(email || '').trim().toLowerCase()
  let page = 1
  while (page <= 20) {
    const { ok, users } = await listAuthUsersPage(supabaseUrl, serviceKey, page, 200)
    if (!ok) return null
    const found = users.find((u) => String(u?.email || '').trim().toLowerCase() === normalized)
    if (found) return found
    if (users.length < 200) break
    page += 1
  }
  return null
}

async function fetchAuthUserWithPasswordGrant(supabaseUrl, anonKey, email, password) {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  })
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  const u = data?.user
  if (!u?.id) return null
  return u
}

function isDuplicateAuthUserError(err) {
  const s = String(err?.message || err || '').toLowerCase()
  return (
    s.includes('already been registered') ||
    s.includes('already registered') ||
    s.includes('email address is already') ||
    s.includes('user already registered') ||
    (s.includes('unique') && s.includes('email')) ||
    (s.includes('duplicate') && s.includes('email'))
  )
}

function hintIfLegacyKeysDisabled(msg) {
  const s = String(msg || '')
  if (!/legacy api keys are disabled/i.test(s)) return s
  return `${s} — En Supabase → Project Settings → API Keys: usá la Secret key (sb_secret_…) en SUPABASE_SERVICE_ROLE_KEY y la Publishable (sb_publishable_…) en SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY (local y Vercel). O reactivá las claves legacy en esa misma pantalla.`
}

async function createAuthUser(supabaseUrl, serviceKey, email, password) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        gcom_must_change_password: true
      }
    })
  })
  if (!res.ok) {
    const body = await parseJsonOrText(res)
    const raw = body?.msg || body?.message || body?.error_description || body?.error || `HTTP ${res.status}`
    const msg = hintIfLegacyKeysDisabled(raw)
    throw new Error(`No se pudo crear usuario auth: ${msg}`)
  }
  return res.json()
}

async function updateAuthUserPassword(supabaseUrl, serviceKey, userId, password) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      password,
      user_metadata: {
        gcom_must_change_password: true
      }
    })
  })
  if (!res.ok) {
    const body = await parseJsonOrText(res)
    const raw = body?.msg || body?.message || body?.error_description || body?.error || `HTTP ${res.status}`
    const msg = hintIfLegacyKeysDisabled(raw)
    throw new Error(`No se pudo actualizar contraseña temporal: ${msg}`)
  }
  return res.json()
}

async function postgrestInsert(supabaseUrl, serviceKey, table, payload) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const body = await parseJsonOrText(res)
    const msg = body?.message || body?.details || body?.hint || `HTTP ${res.status}`
    throw new Error(`${table}: ${msg}`)
  }
  const rows = await res.json()
  return Array.isArray(rows) ? rows[0] : rows
}

async function postgrestPatch(supabaseUrl, serviceKey, table, query, payload) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const body = await parseJsonOrText(res)
    const msg = body?.message || body?.details || body?.hint || `HTTP ${res.status}`
    throw new Error(`${table}: ${msg}`)
  }
  const rows = await res.json()
  return Array.isArray(rows) ? rows[0] : rows
}

async function postgrestDelete(supabaseUrl, serviceKey, table, query) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    method: 'DELETE',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    }
  })
  if (!res.ok) {
    const body = await parseJsonOrText(res)
    const msg = body?.message || body?.details || body?.hint || `HTTP ${res.status}`
    throw new Error(`${table}: ${msg}`)
  }
  const rows = await res.json().catch(() => [])
  return Array.isArray(rows) ? rows : []
}

function buildDeliveryMessage(email, tempPassword, licenseKey, demoUrl) {
  const lines = [
    'Para dar de alta ingrese usuario, contraseña y luego la clave de activación.',
    demoUrl ? `Ingrese a este link: ${demoUrl}` : null,
    `Usuario: ${email || '—'}`,
    `Contraseña temporal (un solo uso): ${tempPassword || '—'}`,
    `Clave de activación: ${licenseKey || '—'}`,
    'La contraseña es de un solo uso; cambiala una vez ingresado al sistema.'
  ].filter(Boolean)
  return lines.join('\n')
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function sendProvisioningEmail(payload) {
  const apiKey = getOptionalEnv('RESEND_API_KEY')
  if (!apiKey) return { sent: false, skipped: true, reason: 'RESEND_API_KEY no configurado' }

  const toEmail = String(payload?.toEmail || '').trim().toLowerCase()
  if (!toEmail) return { sent: false, skipped: true, reason: 'sin email destino' }

  const fromEmail = getOptionalEnv('MAIL_FROM_EMAIL') || 'soporteshangotech@gmail.com'
  const fromName = getOptionalEnv('MAIL_FROM_NAME') || 'Nexo Commerce'
  const demoUrl = String(payload?.demoUrl || '').trim()
  const deliveryMessage = String(payload?.deliveryMessage || '').trim()
  const logoUrl = getOptionalEnv('MAIL_LOGO_URL')
  const html = `
  <div style="background:#0b2a59;padding:24px;font-family:Arial,sans-serif">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px">
      <div style="text-align:center;margin-bottom:16px">
        ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Nexo Commerce" style="max-height:64px;margin-bottom:8px" />` : ''}
        <h1 style="margin:0;color:#111827;font-size:28px">Nexo Commerce</h1>
        <p style="margin:6px 0 0;color:#4b5563">Acceso a tu demo</p>
      </div>
      <p style="color:#111827">Hola, te compartimos los datos para ingresar.</p>
      ${demoUrl ? `<p style="margin:10px 0"><strong>Link:</strong> <a href="${escapeHtml(demoUrl)}">${escapeHtml(demoUrl)}</a></p>` : ''}
      <pre style="white-space:pre-wrap;background:#f3f4f6;padding:12px;border-radius:8px;color:#111827">${escapeHtml(deliveryMessage)}</pre>
      <p style="color:#374151;margin-top:14px">Si tenés dudas, respondé a este correo.</p>
    </div>
  </div>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [toEmail],
      subject: 'Nexo Commerce - Datos de acceso',
      html,
      text: deliveryMessage
    })
  })
  if (!res.ok) {
    const body = await parseJsonOrText(res)
    const msg = body?.message || body?.error || `HTTP ${res.status}`
    throw new Error(`No se pudo enviar email: ${msg}`)
  }
  const data = await res.json().catch(() => ({}))
  return { sent: true, id: data?.id || null }
}

function normalizeEmail(s) {
  return String(s || '').trim().toLowerCase()
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const DEMO_FEATURES = {
  ventas: true,
  cotizaciones: true,
  productos: true,
  stock: true,
  proveedores: true,
  caja: true,
  reportes: true,
  usuarios: true,
  backup: true,
  configuracion: true
}

async function provisionDemoTenant(supabaseUrl, serviceKey, anonKey, params) {
  const {
    actorEmail,
    clientEmail,
    businessName,
    role,
    demoDays,
    createLicense,
    passwordOverride,
    source,
    demoUrl
  } = params
  const email = normalizeEmail(clientEmail)
  const nombre = String(businessName || '').trim() || email

  let user = await findAuthUserByEmail(supabaseUrl, serviceKey, email)
  let generatedPassword = null
  let userCreated = false
  let passwordForClient = null
  if (!user) {
    const pwdAttempt = String(passwordOverride || '').trim() || randomPassword()
    try {
      user = await createAuthUser(supabaseUrl, serviceKey, email, pwdAttempt)
      userCreated = true
      generatedPassword = pwdAttempt
      passwordForClient = pwdAttempt
    } catch (e) {
      if (!isDuplicateAuthUserError(e)) throw e
      const pwdGrant = String(passwordOverride || '').trim()
      if (!pwdGrant) {
        throw new Error(
          'Ese email ya está registrado en Auth y no se pudo usar el listado de usuarios admin. Indicá la contraseña de esa cuenta en «Contraseña temporal» para vincularla, o gestioná el usuario en Supabase → Authentication.'
        )
      }
      user = await fetchAuthUserWithPasswordGrant(supabaseUrl, anonKey, email, pwdGrant)
      if (!user?.id) {
        throw new Error(
          'El email ya está en Auth; la contraseña indicada no permite iniciar sesión (revisá la clave o restablecela en Supabase).'
        )
      }
      userCreated = false
      generatedPassword = null
      passwordForClient = pwdGrant
    }
  } else {
    const sameAsActor = normalizeEmail(actorEmail) === email
    if (!sameAsActor) {
      const forcedTemp = String(passwordOverride || '').trim() || randomPassword()
      await updateAuthUserPassword(supabaseUrl, serviceKey, user.id, forcedTemp)
      passwordForClient = forcedTemp
    }
  }

  const commerceId = generateCommerceId()
  await postgrestInsert(supabaseUrl, serviceKey, 'commerces', {
    id: commerceId,
    nombre,
    activo: true,
    plan: 'free'
  })
  await postgrestInsert(supabaseUrl, serviceKey, 'user_commerces', {
    user_id: user.id,
    commerce_id: commerceId,
    role,
    activo: true
  })

  let licenseKey = null
  if (createLicense) {
    const due = new Date()
    due.setDate(due.getDate() + demoDays)
    licenseKey = generateLicenseKey()
    const notasPrefix = source === 'manual' ? 'Alta manual demo' : 'Alta desde solicitud demo'
    const notesParts = [`${notasPrefix} por ${actorEmail} (${email})`]
    if (passwordForClient) notesParts.push(`Usuario: ${email}. Contraseña temporal: ${passwordForClient}.`)
    if (licenseKey) notesParts.push(`Clave demo: ${licenseKey}.`)
    const deliveryMessage = buildDeliveryMessage(email, passwordForClient, licenseKey, demoUrl)
    await postgrestInsert(supabaseUrl, serviceKey, 'licencias', {
      cliente_nombre: nombre,
      clave: licenseKey,
      vence_en: due.toISOString().slice(0, 10),
      grace_days: 15,
      notas: notesParts.join(' '),
      demo_contact_email: email,
      temp_password: passwordForClient || null,
      delivery_message: deliveryMessage,
      activo: true,
      es_demo: true,
      commerce_id: commerceId,
      features: { ...DEMO_FEATURES }
    })
  }

  return {
    email,
    userId: user.id,
    userCreated,
    generatedPassword: userCreated ? generatedPassword : null,
    passwordForClient,
    commerce_id: commerceId,
    role,
    licenseKey
  }
}

async function insertManualDemoAuditRow(supabaseUrl, serviceKey, payload) {
  const { contactEmail, businessName, commerceId, licenseKey, actorEmail, passwordForClient, demoUrl } = payload
  const name = String(businessName || '').trim() || String(contactEmail || '').split('@')[0] || '—'
  const biz = String(businessName || '').trim() || name
  const parts = ['Alta manual desde panel.']
  if (passwordForClient) {
    parts.push(
      `Contraseña temporal (un solo uso; el cliente debe cambiarla al entrar): ${passwordForClient}.`
    )
  }
  if (licenseKey) parts.push(`Clave demo: ${licenseKey}.`)
  parts.push(`Admin: ${actorEmail}.`)
  const deliveryMessage = buildDeliveryMessage(contactEmail, passwordForClient, licenseKey, demoUrl)
  await postgrestInsert(supabaseUrl, serviceKey, 'demo_onboarding_requests', {
    contact_email: contactEmail,
    contact_name: name,
    business_name: biz,
    contact_phone: '',
    notes: parts.join(' '),
    status: 'provisioned',
    commerce_id: commerceId,
    source: 'manual',
    provisioned_at: new Date().toISOString(),
    temp_password: passwordForClient || null,
    activation_key: licenseKey || null,
    delivery_message: deliveryMessage
  })
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') return json(res, 204, {})
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Usar POST' })

    const supabaseUrl = getEnv('SUPABASE_URL').replace(/\/$/, '')
    const anonKey = getEnv('SUPABASE_ANON_KEY')
    const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
    const demoUrl = getOptionalEnv('PUBLIC_DEMO_URL') || getOptionalEnv('VITE_PUBLIC_DEMO_URL')
    const body = await parseBody(req)

    const v = await verifyCaller(req, supabaseUrl, anonKey)
    if (!v.ok) return json(res, v.status, { ok: false, error: v.error })

    const op = String(body?.op || '')
    const role = String(body?.membershipRole || 'owner').toLowerCase() === 'admin' ? 'admin' : 'owner'
    const demoDays = Math.max(1, Math.min(90, Number(body?.demoDays) || 10))
    const createLicense = body?.createLicense !== false
    const passwordOverride = body?.password

    if (op === 'provision_manual') {
      const email = normalizeEmail(body?.email)
      if (!email) return json(res, 400, { ok: false, error: 'Falta email' })
      if (!isValidEmail(email)) return json(res, 400, { ok: false, error: 'Email inválido' })
      if (email === normalizeEmail(v.email)) {
        return json(res, 400, {
          ok: false,
          error: 'No podés usar tu mismo email admin para un alta demo. Usá el email del cliente.'
        })
      }
      const businessName = String(body?.businessName || body?.commerceName || '').trim()
      if (!businessName) return json(res, 400, { ok: false, error: 'Falta nombre del comercio' })

      const data = await provisionDemoTenant(supabaseUrl, serviceKey, anonKey, {
        actorEmail: v.email,
        clientEmail: email,
        businessName,
        role,
        demoDays,
        createLicense,
        passwordOverride,
        source: 'manual',
        demoUrl
      })
      try {
        await insertManualDemoAuditRow(supabaseUrl, serviceKey, {
          contactEmail: email,
          businessName,
          commerceId: data.commerce_id,
          licenseKey: data.licenseKey,
          actorEmail: v.email,
          passwordForClient: data.passwordForClient || null,
          demoUrl
        })
      } catch {}
      let mail = { sent: false, skipped: true, reason: 'sin intento' }
      try {
        mail = await sendProvisioningEmail({
          toEmail: data.email,
          demoUrl,
          deliveryMessage: buildDeliveryMessage(data.email, data.passwordForClient, data.licenseKey, demoUrl)
        })
      } catch (mailErr) {
        mail = { sent: false, skipped: false, error: mailErr?.message || String(mailErr) }
      }
      return json(res, 200, { ok: true, data: { ...data, mail } })
    }

    if (op === 'delete_onboarding_full') {
      const requestId = String(body?.requestId || '').trim()
      const commerceId = String(body?.commerceId || '').trim()
      const activationKey = String(body?.activationKey || '').trim()
      await deleteDemoOnboardingAndLicense(supabaseUrl, serviceKey, {
        requestId,
        commerceId,
        activationKey,
        actorEmail: v.email
      })
      return json(res, 200, { ok: true, data: { requestId, commerceId, activationKey } })
    }

    if (op === 'delete_license_full') {
      const licenseId = String(body?.licenseId || '').trim()
      const commerceId = String(body?.commerceId || '').trim()
      const activationKey = String(body?.activationKey || '').trim()
      await deleteLicenseAndRelatedOnboarding(supabaseUrl, serviceKey, {
        licenseId,
        commerceId,
        activationKey,
        actorEmail: v.email
      })
      return json(res, 200, { ok: true, data: { licenseId, commerceId, activationKey } })
    }

    if (op !== 'provision_demo_request') {
      return json(res, 400, { ok: false, error: `Operación no permitida: ${op || '(vacía)'}` })
    }

    const requestId = String(body?.requestId || '').trim()
    if (!requestId) return json(res, 400, { ok: false, error: 'Falta requestId' })

    const request = await getDemoRequest(supabaseUrl, serviceKey, requestId)
    if (!request) return json(res, 404, { ok: false, error: 'Solicitud demo no encontrada' })
    if (request.status !== 'pending') {
      return json(res, 409, { ok: false, error: `La solicitud ya fue procesada (${request.status})` })
    }

    const email = String(request.contact_email || '').trim().toLowerCase()
    if (!email) return json(res, 400, { ok: false, error: 'La solicitud no tiene email válido' })

    const businessName =
      String(request.business_name || '').trim() || String(request.contact_name || '').trim() || email

    const data = await provisionDemoTenant(supabaseUrl, serviceKey, anonKey, {
      actorEmail: v.email,
      clientEmail: email,
      businessName,
      role,
      demoDays,
      createLicense,
      passwordOverride,
      source: 'request',
      demoUrl
    })

    await postgrestPatch(
      supabaseUrl,
      serviceKey,
      'demo_onboarding_requests',
      `id=eq.${encodeURIComponent(requestId)}`,
      {
        status: 'provisioned',
        commerce_id: data.commerce_id,
        provisioned_at: new Date().toISOString(),
        temp_password: data.passwordForClient || null,
        activation_key: data.licenseKey || null,
        delivery_message: buildDeliveryMessage(email, data.passwordForClient, data.licenseKey, demoUrl)
      }
    )

    let mail = { sent: false, skipped: true, reason: 'sin intento' }
    try {
      mail = await sendProvisioningEmail({
        toEmail: email,
        demoUrl,
        deliveryMessage: buildDeliveryMessage(email, data.passwordForClient, data.licenseKey, demoUrl)
      })
    } catch (mailErr) {
      mail = { sent: false, skipped: false, error: mailErr?.message || String(mailErr) }
    }

    return json(res, 200, {
      ok: true,
      data: {
        requestId,
        ...data,
        mail
      }
    })
  } catch (e) {
    return json(res, 500, { ok: false, error: e?.message || String(e) })
  }
}

