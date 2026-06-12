# Plan: mostrar resultados de CBAT en "Horario de competición" (ATH)

**Estado:** parcialmente implementado (2026-06-12). Ver "Estado de implementación" al final.

**Objetivo:** que la sección de horario de competición de ATH muestre, por prueba, las
**marcas y posiciones** que manda CBAT — incluyendo marcas **en vivo** mientras la prueba está
en curso, no solo al consolidar.

> **Alcance explícito:** esto muestra **resultados finales y marcas parciales en vivo**
> (marca + posición por atleta). **NO** incluye *Tempos Intermediários* (parciales por km de
> marcha): esos no están en el SQL que la integración consume y son técnicamente inviables —
> ver `ath-microservice/docs/tempos-intermediarios-no-disponibles.md`.

---

## Hallazgo clave: la data ya está disponible, no hace falta backend

El front habla directo al microservicio ATH (`/api/ath`). El endpoint que ya se usa para la
start-list, **`getStartListDetails(prova, hora, etapa)`** → `GET /start-list-details`
(vista CBAT `Consulta_Resultados`), **ya devuelve por competidor** todo lo necesario:

| Campo (`AthStartListEntry`) | Origen CBAT | Uso para resultados |
|-----------------------------|-------------|---------------------|
| `RkPo` | `Posição` | posición / ranking |
| `FinalResult` | `Marca` | marca final (ej. `1:55.53.29`) |
| `BestMark` | `MelhorMarca` | mejor marca (campo, combinadas) |
| `CompetitorName`, `Club`, `Lane`, `Serie` | — | etiquetas |

→ **"Resultado" = la misma fila de start-list cuando la marca ya está cargada.** No se necesita
endpoint nuevo ni tocar GRS/Mongo. Ya existe el helper de dominio
`startListResult(e)` (`src/lib/domain/ath-start-list.ts`) que resuelve `FinalResult` || `BestMark`.

Hoy `ScheduleList.tsx` solo enciende un **badge** "resultados" cuando `HasResult==='S'`, pero
nunca pinta las marcas.

---

## Dónde encaja

Inline por prueba, dentro de `ScheduleItem` en
[`src/features/ath/ScheduleList.tsx`](../src/features/ath/ScheduleList.tsx) — al lado del
desplegable de start-list que ya existe (mismo patrón `showStartList` + query React Query).

```
ScheduleItem
 ├─ hora + nombre + badges (en curso / lista / resultados)
 ├─ [Enviar a GRS] [Ver start list] [Ver resultados]   ← botón nuevo
 ├─ StartList        (si showStartList)
 └─ ResultsDisplay   (si showResults)                   ← componente nuevo
```

Patrón visual de referencia: judo
[`src/features/judo/ResultadosCard.tsx`](../src/features/judo/ResultadosCard.tsx) (podio
🥇🥈🥉 + posición/nombre/delegación).

---

## Comportamiento (gating: finales + en vivo)

Decisión tomada: mostrar **finales y también marcas en vivo**.

- Botón "Ver resultados" visible cuando `yes(s.HasResult)` **o** `yes(s.Andamento)`
  (en curso). Así se ve algo durante la prueba aunque CBAT no haya cerrado el flag `HasResult`
  (que en la práctica tarda — confirmado en el evento real).
- Si `Andamento==='S'` y `HasResult!=='S'` → encabezar como **"En curso"** (marcas provisionales).
- Si `HasResult==='S'` → **"Resultados oficiales"**.
- Mostrar solo competidores con marca (`startListResult(e) != null`); ordenar:
  - por `RkPo` ascendente cuando hay posiciones (`RkPo > 0`),
  - si todas las posiciones son 0 (aún sin clasificar), por marca/tiempo o dejar el orden de
    serie/raia, sin inventar ranking.
- Top-3 con medalla solo cuando hay posiciones reales (`RkPo` 1/2/3).
- **Relevos:** reusar `groupRelayTeams(entries)` y mostrar el resultado del equipo
  (`team.result`), no atleta por atleta.

---

## Componentes / archivos

1. **`src/features/ath/ScheduleList.tsx`** (modificar `ScheduleItem`, ~línea 159-203):
   - Nuevo estado `showResults`.
   - Nueva query (reusa el endpoint existente):
     ```ts
     const results = useQuery({
       queryKey: ["ath", "results", s.TestId, s.Time, s.StageId],
       queryFn: () => getStartListDetails(s.TestId, s.Time, s.StageId),
       enabled: showResults && (yes(s.HasResult) || yes(s.Andamento)),
     });
     ```
     *(Nota: misma queryKey-base que la start-list; mantenerlas separadas o compartir caché si
     conviene — la respuesta es idéntica, solo cambia cómo se presenta.)*
   - Botón "Ver resultados" en el bloque de acciones (junto a "Ver start list").
   - Render condicional de `<ResultsDisplay entries={...} live={yes(s.Andamento) && !yes(s.HasResult)} />`.

