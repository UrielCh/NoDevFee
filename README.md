# NodDevFee

Since all Ethernium miner are close source, you can not thrust them.

The script is an Ethernium proxy that can redirect mining wallet destination.

Objectif:

- try to use Sindre Sorhus's ecosystem.
- use ESM modules + typescript

postmorthem:

- I did not include `del-cli` from Sindre Sorhus, this lib had 97 dependences (777 files), including *rimraf* !!! WTF, rimraf is perfect for the job and having "only" 12 dependences (62 files).
- I realy tried but the way Sindre Sorhus represent a security flow, if basic feature a overbundeled with masive junk, on day a Log4j like security flow will hit Sindre Sorhus's ecosystem.

morality: avoid Sindre Sorhus's code, all his project depend on a huge quantity of othe projets, It's impossible to check all that mess.
