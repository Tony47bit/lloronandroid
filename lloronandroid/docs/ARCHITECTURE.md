# Lágrimas — arquitectura y guía de ampliación

Todo el contenido del juego se **registra** en un `Registry`; el motor no conoce
ningún objeto, enemigo, jefe o personaje concreto. Para añadir contenido:
crea un archivo en la carpeta que toque y añade **una línea** a `js/manifest.js`.

```
js/
  manifest.js  loader.js          lista de módulos + carga secuencial
  core/        util (Registry), constants, stats (StatSheet), geometry, draw
  items/       registry.js (inventario, hooks, activos, sinergias)
               sprites/ (74 sprites originales)  defs/ (objetos y sinergias)
  systems/     tears (proyectiles y comportamientos), weapons, familiars
  content/     obstacles, pickups, enemies, bosses, characters, rooms
  game/        floor (generador), engine (estado + L.api), input, render, main
```

| Registro | Qué es | Archivo de ejemplo |
|---|---|---|
| `L.Items` / `L.Synergies` | objetos y transformaciones | `items/defs/*.js` |
| `L.Obstacles` | rocas, **fosos**, cacas… | `content/obstacles.js` |
| `L.Pickups` | corazones, monedas, cofres, pedestales | `content/pickups.js` |
| `L.Enemies` | enemigos normales | `content/enemies.js` |
| `L.Bosses` | **jefes específicos** | `content/bosses.js` |
| `L.Characters` | **personajes** | `content/characters.js` |
| `L.RoomTypes` | tipos de sala y colocación | `content/rooms.js` |
| `L.Weapons` | modos de disparo | `systems/weapons.js` |
| `L.TearBehaviors` | efectos de lágrima | `systems/tears.js` |
| `L.Projectiles` | tipos de proyectil | `systems/tears.js` |
| `L.FamiliarBehaviors` | IA de familiares | `systems/familiars.js` |

## Añadir un objeto
```js
L.defineItem({
  id: 'mi_objeto', name: 'Mi Objeto', desc: 'Hace algo',
  type: 'passive',                  // 'passive' | 'active' | 'familiar'
  tags: ['stats'], pools: ['treasure','shop'], weight: 1,
  config: { dmg: 1 },               // valores ajustables
  stats: (c, stacks) => ({ damage: { add: c.dmg } }),   // se retiran solos al quitarlo
  tear:  [{ b: 'homing', turn: 4 }],                    // comportamientos de lágrima
  weapon:{ id: 'brimstone', priority: 50 },             // modo de disparo
  flags: ['flying'],
  hooks: { onAdd, onRemove, onUpdate, onFire, onPlayerDamaged, onPlayerDeath,
           onRevive, onRoomEnter, onRoomClear, onEnemyKilled, onBombExplode,
           onFloorStart, onPickup, onDrawPlayer },
});
```
* **Activo**: `type:'active'`, `config.charges` = salas a limpiar para recargar, `active:{ use(ctx) }` (devuelve `false` para no gastar la carga).
* **Familiar**: `type:'familiar'`, `familiar:{ behavior:'orbit'|'shooter'|…, …parámetros }`.
* El sprite va en `items/sprites/` con `L.Sprites.define('mi_objeto', (c,g)=>{…})` (64×64, origen en el centro).
* Balance sin tocar la definición: `L.ItemConfig.override('mi_objeto', { dmg: 2 })`.
* Vidas extra: `state.lives` + `onPlayerDeath` con `info.revive = true`.
* Sinergia: `L.defineSynergy({ id, requires:[ids] | tag:'x', min:3 | when(p), stats, flags, hooks })`.

## Añadir un foso nuevo / terreno
```js
L.Obstacles.register({ id:'lava', weight:1, minFloor:3, size:[36,36],
  blocksGround:true, blocksFlying:false, blocksTears:false, hp:Infinity, bombable:false,
  draw(c, ob){ … } });
```
Las reglas (quién lo cruza: volar / saltar con *Cómo Saltar*) las aplica el motor según estos flags.

## Añadir un jefe
```js
L.Bosses.register({ id:'mi_jefe', name:'MI JEFE', weight:2, minFloor:2, r:32,
  hp:(f)=>50+15*f, speed:()=>40,
  init(e){…}, update(e, api, dt){ api.enemyTear(…); api.spawnEnemy('fly',…) }, draw(c,e,g){…} });
```
Cada piso sortea el jefe entre los que cumplen `minFloor/maxFloor`, ponderado por `weight`.

## Añadir un personaje
```js
L.Characters.register({ id:'x', name:'X', desc:'…', color:'#fff',
  stats:{ speed:170, maxHp:4 }, soul:2, bombs:1, items:['sad_onion'], active:'the_d6' });
```
Aparece solo en el selector del menú.

## Otros
* **Enemigo**: `L.Enemies.register({ id, weight, minFloor, group, r, fly, hp(f), speed(f), init, update, draw })`.
* **Pickup**: `L.Pickups.register({ id, r, drop:{weight}, collect(api,p,pk,room), draw })`.
* **Tipo de sala**: `L.RoomTypes.register({ id, order, place:'leaf'|'leaf_far'|'leaf_or_any'|'hidden'|fn, locked, hidden, cleared, populate })`.
* **Arma / comportamiento de lágrima / familiar**: ver los contratos al inicio de `weapons.js`, `tears.js`, `familiars.js`.

## Reglas de diseño
* Los objetos solo hablan con `L.Inventory` y `L.api` (fachada del motor); el jugador no conoce ningún objeto.
* Todo efecto de estadística lleva una *fuente* (`item:<id>`, `syn:<id>`, temporal de sala), así que **retirar = quitar la fuente**.
* Unidades de vida: **medios corazones** (1 corazón = 2). Los corazones de alma absorben primero.
* Pruebas automáticas: `scripts/` no incluye navegador; las usadas en desarrollo recorren los 74 objetos (alta/baja, activos, familiares), las 6 armas, daño/vidas/transformación Guppy y 320 pisos generados.