2. **`src/features/ath/ResultsDisplay.tsx`** (nuevo):
   - Recibe `entries: AthStartListEntry[]` + flag `live`.
   - Filtra con `startListResult`, ordena por `RkPo`, detecta relevo con `isRelay`/`groupRelayTeams`.
   - Render lista ordenada: `posición · nombre · club · marca` (+ medalla top-3).
   - Encabezado "En curso" / "Resultados oficiales" según `live`.

3. **(Opcional) `src/lib/domain/ath-start-list.ts`**: helper `rankEntries(entries)` que encapsule
   el filtrado + orden por `RkPo` (mantener la lógica de presentación fuera del componente).

No se toca: API, stores, ni el backend. Reusa `getStartListDetails` y los helpers de dominio.

---

## Prueba

Contra el ATH local (`http://localhost:3005/api/ath`) con la **Prova 577** (Meia Maratona Marcha
21km Feminino), que ya tuvo marcas reales (`352 Thaliane = 1:55.53.29`, `167`, `355`). Verificar:
1. Con marcas y `Andamento='S'` → se ven como "En curso".
2. Sin marcas → no aparece el bloque (o aparece vacío con mensaje).
3. Relevo → muestra resultado por equipo.

---

## Reaç (tiempo de reacción) y Ptos — modelado y render

CBAT muestra por atleta, además de la marca: **Reaç** (tiempo de reacción de salida, ej.
`0.199`) y **Ptos** (puntos, en combinadas). Hoy **no los guardamos** porque el query de
start-list ni siquiera selecciona la reacción. El valor real vive en la columna **`TR`** de
`Consulta_Resultados` (`TempoReação` es solo un flag `S/N`, no el valor).

### Principio: copiar el patrón del viento

La reacción se modela **igual que el viento**: un **decorador del participante**
(`participant.decorator[]`), que es lo que GRS ya persiste sin tocar nada y lo que el resultado
lleva dentro de su estructura (el "period"). Flujo actual del viento (a replicar):

```
CBAT [Vento] as Wind
  → record.Wind
    → atleta.wind            (syncService ~L1117)
      → decorator WIND_INDIVIDUAL   (syncService ~L1303-1308, solo pista)
        → GRS lo persiste tal cual  (result.mapper.ts L254 copia participant.decorator)
          → WRS lo lee y lo pinta
```

### Captura única (sirve a los dos consumidores)

Un solo cambio alimenta tanto a grs-integration como a WRS:

1. **ath** `cbat.repository.ts` → `getStartListDetails` (SELECT ~L199): añadir
   `[TR] as ReactionTime`. (`[Pontos] as Points` **ya** se selecciona — L200.)
2. **ath** `CbatAthleteRecord` (interfaz del repo): añadir `ReactionTime?: string`.
3. **ath** `syncService.ts` ~L38-53 (tipo del atleta) + ~L1116-1118 (armado del objeto):
   añadir `reactionTime: string | null` y `reactionTime: atleta.ReactionTime ?? null`.

### Render — dos superficies, misma fuente

**A) grs-integration (horario inline, este plan):**
- `src/api/ath/index.ts` → `AthStartListEntry`: añadir `ReactionTime: string` (y exponer
  `Points` si no está).
- En `ResultsDisplay` / `StartList`: mostrar columna **Reaç** cuando el valor no esté vacío
  (en lanzamientos/saltos/fondo va vacío → no se pinta). `Ptos` solo en combinadas.

**B) WRS (nuxt-wrs scoreboard), vía sync a GRS:**
- **ath** `syncService.ts` ~L1308 (junto a `WIND_INDIVIDUAL`): si es pista y hay valor,
  `decorator.push({ type:'REACTION_TIME', code:'REACTION_TIME', value: rt, order: ... })`.
- **GRS**: **sin cambios** — `result.mapper.ts` (L254) y `ath.dt-result.service.ts` (L290-323)
  copian los decoradores de participante genéricamente. ✅
- **WRS**: leer el decorador `REACTION_TIME` del participante y renderizar la columna. Es el
  **único trabajo de display nuevo** en esta rama (mismo punto donde hoy se lee/pinta el viento;
  si WRS ya muestra viento, es trivial).

> Nota de diseño: se guarda como **decorador del participante**, no como entrada en `periods[]`
> (que para pista va vacío). Es el camino ya probado (viento) que GRS persiste y WRS sabe leer.

### Séries → splits (desglose por heat)

CBAT corre algunos eventos en **varias séries** (ej. Decatlón 100m = 2 séries). Cada série se
modela como un **`split`** (`SplitResultModel`: `splitId`, `name`="Série N", `order`=nº de serie,
con sus `participants[]`). **N splits = N séries** según lleguen.

**Por qué splits y no periods:** el Decatlón 100m **ya terminó**, así que la vista relevante es la
de **resultados finales**, cuyo agregado consume **`splits`** — y tiene un pipeline dedicado de
display, `buildSplitPipeline` (`scoreboard/aggregations/results/results.aggregate.ts` L1318): hace
`$unwind` de `$splits`, filtra opcional por `splits.name` y proyecta `splitName` / `splitOrder` /
`participants` / `groups`. Es un desglose por nombre, **distinto** de la lógica competitiva
`splitsWon` (que es para enfrentamientos 1v1). Los `periods` los consumen los agregados **live**
(`live.aggregate.ts`, `live-multi-unit.aggregate.ts`) — útil en vivo, pero no es la vista de un
evento ya cerrado.

