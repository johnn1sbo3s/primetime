import { DateTime } from 'luxon'
import { SP_TZ } from './timezone'

// app/utils/scanner.js
// Helpers da tela Scanner — dados do snapshot do momentum-scanner
// (scanner.jonebet.xyz/live.json). Funções puras, testáveis.

// Notificação "recente" = a mais recente do histórico dentro da janela (min).
export function isRecentNotification(notifications, now = Date.now(), windowMin = 5) {
  const latest = notifications?.[0]
  if (!latest?.at) return false
  const at = Date.parse(latest.at)
  if (Number.isNaN(at)) return false
  return now - at <= windowMin * 60_000
}

// "atualizado há 0:12" / "há 1:20" a partir de generated_at (ISO), no
// formato mm:ss — leitura imediata de quanto tempo passou desde o snapshot.
export function formatUpdatedAgo(generatedAt, now = Date.now()) {
  if (!generatedAt) return ''
  const at = Date.parse(generatedAt)
  if (Number.isNaN(at)) return ''
  const seconds = Math.max(0, Math.floor((now - at) / 1000))
  const minutes = Math.floor(seconds / 60)
  return `há ${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

const HISTORY_KEY = 'scanner.notifications.v1'

// Une o histórico do backend (autoritativo) com o cache local (sobrevive a
// restart do scanner): dedupe por regra+horário, mais recente primeiro, máx 10.
export function mergeHistories(backend = [], local = []) {
  const seen = new Set()
  const merged = []
  for (const n of [...backend, ...local]) {
    const key = `${n.rule}|${n.at}`
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(n)
    }
  }
  return merged.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 10)
}

export function loadLocalHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveLocalHistory(byGame) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(byGame))
  } catch {
    // storage indisponível — segue sem cache local
  }
}

// Poda do cache local: só jogos visíveis agora (ao vivo + janela "Encerrado").
// O histórico de um jogo só é exibido enquanto o card existe na tela; ids de
// jogo não reaparecem — o resto seria dado invisível acumulando sem limite.
export function pruneLocalHistory(games = []) {
  const visible = {}
  for (const g of games) visible[g.id] = g.notifications || []
  return visible
}

// "há 3 min" / "há 1 h 15" a partir do ISO do disparo — sem segundos
// (segundos tickando em cada item é ruído; granularidade de minuto basta).
export function formatAlertAgo(at, now = Date.now()) {
  if (!at) return ''
  const t = Date.parse(at)
  if (Number.isNaN(t)) return ''
  const mins = Math.max(0, Math.floor((now - t) / 60_000))
  if (mins < 60) return `há ${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `há ${h} h` : `há ${h} h ${m}`
}

const ENTRY_TAGS = { entrada_ltd: 'LTD', entrada_gol_ht: 'GHT', entrada_fim_jogo: 'GFJ' }

// Sigla do tipo de entrada — sem emoji (decisão do mock A/C).
export function entryTag(rule) {
  return ENTRY_TAGS[rule] || 'ALR'
}

// Título curto por regra p/ a linha 1 do item do painel; regra desconhecida
// cai no texto do backend sem o prefixo de sigla (mesmo fallback do badge).
const ENTRY_TITLES = { entrada_ltd: 'LTD', entrada_gol_ht: 'Gol HT', entrada_fim_jogo: 'Gol fim de jogo' }
export function entryTitle(rule, label) {
  return ENTRY_TITLES[rule] || entryText(label)
}

// "LTD — entrada contra o empate" → "entrada contra o empate"
// (a sigla já aparece no badge; repetir é ruído). Só remove prefixo curto
// de sigla ("XXX — "); travessão no meio do texto é preservado.
export function entryText(label) {
  if (!label) return ''
  return label.replace(/^[^—]{1,12}—\s*/, '')
}

// Tempo da linha 1 do item: "agora" (<1min) / "há X min" (≤10min), senão
// HH:MM — item velho mostra o horário real, não idade tickando.
export function formatAlertTime(at, now = Date.now()) {
  if (!at) return ''
  const t = Date.parse(at)
  if (Number.isNaN(t)) return ''
  const mins = Math.floor((now - t) / 60_000)
  if (mins < 1) return 'agora'
  if (mins <= 10) return `há ${mins} min`
  return formatClockTime(at)
}

// "Vistos" do painel: epoch ms da última abertura em
// dataPlay.scanner.alertsSeenAt; badge = itens com at maior (estrito).
const SEEN_KEY = 'dataPlay.scanner.alertsSeenAt'
export function loadAlertsSeenAt(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(SEEN_KEY)
    const ts = Number(raw)
    return raw != null && Number.isFinite(ts) ? ts : 0
  } catch {
    return 0
  }
}
export function saveAlertsSeenAt(ts = Date.now(), storage = globalThis.localStorage) {
  try {
    storage.setItem(SEEN_KEY, String(ts))
  } catch {
    // storage indisponível — badge segue sem persistir
  }
}
export function countUnseen(items = [], seenAt = 0) {
  return items.filter((n) => (Date.parse(n?.at) || 0) > seenAt).length
}

