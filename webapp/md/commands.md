# Commands
from here https://forums.playdeadlock.com/threads/dead-air-how-to-make-a-config-useful-commands-simple-guide.15718/


### Solo streets mode with cheats
```
map dl_streets;
sv_cheats 1;
citadel_hero_testing_enabled true;
selecthero hero_inferno;
citadel_allow_purchasing_anywhere true;
citadel_hero_testing_infinite_money true;
```
This combination of commands loads you into the map with cheats enabled, allowing you to explore freely and buy whatever items you wish from anywhere.


### Cheats
```
sv_cheats 1;
```
Or 0 for cheats off.


### Change region
```
citadel_region_override
```
You can change your server region in Deadlock. Use (-1) for automatic, (0) for NA, (1) for EU, (2) for Asia, (3) for SA, and (5) for Oceania.

#### enable/disable hud
```
citadel_hud_visible
```


### Crosshair
```
citadel_crosshair_pip_gap
```
This command lets you adjust the gap the crosshair. Allows for negative values which is impossible to do in the settings.


### Sensitivity
```
sensitivity "0.99";
zoom_sensitivity_ratio "0.818933027098955175";
```
Let's you customize your sensitivity with more precision than the settings menu allows for. The provided zoom sensitivity ration will give you a 1:1 ratio between normal and zoomed modes. 


### Movement
```
alias +duckjump "+duck;+in_mantle";
alias -duckjump "-duck;-in_mantle";
bind space +duckjump;
bind mwheeldown "+in_mantle";
```
Binds mouse wheel down to jump and allows you to use space for mantle only. This leads to no accidental stamina used for double jump


### FPS
```
fps_max 240;
fps_max_tools 120;
fps_max_ui 120;
engine_low_latency_sleep_after_client_tick "true";
```

### Nvidia Low Latency
```
r_low_latency 2
```


### Shorcuts
```
alias "d" "disconnect"
```
Auto types commands with one letter.

```
alias "q" "quit"
```
```
alias "s" "status"
```
```
alias "rs" "mp_restartgame 1"
```

### Voice toggle
```
bind "J" toggle voice_modenable true false
```
Toggles voice chat on or off.


### Rate
```
rate 196608 
```
Chose between 62500 - 1000000 depending on internet bandwidth. Don't exceed 80% of your internet bandwidth.


### Recording settings
```
bind "J" toggle citadel_hud_visible true false
```
Turns hud on / off.

```
bind "J" toggle cl_lock_camera true false
```
Locks camera.

```
bind "J" toggle cl_showpos 1 0
```
Shows hero position and velocity.

```
bind "J" toggle citadel_hide_replay_hud true false
```
Turns replay hud on / off (Currently disabled after last patch)

```
bind "J" toggle host_timescale 1 0.2
```
Toggles the speed of the game for cinematics.

```
bind "J" "incrementvar citadel_observer_roaming_speed 600 2400 300"```
Cycle through various speeds of the spectator camera.

```
bind "J" cl_ent_actornames 1 0
```
Displays unit IDs.


### build version & HUD
```
r_show_build_info 0
cl_hud_telemetry_ping_show 0
cl_hud_telemetry_net_misdelivery_show 0
cl_hud_telemetry_frametime_show 0
citadel_display_new_player_recommendations false
citadel_playtest_warning_count 2
```


### Tooltips
```
gameinstructor_enable false
citadel_hint_system_disable true
```


### Testing Tools
```
bind "X" toggle citadel_hero_testing_enabled true false 
```
Allows use of sandbox testing tools anywhere.

```
bind "X" noclip
```
Toggles noclip.

```
bind "X" toggle hud_damagemeter 1 0
```
Turns dps meter on / off.

```
citadel_hero_testing_enabled 1;
citadel_crate_respawn_interval 0;
citadel_allow_duplicate_heroes 1;
```

```
citadel_allow_purchasing_anywhere 1
```
Allows buying items anywhere.


### Spawn Items
```
bind "X" ent_create citadel_item_pickup
```
Spawn soul urn.

```
bind "X" ent_create citadel_item_pickup_rejuv
```
Spawn rejuvenator.


### Spawn NPCs

```
bind "X" npc_create neutral_trooper_weak
```
Jungle Camp T1.

```
bind "X" npc_create neutral_trooper_strong
```
Jungle Camp T2.

```
bind "X" npc_create neutral_trooper_normal
```
Jungle Camp T3.

```
bind "X" npc_create npc_super_neutral
```
Mid boss.

```
bind "X" toggle citadel_solo_bot_match 1 0
```

```
bind "X" citadel_create_unit hero_haze
```
Enemy hero.