> El `athleticsMapper` ya tipa `splits` con `{ splitId, name, order, participants[] }` (mientras
> `periods: any[]` queda genérico) — confirma que splits es el vehículo "con forma" para esto.

**Pieza nueva para el Decatlón 100m (y pista multi-série):** hoy el builder manda `splits: []`.
Agrupar los competidores de la unit por `Série` y construir un `split` por serie
(`name`="Série N", `order`=serie, `participants[]` con su marca + decorador `REACTION_TIME`).
`globalResult.participants` sigue llevando el **ranking consolidado** (todos por tiempo across
séries); los splits solo guardan en qué heat corrió cada quien. Las marcas/Reaç viven en los
`participants[].decorator[]` de cada split (mismo decorador que en globalResult).

> Nota: el precedente **FBT** (Final por Tempo) usa hoy `periods`
> (`buildPeriodsFromFbtSibling`, syncService L442) para sus séries → se ven en la vista live. No
> tocar esa rama; este trabajo es para que el **desglose en resultados finales** salga vía splits.
> (A futuro se podría unificar para que multi-série llene ambos: splits para resultados + periods
> para live.)

### Orden de trabajo sugerido

1. Captura en ATH (Reaç: pasos 1-3) — desbloquea ambas superficies.
2. grs-integration: campo + render (rápido, sin backend extra).
3. Decorador `REACTION_TIME` en syncService + render en WRS (cierra la rama scoreboard).
4. Séries → splits: agrupar la unit por `Série` y poblar `splits[]` con un split por serie;
   verificar render vía `buildSplitPipeline` en la vista de resultados.

Probar con la **Prova 577**… (marcha, sin Reaç) y con el **Decatlón 100m**
(`ATHMDEC100M-SUB23-----DEC-0001----`, que sí tiene `TR` reales: Pedro `0.199`, Luiz `0.175`…).

---

## Estado de implementación (2026-06-12)

**Hecho y verificado en vivo:**
- **ATH** captura `Reaç`/`Ptos`: `cbat.repository.ts` (`[TR] as ReactionTime` + interfaz),
  `syncService.ts` (campo `reactionTime` en `Atleta` + mapeo). Verificado vía
  `GET /api/ath/start-list-details` para el Decatlón 100m (prova 1, 09:20, etapa 1): devuelve
  `ReactionTime` real en las 9 filas (Pedro `0.199`, Luiz `0.175`, …) + `FinalResult` + `Points`.
- **grs-integration** muestra resultados inline en horario: `ResultsDisplay.tsx` nuevo + botón
  "Ver resultados" en `ScheduleItem` (gating `HasResult='S'` || `Andamento='S'`), Reaç/Ptos en
  `StartList.tsx`, helpers `reactionTime`/`pointsText`. Typecheck OK (`tsc --noEmit`).
- **Decorador `REACT`** en `syncService.ts` (junto a `WIND_INDIVIDUAL`, solo pista). Code `REACT`
  elegido para coincidir con la convención que **WRS ya rotula** (`table.ATH.REACT`).

**Hecho, no confirmado en vivo (bloqueado por infra, no por el cambio):**
- WRS renderiza `REACT` **automáticamente**: GRS mapea decorator→extension por `code`
  (`result-utils.ts` `extensions: p.decorator.map(...)`), y `getAllExtensionsAsColumns` usa un
  **blocklist** (no allowlist) → `REACT` no está bloqueado → sale como columna "Reacción". **Cero
  cambios en GRS y WRS.** No se confirmó end-to-end porque las escrituras del sync a GRS estaban
  con **timeout de 30s** (GRS saturado por el loop de 60s), no por el código nuevo.

**NO implementado — séries → splits (bloqueado por el modelo actual):**
- Al revisar el código, **cada série ya se crea como su propia unit** (`createUnitSegment(serie)`
  → `0001`, `0002`; `buildCombinedSubData` usa `buildUnits`). O sea, las séries del Decatlón 100m
  ya son units hermanas, **no** subconjuntos de una unit. Meterlas como `splits` de UNA unit
  requeriría **consolidarlas** (como hace FBT con `buildPeriodsFromFbtSibling`) — un cambio más
  grande y con riesgo de romper el flujo per-série existente. **Decisión pendiente:** dejar las
  séries como units separadas (comportamiento actual) o hacer la consolidación. No se tocó.

**Pendiente de UI:** nada nuevo en WRS (auto-render). Confirmar visualmente cuando GRS acepte las
escrituras (resolver el timeout del sync / correr el sync sin el loop competiendo).

**Nada commiteado.** Cambios en working tree de `ath-microservice` y `grs-integration`.

## Fuera de alcance (recordatorio)

- **Tempos Intermediários** (parciales por km): no integrables. Ver doc citado arriba.
- Podio/medallero agregado a nivel evento (como la pestaña de judo): posible mejora futura, pero
  este plan es **inline por prueba en el horario**, que es lo pedido.
