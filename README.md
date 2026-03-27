# [shaumik-ashraf.github.io](https://shaumik-ashraf.github.io/)

[![Deploy Next.js site to Pages](https://github.com/Shaumik-Ashraf/shaumik-ashraf.github.io/actions/workflows/deploy.yml/badge.svg)](https://github.com/Shaumik-Ashraf/shaumik-ashraf.github.io/actions/workflows/deploy.yml)

A fun little web app showcasing some websites I like. Built with NextJS and Claude Code.

## Dependencies

- [NodeJS](https://nodejs.org) v24.9.0 (may work with other versions)

## Quick Start

1. `npm ci`
2. `npm start`

## Commands

| command                  | purpose                                      |
|:-------------------------|:---------------------------------------------|
| `npm run dev`            | Launch server in dev mode with auto-restarts |
| `npm run build`          | Compile SPA app into `out/` folder           |
| `npm run lint`           | Run ESLint                                   |

## Documentation

- [NextJS 16](https://nextjs.org) **This app uses Pages mode**
- [React-Bootstrap](https://react-bootstrap.github.io/)
- [Bootstrap 5](https://getbootstrap.com/)
- [ReactJS 19](https://react.dev/)
- [Matter.JS](https://www.brm.io/matter-js/)

### Hacking

Much of the game is configurable in top-level constants in [game_engine.js](./components/game_engine.js), although it is messy as a consequence of using a web development framework instead of game development framework. 

## Credits

© Shaumik Ashraf 2026

Sprites created by [Pixelsnorf](https://pixelsnorf.itch.io/platformer-slimes) and [SciGho](https://ninjikin.itch.io/starter-tiles).

Music created by [Raydee99](https://raydee99.com).

## License

See [LICENSE](./LICENSE).

## Contributing

Feel free to post issues or [pull requests](https://opensource.guide/how-to-contribute/#opening-a-pull-request). I would also love to see anyone fork this project and take it further. 

### Future Ideas

- Select your slime avatar in settings
- Light/dark themes
- A game feature where crouching adds utility, i.e: dodging projectiles or crawling under something
- A game feature where the slime attacking sprite could be used, i.e: mobs or destructible terrain
- A score or achievement system, based on the amount of portals from data.json visited
- Improved portal mechanics
  + Some versioning feature for the set of possible portals, i.e: data.json
  + Captions or previews
  + Portal sprite variations to reflect rarer portals
