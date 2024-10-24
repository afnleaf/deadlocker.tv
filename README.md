# weblock
repo for deadlock web apps

# Deadlocker.tv

## About
Resources for deadlock players
Embed twitch stream into main webpage

Live | Resources | Map | Charts | Commands | __________ == 

### Tactical Map
A map for teams to draw up strategies on.
Features:
- [x] Draw Function, different colours, thickness
- [x] Eraser/Clear
- [x] Hero icons that can be moved around, amber/sapphire
- [x] Undo
- [x] Keybinds for buttons
- [x] Icon drag and drop in
- [ ] multi icon move?
- [ ] add text
- [ ] Redo
- [ ] Lines?
- [ ] SVG Layers, base map, camps, objectives, names of areas
- [ ] Save map and reload
- [ ] Private rooms where teams can draw together

### Farm graph
[ducklock.duckdns.org](ducklock.duckdns.org)

You can embed this chart into your website with an iframe.

```
<iframe 
    src="https://ducklock.duckdns.org/"
    width="600" 
    height="600" 
    frameborder="2" 
    allowfullscreen 
    title="Embedded Content">
</iframe>
```


### Commands
A bunch of useful commands to use in the dev console.

### Camps
Explain what the names of the camps are

## Technical

### Dependencies

```
go install github.com/a-h/templ/cmd/templ@latest
go get github.com/a-h/templ
templ generate
go mod tidy
```