// Horário real HH:MM pt-BR — mesma fonte do verso do card (não duplicar;
// scannerCard.vue mantém a sua local por estar fora do escopo).
export function formatClockTime(at) {
  if (!at) return ''
  const t = Date.parse(at)
  if (Number.isNaN(t)) return ''
  return new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// Sufixo de tempo: 2 → ' 2ºT', 1 → ' 1ºT', ausente/outro → '' (sem chute).
export function halfSuffix(half) {
  return half === 2 ? ' 2ºT' : half === 1 ? ' 1ºT' : ''
}

const DAY_KEY = 'scanner.entries-day.v1'

function todaySP(now = Date.now()) {
  return DateTime.fromMillis(now).setZone(SP_TZ).toFormat('yyyy-MM-dd')
}

// Histórico do dia: { date: 'yyyy-MM-dd', byGame: { [id]: [entry] } }.
// Chave separada do cache do card — jogo que sai do snapshot não pode
// levar o histórico junto, mas finalizado some daqui (decisão ticket 2).
export function loadDayEntries() {
  const fresh = { date: todaySP(), byGame: {} }
  try {
    const raw = localStorage.getItem(DAY_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    // Data trocada (ontem) nunca volta verbatim — senão o painel pisca
    // alertas de ontem até o primeiro snapshot do dia.
    if (parsed && typeof parsed === 'object' && parsed.byGame) {
      return parsed.date === fresh.date ? parsed : fresh
    }
  } catch {
    // storage corrompido: começa vazio
  }
  return fresh
}

export function saveDayEntries(state) {
  try {
    localStorage.setItem(DAY_KEY, JSON.stringify(state))
  } catch {
    // storage indisponível — segue sem histórico persistido
  }
}

// Anexa entradas dos jogos vivos (com metadados p/ exibir mesmo se o jogo
// sair do snapshot), remove finalizados, zera na virada do dia (SP).
export function mergeDayEntries(stored, games = [], now = Date.now()) {
  const today = todaySP(now)
  if (!stored || stored.date !== today) stored = { date: today, byGame: {} }
  const byGame = { ...stored.byGame }
  // Varredura de sumidos: id fora do snapshot sem flag finished (evicção do
  // cap, fim de janela) não volta — remove. Só com snapshot (vazio = ainda
  // carregando, não apaga nada).
  if (games.length > 0) {
    const alive = new Set(games.map((g) => g.id))
    for (const id of Object.keys(byGame)) {
      if (!alive.has(id)) delete byGame[id]
    }
  }
  for (const g of games) {
    if (g.finished) {
      delete byGame[g.id]
      continue
    }
    const seen = new Set((byGame[g.id] || []).map((n) => `${n.rule}|${n.at}`))
    const next = [...(byGame[g.id] || [])]
    for (const n of g.notifications || []) {
      if (n.kind !== 'entrada' && !String(n.rule || '').startsWith('entrada_')) continue
      const key = `${n.rule}|${n.at}`
      if (seen.has(key)) continue
      seen.add(key)
      next.push({ ...n, gameId: g.id, home: g.home, away: g.away, league: g.league })
    }
    if (next.length) byGame[g.id] = next.slice(-25)
    else if (byGame[g.id]) delete byGame[g.id]
  }
  return { date: today, byGame }
}
// Diff de alertas novos p/ o ticket 3: entradas de jogos vivos ausentes no
// guardado anterior (chave rule|at). O applySnapshot joga o resultado no ref
// newEntries, que painel e notificação consomem.
export function findNewEntries(prevByGame = {}, games = []) {
  const seen = new Set()
  for (const list of Object.values(prevByGame)) {
    for (const n of list || []) seen.add(`${n.rule}|${n.at}`)
  }
  const added = []
  for (const g of games) {
    if (g.finished) continue
    for (const n of g.notifications || []) {
      if (n.kind !== 'entrada' && !String(n.rule || '').startsWith('entrada_')) continue
      const key = `${n.rule}|${n.at}`
      if (seen.has(key)) continue
      seen.add(key)
      added.push({ ...n, gameId: g.id, home: g.home, away: g.away, league: g.league })
    }
  }
  return added
}

// Som de alerta novo: opt-in desligado por default. Presets são ids de
// oscilador WebAudio (ver alertSound.js) — sem arquivos de áudio.
export const SOUND_PRESETS = [
  { id: 'ping', label: 'Ping' },
  { id: 'pop', label: 'Pop' },
  { id: 'chime', label: 'Chime' },
]
const SOUND_KEY = 'dataPlay.scanner.alertsSound'
const PRESET_KEY = 'dataPlay.scanner.alertSoundPreset'

export function loadSoundEnabled(storage = globalThis.localStorage) {
  try {
    return storage.getItem(SOUND_KEY) === '1'
  } catch {
    return false
  }
}
export function saveSoundEnabled(on, storage = globalThis.localStorage) {
  try {
    storage.setItem(SOUND_KEY, on ? '1' : '0')
  } catch {
    // storage indisponível — segue sem persistir
  }
}
export function loadSoundPreset(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(PRESET_KEY)
    return SOUND_PRESETS.some((p) => p.id === raw) ? raw : 'ping'
  } catch {
    return 'ping'
  }
}
export function saveSoundPreset(id, storage = globalThis.localStorage) {
  try {
    storage.setItem(PRESET_KEY, id)
  } catch {
    // storage indisponível — segue sem persistir
  }
}
